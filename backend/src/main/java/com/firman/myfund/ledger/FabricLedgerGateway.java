package com.firman.myfund.ledger;

import com.firman.myfund.ledger.LedgerException.Kind;
import com.firman.myfund.model.Allocation;
import com.firman.myfund.model.Distribution;
import com.firman.myfund.model.LedgerRecord;
import com.firman.myfund.model.Role;
import com.google.protobuf.InvalidProtocolBufferException;
import io.grpc.Grpc;
import io.grpc.ManagedChannel;
import io.grpc.TlsChannelCredentials;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.hyperledger.fabric.client.Gateway;
import org.hyperledger.fabric.client.GatewayException;
import org.hyperledger.fabric.client.Network;
import org.hyperledger.fabric.client.Status;
import org.hyperledger.fabric.client.SubmittedTransaction;
import org.hyperledger.fabric.client.identity.Identities;
import org.hyperledger.fabric.client.identity.Signers;
import org.hyperledger.fabric.client.identity.X509Identity;
import org.hyperledger.fabric.protos.common.Block;
import org.hyperledger.fabric.protos.peer.TxValidationCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.Reader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * {@link LedgerGateway} on the live Fabric network via the Fabric Gateway SDK. Holds one signing identity per org
 * (cryptogen's User1) and connects each to that org's peer. Writes sign as the caller's org and wait for commit;
 * reads try each org's peer in turn, so one stopped peer doesn't block reads.
 */
@Slf4j
@Component
@Profile("!test")
public class FabricLedgerGateway implements LedgerGateway {

    private static final Pattern CONTRACT_ERROR =
            Pattern.compile("\\b(NOT_FOUND|OVERSPEND|WRONG_AGENCY|FORBIDDEN|DUPLICATE|INVALID): ([^\\n\"]*)");
    private static final String[] ALLOCATION_ENDORSERS = {"MinistryMSP", "AuditorMSP"};
    private static final String[] DISTRIBUTION_ENDORSERS = {"AgencyMSP", "AuditorMSP"};

    private record Org(String msp, String domain) {
    }

    private static final Map<Role, Org> ORGS = new EnumMap<>(Map.of(
            Role.MINISTRY, new Org("MinistryMSP", "ministry.myfund.local"),
            Role.AGENCY, new Org("AgencyMSP", "agency.myfund.local"),
            Role.AUDITOR, new Org("AuditorMSP", "auditor.myfund.local")));

    private final JsonMapper json;
    private final String channelName;
    private final String chaincode;
    private final Map<Role, ManagedChannel> channels = new EnumMap<>(Role.class);
    private final Map<Role, Gateway> gateways = new EnumMap<>(Role.class);
    /** A transaction's block number never changes, so each is looked up (qscc) at most once. */
    private final Map<String, Long> blockByTx = new ConcurrentHashMap<>();

    public FabricLedgerGateway(JsonMapper json,
                               @Value("${fabric.crypto-path}") String cryptoPath,
                               @Value("${fabric.channel}") String channelName,
                               @Value("${fabric.chaincode}") String chaincode,
                               @Value("${fabric.endpoint.ministry}") String ministryPeer,
                               @Value("${fabric.endpoint.agency}") String agencyPeer,
                               @Value("${fabric.endpoint.auditor}") String auditorPeer) {
        this.json = json;
        this.channelName = channelName;
        this.chaincode = chaincode;
        Map<Role, String> endpoints = Map.of(Role.MINISTRY, ministryPeer, Role.AGENCY, agencyPeer,
                Role.AUDITOR, auditorPeer);
        ORGS.forEach((role, org) -> connect(role, org, Path.of(cryptoPath), endpoints.get(role)));
    }

    // gRPC channels connect lazily, so this only reads the crypto files; ChainSeeder makes the first real call.
    private void connect(Role role, Org org, Path cryptoPath, String endpoint) {
        Path orgDir = cryptoPath.resolve("peerOrganizations").resolve(org.domain());
        Path msp = orgDir.resolve("users/User1@" + org.domain() + "/msp");
        try (Reader cert = Files.newBufferedReader(onlyFile(msp.resolve("signcerts")));
             Reader key = Files.newBufferedReader(onlyFile(msp.resolve("keystore")))) {
            ManagedChannel channel = Grpc.newChannelBuilder(endpoint, TlsChannelCredentials.newBuilder()
                    .trustManager(orgDir.resolve("peers/peer0." + org.domain() + "/tls/ca.crt").toFile())
                    .build()).build();
            channels.put(role, channel);
            gateways.put(role, Gateway.newInstance()
                    .identity(new X509Identity(org.msp(), Identities.readX509Certificate(cert)))
                    .signer(Signers.newPrivateKeySigner(Identities.readPrivateKey(key)))
                    .connection(channel)
                    .evaluateOptions(o -> o.withDeadlineAfter(5, TimeUnit.SECONDS))
                    .endorseOptions(o -> o.withDeadlineAfter(15, TimeUnit.SECONDS))
                    .submitOptions(o -> o.withDeadlineAfter(5, TimeUnit.SECONDS))
                    .commitStatusOptions(o -> o.withDeadlineAfter(1, TimeUnit.MINUTES))
                    .connect());
        } catch (IOException | GeneralSecurityException e) {
            throw new IllegalStateException("Fabric crypto material for " + org.msp() + " not found or unreadable under "
                    + cryptoPath.toAbsolutePath() + ". Start the network with smart-contract/network.sh up "
                    + "(in WSL), or set fabric.crypto-path.", e);
        }
    }

    private static Path onlyFile(Path dir) throws IOException {
        try (Stream<Path> files = Files.list(dir)) {
            return files.findFirst().orElseThrow(() -> new IOException("empty directory " + dir));
        }
    }

    @PreDestroy
    void close() {
        gateways.values().forEach(Gateway::close);
        channels.values().forEach(ManagedChannel::shutdownNow);
    }

    // ---- writes ----

    @Override
    public Allocation createAllocation(Role caller, Allocation d) {
        String result = submit(caller, "CreateAllocation", ALLOCATION_ENDORSERS, d.getId(), d.getProgramme(),
                d.getReceivingAgency(), sen(d.getAmount()), d.getDescription(), d.getSupportingInfo(),
                d.getReferenceNo(), d.getAllocatedBy(), d.getAllocatedAt().toString());
        JsonNode a = json.readTree(result);
        return toAllocation(a, channelName, blockNumber(a.get("txId").asString()));
    }

    @Override
    public DistributionCommit createDistribution(Role caller, Distribution d) {
        String result = submit(caller, "CreateDistribution", DISTRIBUTION_ENDORSERS, d.getId(), d.getAllocationId(),
                d.getAgencyName(), d.getBeneficiaryName(), d.getBeneficiaryId(), sen(d.getAmount()),
                d.getDescription(), d.getDistributedAt().toString());
        JsonNode both = json.readTree(result);
        JsonNode dist = both.get("distribution");
        JsonNode alloc = both.get("allocation");
        return new DistributionCommit(toDistribution(dist, channelName, blockNumber(dist.get("txId").asString())),
                toAllocation(alloc, channelName, blockNumber(alloc.get("txId").asString())));
    }

    /** Endorses on the given orgs' peers, orders, and waits for commit. An MVCC conflict is retried once. */
    private String submit(Role caller, String function, String[] endorsers, String... args) {
        var contract = gateways.get(caller).getNetwork(channelName).getContract(chaincode);
        for (int attempt = 1; ; attempt++) {
            try {
                SubmittedTransaction tx = contract.newProposal(function).addArguments(args)
                        .setEndorsingOrganizations(endorsers).build().endorse().submitAsync();
                Status status = tx.getStatus();
                if (status.isSuccessful()) {
                    blockByTx.put(status.getTransactionId(), status.getBlockNumber());
                    return new String(tx.getResult(), StandardCharsets.UTF_8);
                }
                if (status.getCode() != TxValidationCode.MVCC_READ_CONFLICT) {
                    log.error("{} {} was not committed: {}", function, args[0], status.getCode());
                    throw LedgerException.unavailable(null);
                }
                if (attempt == 2) throw LedgerException.fromContract(Kind.CONFLICT, "");
                log.warn("{} {} hit an MVCC read conflict; retrying once", function, args[0]);
            } catch (GatewayException e) {
                throw translate(e);
            }
        }
    }

    // ---- reads ----

    @Override
    public List<Allocation> allocations() {
        List<Allocation> out = new ArrayList<>();
        for (JsonNode n : json.readTree(evaluate(c -> c.getContract(chaincode).evaluateTransaction("GetAllAllocations")))) {
            out.add(toAllocation(n, channelName, blockNumber(n.get("txId").asString())));
        }
        return out;
    }

    @Override
    public List<Distribution> distributions() {
        List<Distribution> out = new ArrayList<>();
        for (JsonNode n : json.readTree(evaluate(c -> c.getContract(chaincode).evaluateTransaction("GetAllDistributions")))) {
            out.add(toDistribution(n, channelName, blockNumber(n.get("txId").asString())));
        }
        return out;
    }

    private long blockNumber(String txId) {
        Long cached = blockByTx.get(txId);
        if (cached != null) return cached;
        byte[] block = evaluateBytes(c -> c.getContract("qscc").evaluateTransaction("GetBlockByTxID", channelName, txId));
        try {
            long number = Block.parseFrom(block).getHeader().getNumber();
            blockByTx.put(txId, number);
            return number;
        } catch (InvalidProtocolBufferException e) {
            throw new IllegalStateException("Unreadable block for transaction " + txId, e);
        }
    }

    private interface Call {
        byte[] on(Network network) throws GatewayException;
    }

    /** Evaluates on each org's peer in turn until one answers; contract errors are not retried. */
    private String evaluate(Call call) {
        return new String(evaluateBytes(call), StandardCharsets.UTF_8);
    }

    private byte[] evaluateBytes(Call call) {
        LedgerException last = null;
        for (var entry : gateways.entrySet()) {
            try {
                return call.on(entry.getValue().getNetwork(channelName));
            } catch (GatewayException e) {
                last = translate(e);
                if (last.getKind() != Kind.UNAVAILABLE) throw last;
                log.warn("{} peer did not answer a read; trying the next org", entry.getKey());
            }
        }
        throw last;
    }

    // ---- mapping (package-private for FabricLedgerGatewayTest) ----

    private static LedgerException translate(GatewayException e) {
        String text = Stream.concat(Stream.of(e.getMessage()),
                        e.getDetails().stream().map(d -> d.getMspId() + " " + d.getMessage()))
                .collect(Collectors.joining(" | "));
        LedgerException contract = contractError(text);
        if (contract != null) return contract;
        log.warn("Fabric call failed: {}", text);
        return LedgerException.unavailable(e);
    }

    /** The contract's error, if {@code text} carries one of its codes; null otherwise. */
    static LedgerException contractError(String text) {
        Matcher m = CONTRACT_ERROR.matcher(text);
        return m.find() ? LedgerException.fromContract(Kind.valueOf(m.group(1)), m.group(2).trim()) : null;
    }

    static Allocation toAllocation(JsonNode n, String channel, long block) {
        Allocation a = new Allocation();
        a.setId(text(n, "id"));
        a.setProgramme(text(n, "programme"));
        a.setReceivingAgency(text(n, "receivingAgency"));
        a.setAmount(money(n, "amountSen"));
        a.setDistributedAmount(money(n, "distributedSen"));
        a.setDescription(text(n, "description"));
        a.setSupportingInfo(text(n, "supportingInfo"));
        a.setReferenceNo(text(n, "referenceNo"));
        a.setAllocatedBy(text(n, "allocatedBy"));
        a.setAllocatedAt(Instant.parse(text(n, "businessDate")));
        a.setLedger(ledger(n, channel, block, ALLOCATION_POLICY));
        return a;
    }

    static Distribution toDistribution(JsonNode n, String channel, long block) {
        Distribution d = new Distribution();
        d.setId(text(n, "id"));
        d.setAllocationId(text(n, "allocationId"));
        d.setProgrammeName(text(n, "programmeName"));
        d.setAgencyName(text(n, "agencyName"));
        d.setBeneficiaryName(text(n, "beneficiaryName"));
        d.setBeneficiaryId(text(n, "beneficiaryId"));
        d.setAmount(money(n, "amountSen"));
        d.setDescription(text(n, "description"));
        d.setDistributedAt(Instant.parse(text(n, "businessDate")));
        d.setLedger(ledger(n, channel, block, DISTRIBUTION_POLICY));
        return d;
    }

    private static LedgerRecord ledger(JsonNode n, String channel, long block, String policy) {
        // Postgres keeps microseconds, so the copy can hold this value exactly and verification compares equal.
        Instant committed = Instant.parse(text(n, "timestamp")).truncatedTo(ChronoUnit.MICROS);
        return new LedgerRecord(NETWORK, channel, CHAINCODE_LABEL, block, text(n, "txId"), COMMITTED, policy,
                committed, text(n, "payloadHash"));
    }

    private static String text(JsonNode n, String field) {
        return n.get(field).asString();
    }

    private static BigDecimal money(JsonNode n, String senField) {
        return BigDecimal.valueOf(n.get(senField).asLong(), 2);
    }

    /** Validation (@Digits fraction = 2) already rejects more than 2 decimals, so this is exact. */
    private static String sen(BigDecimal amount) {
        return Long.toString(amount.movePointRight(2).longValueExact());
    }
}
