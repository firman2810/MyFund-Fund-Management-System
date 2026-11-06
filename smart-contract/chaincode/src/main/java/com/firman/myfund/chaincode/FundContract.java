package com.firman.myfund.chaincode;

import org.hyperledger.fabric.contract.Context;
import org.hyperledger.fabric.contract.ContractInterface;
import org.hyperledger.fabric.contract.annotation.Contract;
import org.hyperledger.fabric.contract.annotation.Default;
import org.hyperledger.fabric.contract.annotation.Info;
import org.hyperledger.fabric.contract.annotation.Transaction;
import org.hyperledger.fabric.shim.ChaincodeException;
import org.hyperledger.fabric.shim.ChaincodeStub;
import org.hyperledger.fabric.shim.ledger.KeyValue;
import org.hyperledger.fabric.shim.ledger.QueryResultsIterator;
import org.json.JSONObject;
import org.json.JSONStringer;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.StringJoiner;

/**
 * MyFund fund contract. State keys: {@code ALC:<id>} and {@code DST:<id>}, values are JSON with a fixed field
 * order so every peer writes identical bytes. Money is whole sen. Errors start with a stable code
 * (NOT_FOUND, OVERSPEND, WRONG_AGENCY, FORBIDDEN, DUPLICATE, INVALID) that the backend maps to HTTP responses.
 */
@Contract(name = "fund_cc", info = @Info(title = "MyFund fund contract", version = "1.0"))
@Default
public final class FundContract implements ContractInterface {

    static final String MINISTRY = "MinistryMSP";
    static final String AGENCY = "AgencyMSP";
    static final String AUDITOR = "AuditorMSP";

    /** MSP of the peer running this contract instance; the function guards use it to pick endorsers. */
    private final String peerMsp;

    public FundContract() {
        this(System.getenv("CORE_PEER_LOCALMSPID"));
    }

    FundContract(String peerMsp) {
        this.peerMsp = peerMsp;
    }

    @Transaction(name = "CreateAllocation", intent = Transaction.TYPE.SUBMIT)
    public String createAllocation(Context ctx, String id, String programme, String receivingAgency, long amountSen,
                                   String description, String supportingInfo, String referenceNo,
                                   String allocatedBy, String businessDate) {
        guard(ctx, "CreateAllocation", MINISTRY);
        required("id", id);
        required("programme", programme);
        required("receivingAgency", receivingAgency);
        required("allocatedBy", allocatedBy);
        positive(amountSen);
        date(businessDate);
        ChaincodeStub stub = ctx.getStub();
        String key = "ALC:" + id;
        if (!stub.getStringState(key).isEmpty()) throw fail("DUPLICATE", "allocation " + id + " already exists");

        Allocation a = new Allocation(id, programme, receivingAgency, amountSen, 0L, nz(description),
                nz(supportingInfo), nz(referenceNo), allocatedBy, businessDate, null, null, null);
        a = a.committed(stub.getTxId(), stub.getTxTimestamp(), sha256(a.json(false)));
        String json = a.json(true);
        stub.putStringState(key, json);
        return json;
    }

    @Transaction(name = "CreateDistribution", intent = Transaction.TYPE.SUBMIT)
    public String createDistribution(Context ctx, String id, String allocationId, String agencyName,
                                     String beneficiaryName, String beneficiaryId, long amountSen,
                                     String description, String businessDate) {
        guard(ctx, "CreateDistribution", AGENCY);
        required("id", id);
        required("allocationId", allocationId);
        required("agencyName", agencyName);
        required("beneficiaryName", beneficiaryName);
        required("beneficiaryId", beneficiaryId);
        positive(amountSen);
        date(businessDate);
        ChaincodeStub stub = ctx.getStub();
        String key = "DST:" + id;
        if (!stub.getStringState(key).isEmpty()) throw fail("DUPLICATE", "distribution " + id + " already exists");
        String stored = stub.getStringState("ALC:" + allocationId);
        if (stored.isEmpty()) throw fail("NOT_FOUND", "allocation " + allocationId + " does not exist");
        Allocation a = Allocation.parse(stored);
        if (!a.receivingAgency().equals(agencyName)) {
            throw fail("WRONG_AGENCY", "allocation " + allocationId + " belongs to " + a.receivingAgency()
                    + ", not " + agencyName);
        }
        long remaining = a.amountSen() - a.distributedSen();
        if (amountSen > remaining) {
            throw fail("OVERSPEND", "amount " + amountSen + " sen exceeds remaining " + remaining + " sen");
        }

        Distribution d = new Distribution(id, allocationId, a.programme(), agencyName, beneficiaryName, beneficiaryId,
                amountSen, nz(description), businessDate, null, null, null);
        d = d.committed(stub.getTxId(), stub.getTxTimestamp(), sha256(d.json(false)));
        a = a.withDistributed(a.distributedSen() + amountSen);
        String dJson = d.json(true);
        String aJson = a.json(true);
        stub.putStringState(key, dJson);
        stub.putStringState("ALC:" + allocationId, aJson);
        return "{\"distribution\":" + dJson + ",\"allocation\":" + aJson + "}";
    }

    @Transaction(name = "GetAllAllocations", intent = Transaction.TYPE.EVALUATE)
    public String getAllAllocations(Context ctx) {
        return range(ctx.getStub(), "ALC:");
    }

