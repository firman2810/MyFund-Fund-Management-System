package com.firman.myfund;

import com.firman.myfund.ledger.DemoSeed;
import com.firman.myfund.ledger.LedgerException;
import com.firman.myfund.ledger.LedgerException.Kind;
import com.firman.myfund.ledger.LedgerGateway;
import com.firman.myfund.model.Allocation;
import com.firman.myfund.model.Distribution;
import com.firman.myfund.model.LedgerRecord;
import com.firman.myfund.model.Role;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * In-memory stand-in for Fabric in tests, applying the same rules as FundContract. Starts with the demo seed;
 * {@link #reset()} restores it. Returns copies, so callers can't change ledger state by editing a record.
 */
@Component
@Profile("test")
public class FakeLedgerGateway implements LedgerGateway {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final JsonMapper json;
    private final Map<String, Allocation> allocations = new LinkedHashMap<>();
    private final Map<String, Distribution> distributions = new LinkedHashMap<>();
    private long block;

    /** Simulates the Fabric network being down: every call fails as it would against a stopped network. */
    public volatile boolean unavailable;

    public FakeLedgerGateway(JsonMapper json) {
        this.json = json;
        reset();
    }

    /** Back to the demo seed. */
    public synchronized void reset() {
        clear();
        DemoSeed.submit(this, json, Set.of(), a -> { }, d -> { });
    }

    /** An empty ledger, like a chain after network.sh reset. */
    public synchronized void clear() {
        unavailable = false;
        allocations.clear();
        distributions.clear();
        block = 0;
    }

    @Override
    public synchronized Allocation createAllocation(Role caller, Allocation draft) {
        down();
        if (caller != Role.MINISTRY) throw LedgerException.fromContract(Kind.FORBIDDEN, "");
        if (draft.getAmount().signum() <= 0) throw LedgerException.fromContract(Kind.INVALID, "amount must be greater than zero");
        if (allocations.containsKey(draft.getId())) throw LedgerException.fromContract(Kind.DUPLICATE, "");
        Allocation a = copy(draft);
        a.setDistributedAmount(BigDecimal.ZERO.setScale(2));
        a.setLedger(record(LedgerGateway.ALLOCATION_POLICY));
        allocations.put(a.getId(), a);
        return copy(a);
    }

    @Override
    public synchronized DistributionCommit createDistribution(Role caller, Distribution draft) {
        down();
        if (caller != Role.AGENCY) throw LedgerException.fromContract(Kind.FORBIDDEN, "");
        if (draft.getAmount().signum() <= 0) throw LedgerException.fromContract(Kind.INVALID, "amount must be greater than zero");
        if (distributions.containsKey(draft.getId())) throw LedgerException.fromContract(Kind.DUPLICATE, "");
        Allocation a = allocations.get(draft.getAllocationId());
        if (a == null) throw LedgerException.fromContract(Kind.NOT_FOUND, "");
        if (!a.getReceivingAgency().equals(draft.getAgencyName())) throw LedgerException.fromContract(Kind.WRONG_AGENCY, "");
        if (draft.getAmount().compareTo(a.getRemainingAmount()) > 0) throw LedgerException.overspend(a.getRemainingAmount());

        Distribution d = copy(draft);
        d.setProgrammeName(a.getProgramme());
        d.setLedger(record(LedgerGateway.DISTRIBUTION_POLICY));
        a.setDistributedAmount(a.getDistributedAmount().add(d.getAmount()));
        distributions.put(d.getId(), d);
        return new DistributionCommit(copy(d), copy(a));
    }

    @Override
    public synchronized List<Allocation> allocations() {
        down();
        return allocations.values().stream().map(FakeLedgerGateway::copy).toList();
    }

    @Override
    public synchronized List<Distribution> distributions() {
        down();
        return distributions.values().stream().map(FakeLedgerGateway::copy).toList();
    }

    private void down() {
        if (unavailable) throw LedgerException.unavailable(null);
    }

    private LedgerRecord record(String policy) {
        byte[] tx = new byte[32];
        RANDOM.nextBytes(tx);
        return new LedgerRecord(NETWORK, "myfund-channel", CHAINCODE_LABEL, ++block, HexFormat.of().formatHex(tx),
                COMMITTED, policy, Instant.now().truncatedTo(ChronoUnit.MICROS), "sha256:" + "0".repeat(64));
    }

    private static Allocation copy(Allocation s) {
        Allocation a = new Allocation();
        a.setId(s.getId());
        a.setProgramme(s.getProgramme());
        a.setReceivingAgency(s.getReceivingAgency());
        a.setAmount(s.getAmount());
        a.setDistributedAmount(s.getDistributedAmount());
        a.setDescription(s.getDescription());
        a.setSupportingInfo(s.getSupportingInfo());
        a.setReferenceNo(s.getReferenceNo());
        a.setAllocatedBy(s.getAllocatedBy());
        a.setAllocatedAt(s.getAllocatedAt());
        a.setLedger(s.getLedger());
        return a;
    }

    private static Distribution copy(Distribution s) {
        Distribution d = new Distribution();
        d.setId(s.getId());
        d.setAllocationId(s.getAllocationId());
        d.setProgrammeName(s.getProgrammeName());
        d.setAgencyName(s.getAgencyName());
        d.setBeneficiaryName(s.getBeneficiaryName());
        d.setBeneficiaryId(s.getBeneficiaryId());
        d.setAmount(s.getAmount());
        d.setDescription(s.getDescription());
        d.setDistributedAt(s.getDistributedAt());
        d.setLedger(s.getLedger());
        return d;
    }
}
