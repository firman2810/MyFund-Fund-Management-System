package com.firman.myfund.chaincode;

import org.hyperledger.fabric.contract.ClientIdentity;
import org.hyperledger.fabric.contract.Context;
import org.hyperledger.fabric.shim.ChaincodeException;
import org.hyperledger.fabric.shim.ChaincodeStub;
import org.hyperledger.fabric.shim.ledger.KeyValue;
import org.hyperledger.fabric.shim.ledger.QueryResultsIterator;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;

import java.time.Instant;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FundContractTest {

    private static final String DATE = "2026-01-15T00:00:00Z";
    private static final Instant COMMIT = Instant.parse("2026-11-06T10:00:00Z");

    /** In-memory world state shared by every call, like one peer's ledger. */
    private final TreeMap<String, String> state = new TreeMap<>();
    private int txCounter;

    private Context ctx(String callerMsp) {
        ChaincodeStub stub = mock(ChaincodeStub.class);
        when(stub.getStringState(anyString())).thenAnswer(i -> state.getOrDefault(i.<String>getArgument(0), ""));
        doAnswer(i -> state.put(i.getArgument(0), i.getArgument(1))).when(stub).putStringState(anyString(), anyString());
        when(stub.getStateByRange(anyString(), anyString()))
                .thenAnswer(i -> iterator(state.subMap(i.<String>getArgument(0), i.<String>getArgument(1))));
        when(stub.getTxId()).thenReturn("tx" + (++txCounter));
        when(stub.getTxTimestamp()).thenReturn(COMMIT);
        ClientIdentity identity = mock(ClientIdentity.class);
        when(identity.getMSPID()).thenReturn(callerMsp);
        Context ctx = mock(Context.class);
        when(ctx.getStub()).thenReturn(stub);
        when(ctx.getClientIdentity()).thenReturn(identity);
        return ctx;
    }

    private static QueryResultsIterator<KeyValue> iterator(Map<String, String> entries) {
        List<KeyValue> kvs = entries.entrySet().stream().map(e -> {
            KeyValue kv = mock(KeyValue.class);
            when(kv.getKey()).thenReturn(e.getKey());
            when(kv.getStringValue()).thenReturn(e.getValue());
            return kv;
        }).toList();
        return new QueryResultsIterator<>() {
            public Iterator<KeyValue> iterator() { return kvs.iterator(); }
            public void close() { }
        };
    }

    private String allocate(FundContract c, String caller, String id, long sen) {
        return c.createAllocation(ctx(caller), id, "Flood Relief", "NADMA", sen,
                "desc", "info", "REF-1", "Ministry of Finance", DATE);
    }

    private String distribute(FundContract c, String caller, String id, String agency, long sen) {
        return c.createDistribution(ctx(caller), id, "ALC-1", agency, "Ali", "900101-01-1234", sen, "aid", DATE);
    }

    private static void assertRejected(String code, Executable call) {
        ChaincodeException e = assertThrows(ChaincodeException.class, call);
        assertTrue(e.getMessage().startsWith(code + ":"), e.getMessage());
    }

    private final FundContract ministryPeer = new FundContract("MinistryMSP");
    private final FundContract agencyPeer = new FundContract("AgencyMSP");
    private final FundContract auditorPeer = new FundContract("AuditorMSP");

    // ---- CreateAllocation ----

    @Test
    void allocationIsStoredWithTxFieldsAndZeroDistributed() {
        JSONObject a = new JSONObject(allocate(ministryPeer, "MinistryMSP", "ALC-1", 100_000_00L));
        assertEquals(100_000_00L, a.getLong("amountSen"));
        assertEquals(0L, a.getLong("distributedSen"));
        assertEquals("tx1", a.getString("txId"));
        assertEquals(COMMIT.toString(), a.getString("timestamp"));
        assertEquals(DATE, a.getString("businessDate"));
        assertTrue(a.getString("payloadHash").matches("sha256:[0-9a-f]{64}"));
        assertEquals(a.toString(), new JSONObject(state.get("ALC:ALC-1")).toString());
    }

    @Test
    void auditorPeerAlsoEndorsesAllocation() {
        allocate(auditorPeer, "MinistryMSP", "ALC-1", 1);
        assertTrue(state.containsKey("ALC:ALC-1"));
    }

    @Test
    void allocationRejectsWrongCaller() {
        assertRejected("FORBIDDEN", () -> allocate(ministryPeer, "AgencyMSP", "ALC-1", 1));
        assertRejected("FORBIDDEN", () -> allocate(ministryPeer, "AuditorMSP", "ALC-1", 1));
    }

    @Test
    void allocationRejectsWrongPeer() {
        assertRejected("FORBIDDEN", () -> allocate(agencyPeer, "MinistryMSP", "ALC-1", 1));
        assertRejected("FORBIDDEN", () -> allocate(new FundContract(null), "MinistryMSP", "ALC-1", 1));
    }

    @Test
    void allocationRejectsNonPositiveAmount() {
        assertRejected("INVALID", () -> allocate(ministryPeer, "MinistryMSP", "ALC-1", 0));
        assertRejected("INVALID", () -> allocate(ministryPeer, "MinistryMSP", "ALC-1", -5));
    }

    @Test
    void allocationRejectsBlankRequiredFieldAndBadDate() {
        assertRejected("INVALID", () -> allocate(ministryPeer, "MinistryMSP", " ", 1));
        assertRejected("INVALID", () -> ministryPeer.createAllocation(ctx("MinistryMSP"), "ALC-1", "P", "NADMA", 1,
                "", "", "", "MOF", "15/01/2026"));
    }

    @Test
    void allocationRejectsDuplicateId() {
        allocate(ministryPeer, "MinistryMSP", "ALC-1", 1);
        assertRejected("DUPLICATE", () -> allocate(ministryPeer, "MinistryMSP", "ALC-1", 1));
    }

    // ---- CreateDistribution ----

    @Test
    void distributionCopiesProgrammeAndRaisesDistributed() {
        allocate(ministryPeer, "MinistryMSP", "ALC-1", 1_000_00L);
        JSONObject result = new JSONObject(distribute(agencyPeer, "AgencyMSP", "DST-1", "NADMA", 250_50L));
        JSONObject d = result.getJSONObject("distribution");
        JSONObject a = result.getJSONObject("allocation");
        assertEquals("Flood Relief", d.getString("programmeName"));
        assertEquals(250_50L, d.getLong("amountSen"));
        assertEquals(250_50L, a.getLong("distributedSen"));
        assertEquals("tx1", a.getString("txId"), "allocation keeps its creation tx");
        assertEquals(250_50L, new JSONObject(state.get("ALC:ALC-1")).getLong("distributedSen"));
    }

    @Test
    void senArithmeticIsExactAcrossDistributions() {
        allocate(ministryPeer, "MinistryMSP", "ALC-1", 100L);
        distribute(agencyPeer, "AgencyMSP", "DST-1", "NADMA", 33L);
        distribute(auditorPeer, "AgencyMSP", "DST-2", "NADMA", 33L);
        distribute(agencyPeer, "AgencyMSP", "DST-3", "NADMA", 33L);
        assertEquals(99L, new JSONObject(state.get("ALC:ALC-1")).getLong("distributedSen"));
        assertRejected("OVERSPEND", () -> distribute(agencyPeer, "AgencyMSP", "DST-4", "NADMA", 2L));
        distribute(agencyPeer, "AgencyMSP", "DST-4", "NADMA", 1L);
        assertEquals(100L, new JSONObject(state.get("ALC:ALC-1")).getLong("distributedSen"));
    }

    @Test
    void distributionEqualToRemainingIsAllowed() {
        allocate(ministryPeer, "MinistryMSP", "ALC-1", 500L);
        distribute(agencyPeer, "AgencyMSP", "DST-1", "NADMA", 500L);
        assertEquals(500L, new JSONObject(state.get("ALC:ALC-1")).getLong("distributedSen"));
    }

    @Test
    void distributionAboveRemainingIsRejectedWithRemainingInMessage() {
        allocate(ministryPeer, "MinistryMSP", "ALC-1", 500L);
        distribute(agencyPeer, "AgencyMSP", "DST-1", "NADMA", 200L);
        ChaincodeException e = assertThrows(ChaincodeException.class,
                () -> distribute(agencyPeer, "AgencyMSP", "DST-2", "NADMA", 301L));
        assertTrue(e.getMessage().startsWith("OVERSPEND:"), e.getMessage());
        assertTrue(e.getMessage().contains("remaining 300 sen"), e.getMessage());
        assertTrue(!state.containsKey("DST:DST-2"));
    }

    @Test
    void distributionRejectsWrongCaller() {
        allocate(ministryPeer, "MinistryMSP", "ALC-1", 500L);
        assertRejected("FORBIDDEN", () -> distribute(agencyPeer, "MinistryMSP", "DST-1", "NADMA", 1L));
        assertRejected("FORBIDDEN", () -> distribute(agencyPeer, "AuditorMSP", "DST-1", "NADMA", 1L));
    }

    @Test
    void distributionRejectsWrongPeer() {
        allocate(ministryPeer, "MinistryMSP", "ALC-1", 500L);
        assertRejected("FORBIDDEN", () -> distribute(ministryPeer, "AgencyMSP", "DST-1", "NADMA", 1L));
    }

    @Test
    void distributionRejectsUnknownAllocation() {
        assertRejected("NOT_FOUND", () -> distribute(agencyPeer, "AgencyMSP", "DST-1", "NADMA", 1L));
    }

    @Test
    void distributionRejectsOtherAgencysAllocation() {
        allocate(ministryPeer, "MinistryMSP", "ALC-1", 500L);
        assertRejected("WRONG_AGENCY", () -> distribute(agencyPeer, "AgencyMSP", "DST-1", "KEMAS", 1L));
    }

    @Test
    void distributionRejectsNonPositiveAmount() {
        allocate(ministryPeer, "MinistryMSP", "ALC-1", 500L);
        assertRejected("INVALID", () -> distribute(agencyPeer, "AgencyMSP", "DST-1", "NADMA", 0L));
        assertRejected("INVALID", () -> distribute(agencyPeer, "AgencyMSP", "DST-1", "NADMA", -1L));
    }

    @Test
    void distributionRejectsDuplicateId() {
        allocate(ministryPeer, "MinistryMSP", "ALC-1", 500L);
        distribute(agencyPeer, "AgencyMSP", "DST-1", "NADMA", 1L);
        assertRejected("DUPLICATE", () -> distribute(agencyPeer, "AgencyMSP", "DST-1", "NADMA", 1L));
    }

    // ---- Reads and determinism ----

    @Test
    void readsReturnOnlyTheirRecordType() {
        allocate(ministryPeer, "MinistryMSP", "ALC-1", 500L);
        allocate(ministryPeer, "MinistryMSP", "ALC-2", 500L);
        distribute(agencyPeer, "AgencyMSP", "DST-1", "NADMA", 1L);
        JSONArray allocations = new JSONArray(auditorPeer.getAllAllocations(ctx("AuditorMSP")));
        JSONArray distributions = new JSONArray(ministryPeer.getAllDistributions(ctx("MinistryMSP")));
        assertEquals(2, allocations.length());
        assertEquals("ALC-2", allocations.getJSONObject(1).getString("id"));
        assertEquals(1, distributions.length());
        assertEquals("DST-1", distributions.getJSONObject(0).getString("id"));
    }

    @Test
    void emptyLedgerReadsReturnEmptyArrays() {
        assertEquals("[]", auditorPeer.getAllAllocations(ctx("AuditorMSP")));
        assertEquals("[]", auditorPeer.getAllDistributions(ctx("AuditorMSP")));
    }

    @Test
    void sameInputsGiveByteIdenticalJsonOnEveryPeer() {
        String fromMinistry = allocate(ministryPeer, "MinistryMSP", "ALC-1", 42L);
        state.clear();
        txCounter = 0;
        String fromAuditor = allocate(auditorPeer, "MinistryMSP", "ALC-1", 42L);
        assertEquals(fromMinistry, fromAuditor);
        assertTrue(fromMinistry.startsWith("{\"id\":\"ALC-1\",\"programme\":\"Flood Relief\","), fromMinistry);
    }
}