    @Transaction(name = "GetAllDistributions", intent = Transaction.TYPE.EVALUATE)
    public String getAllDistributions(Context ctx) {
        return range(ctx.getStub(), "DST:");
    }

    // ---- guards and helpers ----

    /** The caller must be {@code callerMsp}; the endorsing peer must be the caller's org or the Auditor. */
    private void guard(Context ctx, String function, String callerMsp) {
        String caller = ctx.getClientIdentity().getMSPID();
        if (!callerMsp.equals(caller)) throw fail("FORBIDDEN", function + " is for " + callerMsp + ", not " + caller);
        if (!callerMsp.equals(peerMsp) && !AUDITOR.equals(peerMsp)) {
            throw fail("FORBIDDEN", "a " + peerMsp + " peer does not endorse " + function);
        }
    }

    private static void required(String field, String value) {
        if (value == null || value.isBlank()) throw fail("INVALID", field + " is required");
    }

    private static void positive(long amountSen) {
        if (amountSen <= 0) throw fail("INVALID", "amount must be greater than zero");
    }

    private static void date(String businessDate) {
        try {
            Instant.parse(businessDate);
        } catch (DateTimeParseException | NullPointerException e) {
            throw fail("INVALID", "businessDate must be an ISO-8601 instant");
        }
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    private static ChaincodeException fail(String code, String message) {
        return new ChaincodeException(code + ": " + message, code);
    }

    private static String range(ChaincodeStub stub, String prefix) {
        // ';' is the character after ':', so this covers exactly the keys starting with prefix.
        String end = prefix.substring(0, prefix.length() - 1) + ';';
        StringJoiner out = new StringJoiner(",", "[", "]");
        try (QueryResultsIterator<KeyValue> it = stub.getStateByRange(prefix, end)) {
            for (KeyValue kv : it) out.add(kv.getStringValue());
        } catch (ChaincodeException e) {
            throw e;
        } catch (Exception e) {
            throw new ChaincodeException("range query failed: " + e.getMessage());
        }
        return out.toString();
    }

    private static String sha256(String text) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
            return "sha256:" + HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Writes fields in insertion order: LinkedHashMap keeps the order fixed, JSONStringer escapes values. */
    private static String json(Map<String, Object> fields) {
        JSONStringer w = new JSONStringer();
        w.object();
        fields.forEach((k, v) -> w.key(k).value(v));
        return w.endObject().toString();
    }

    // ---- records ----

    /** payloadHash covers the record as created, without txId, timestamp or the hash itself. */
    record Allocation(String id, String programme, String receivingAgency, long amountSen, long distributedSen,
                      String description, String supportingInfo, String referenceNo, String allocatedBy,
                      String businessDate, String txId, String timestamp, String payloadHash) {

        Allocation committed(String tx, Instant at, String hash) {
            return new Allocation(id, programme, receivingAgency, amountSen, distributedSen, description,
                    supportingInfo, referenceNo, allocatedBy, businessDate, tx, at.toString(), hash);
        }

        Allocation withDistributed(long sen) {
            return new Allocation(id, programme, receivingAgency, amountSen, sen, description, supportingInfo,
                    referenceNo, allocatedBy, businessDate, txId, timestamp, payloadHash);
        }

        String json(boolean withLedger) {
            Map<String, Object> f = new LinkedHashMap<>();
            f.put("id", id);
            f.put("programme", programme);
            f.put("receivingAgency", receivingAgency);
            f.put("amountSen", amountSen);
            f.put("distributedSen", distributedSen);
            f.put("description", description);
            f.put("supportingInfo", supportingInfo);
            f.put("referenceNo", referenceNo);
            f.put("allocatedBy", allocatedBy);
            f.put("businessDate", businessDate);
            if (withLedger) {
                f.put("txId", txId);
                f.put("timestamp", timestamp);
                f.put("payloadHash", payloadHash);
            }
            return FundContract.json(f);
        }

        static Allocation parse(String s) {
            JSONObject o = new JSONObject(s);
            return new Allocation(o.getString("id"), o.getString("programme"), o.getString("receivingAgency"),
                    o.getLong("amountSen"), o.getLong("distributedSen"), o.getString("description"),
                    o.getString("supportingInfo"), o.getString("referenceNo"), o.getString("allocatedBy"),
                    o.getString("businessDate"), o.getString("txId"), o.getString("timestamp"),
                    o.getString("payloadHash"));
        }
    }

    record Distribution(String id, String allocationId, String programmeName, String agencyName,
                        String beneficiaryName, String beneficiaryId, long amountSen, String description,
                        String businessDate, String txId, String timestamp, String payloadHash) {

        Distribution committed(String tx, Instant at, String hash) {
            return new Distribution(id, allocationId, programmeName, agencyName, beneficiaryName, beneficiaryId,
                    amountSen, description, businessDate, tx, at.toString(), hash);
        }

        String json(boolean withLedger) {
            Map<String, Object> f = new LinkedHashMap<>();
            f.put("id", id);
            f.put("allocationId", allocationId);
            f.put("programmeName", programmeName);
            f.put("agencyName", agencyName);
            f.put("beneficiaryName", beneficiaryName);
            f.put("beneficiaryId", beneficiaryId);
            f.put("amountSen", amountSen);
            f.put("description", description);
            f.put("businessDate", businessDate);
            if (withLedger) {
                f.put("txId", txId);
                f.put("timestamp", timestamp);
                f.put("payloadHash", payloadHash);
            }
            return FundContract.json(f);
        }
    }
}
