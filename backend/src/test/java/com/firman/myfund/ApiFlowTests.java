package com.firman.myfund;

import com.firman.myfund.model.Allocation;
import com.firman.myfund.model.LedgerRecord;
import com.firman.myfund.repo.AllocationRepo;
import com.firman.myfund.repo.DistributionRepo;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Ledger = {@link FakeLedgerGateway} (demo seed, reset per test). The Postgres copy is the local myfund database;
 * each test rolls back, and the "test" profile keeps ChainSeeder (which truncates the copy) switched off.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ApiFlowTests {

    private static final String MINISTRY = "officer.mof@mof.gov.my";
    private static final String AGENCY = "director.nadma@nadma.gov.my";
    private static final String AUDITOR = "auditor.federal@audit.gov.my";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private FakeLedgerGateway ledger;

    @Autowired
    private AllocationRepo allocationRepo;

    @Autowired
    private DistributionRepo distributionRepo;

    @BeforeEach
    void resetLedger() {
        ledger.reset();
    }

    @Test
    void loginRejectsWrongPasswordAndRoleMismatch() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(login(MINISTRY, "wrong", "ministry")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid credentials"));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(login(MINISTRY, "1234", "agency")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedRoutesNeedTokenAndRole() throws Exception {
        mvc.perform(get("/api/allocations")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/distributions").header("Authorization", bearer(MINISTRY, "ministry"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(distribution("ALC-2026-001", "1")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/verification").header("Authorization", bearer(AGENCY, "agency")))
                .andExpect(status().isForbidden());
    }

    @Test
    void ministryCreatesAllocationOnLedgerThenCopy() throws Exception {
        String body = mvc.perform(post("/api/allocations").header("Authorization", bearer(MINISTRY, "ministry"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"programme":"Test Programme","receivingAgency":"Social Welfare Department (JKM)",
                                 "amount":1000000,"description":"","supportingInfo":"","referenceNo":""}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.allocation.id").value(startsWith("ALC-")))
                .andExpect(jsonPath("$.allocation.remainingAmount").value(1000000.0))
                .andExpect(jsonPath("$.allocation.allocatedBy").value("Ministry of Finance"))
                .andExpect(jsonPath("$.allocation.blockchainRecord.chaincode").value("fund_cc:v1.0"))
                .andExpect(jsonPath("$.transaction.id").value(startsWith("TX-ALC-")))
                .andExpect(jsonPath("$.transaction.type").value("Fund Allocation"))
                .andReturn().getResponse().getContentAsString();

        String id = JsonPath.read(body, "$.allocation.id");
        assertTrue(ledger.allocations().stream().anyMatch(a -> a.getId().equals(id)), "on the ledger");
        assertEquals(JsonPath.<String>read(body, "$.allocation.blockchainRecord.txId"),
                allocationRepo.findById(id).orElseThrow().getLedger().getTxId(), "copied to Postgres");
    }

    @Test
    void distributionCannotExceedRemainingButMayEqualIt() throws Exception {
        String token = bearer(AGENCY, "agency");
        // Seeded ALC-2026-001 (NADMA) has RM 3,750,000.00 remaining.
        mvc.perform(post("/api/distributions").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(distribution("ALC-2026-001", "3750000.01")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Amount exceeds remaining allocation balance (RM 3,750,000.00)."));

        String body = mvc.perform(post("/api/distributions").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(distribution("ALC-2026-001", "3750000")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.allocation.remainingAmount").value(0.0))
                .andExpect(jsonPath("$.distribution.agencyName").value("National Disaster Management Agency (NADMA)"))
                .andExpect(jsonPath("$.distribution.programmeName")
                        .value("National Monsoon Flood Rehabilitation Assistance 2026"))
                .andExpect(jsonPath("$.distribution.beneficiaryId").value(startsWith("BEN-")))
                .andExpect(jsonPath("$.transaction.id").value(startsWith("TX-DST-")))
                .andReturn().getResponse().getContentAsString();
        assertTrue(distributionRepo.existsById(JsonPath.read(body, "$.distribution.id")), "copied to Postgres");
        assertEquals(0, allocationRepo.findById("ALC-2026-001").orElseThrow().getRemainingAmount().signum());

        mvc.perform(post("/api/distributions").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(distribution("ALC-NOPE", "1")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Allocation not found."));
    }

    @Test
    void agencyCannotSpendAnotherAgencysAllocation() throws Exception {
        // ALC-2026-004 belongs to YKK; the logged-in agency user is NADMA.
        mvc.perform(post("/api/distributions").header("Authorization", bearer(AGENCY, "agency"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(distribution("ALC-2026-004", "1")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("This allocation belongs to another agency."));
    }

    @Test
    void ledgerOutageIs503WithMessageAndNoFakeResult() throws Exception {
        String token = bearer(MINISTRY, "ministry");
        ledger.unavailable = true;
        mvc.perform(get("/api/allocations").header("Authorization", token))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value(containsString("blockchain network is unavailable")));
        mvc.perform(post("/api/allocations").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"programme":"P","receivingAgency":"Social Welfare Department (JKM)","amount":5}"""))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void transactionsAreNewestFirstAndHashMatchesLedger() throws Exception {
        String body = mvc.perform(get("/api/transactions").header("Authorization", bearer(AGENCY, "agency")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == 'TX-DST-2026-006')].to")
                        .value("Perak Agro Smallholders Association (AGR-PRK-2026-044)"))
                .andExpect(jsonPath("$[?(@.id == 'TX-DST-2026-006')].date").value("2026-09-01 09:40:00"))
                .andReturn().getResponse().getContentAsString();

        List<String> dates = JsonPath.read(body, "$[*].date");
        assertEquals(10, dates.size());
        // "yyyy-MM-dd HH:mm:ss" sorts lexically in time order.
        assertEquals(dates.stream().sorted(Comparator.reverseOrder()).toList(), dates);
        assertEquals(JsonPath.<List<String>>read(body, "$[*].txHash"),
                JsonPath.read(body, "$[*].blockchainRecord.txId"));
    }

    @Test
    void verificationReportsEachKindOfDisagreement() throws Exception {
        String token = bearer(AUDITOR, "auditor");
        // Make the copy match the ledger exactly (rolled back after the test).
        distributionRepo.deleteAll();
        allocationRepo.deleteAll();
        ledger.allocations().forEach(allocationRepo::save);
        ledger.distributions().forEach(distributionRepo::save);

        mvc.perform(get("/api/verification").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recordsChecked").value(10))
                .andExpect(jsonPath("$.discrepancies", hasSize(0)));

        Allocation tampered = allocationRepo.findById("ALC-2026-001").orElseThrow();
        tampered.setDistributedAmount(new BigDecimal("1.00"));
        allocationRepo.save(tampered);
        distributionRepo.deleteById("DST-2026-006");
        Allocation extra = allocationRepo.findById("ALC-2026-002").orElseThrow();
        Allocation stray = new Allocation();
        stray.setId("ALC-2026-999");
        stray.setProgramme(extra.getProgramme());
        stray.setReceivingAgency(extra.getReceivingAgency());
        stray.setAmount(extra.getAmount());
        stray.setDistributedAmount(BigDecimal.ZERO);
        stray.setDescription("x");
        stray.setSupportingInfo("x");
        stray.setReferenceNo("x");
        stray.setAllocatedBy("x");
        stray.setAllocatedAt(Instant.now());
        stray.setLedger(new LedgerRecord("n", "c", "cc", 1, "not-a-real-tx", "COMMITTED_VALID", "p", Instant.now(), "h"));
        allocationRepo.save(stray);

        mvc.perform(get("/api/verification").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recordsChecked").value(11))
                .andExpect(jsonPath("$.discrepancies[*].type")
                        .value(containsInAnyOrder("VALUE_MISMATCH", "MISSING_FROM_COPY", "NOT_ON_CHAIN")))
                .andExpect(jsonPath("$.discrepancies[?(@.type == 'VALUE_MISMATCH')].recordId").value("ALC-2026-001"))
                .andExpect(jsonPath("$.discrepancies[?(@.type == 'VALUE_MISMATCH')].field").value("distributedAmount"))
                .andExpect(jsonPath("$.discrepancies[?(@.type == 'VALUE_MISMATCH')].chainValue").value("11250000.00"))
                .andExpect(jsonPath("$.discrepancies[?(@.type == 'VALUE_MISMATCH')].copyValue").value("1.00"))
                .andExpect(jsonPath("$.discrepancies[?(@.type == 'MISSING_FROM_COPY')].recordId").value("DST-2026-006"))
                .andExpect(jsonPath("$.discrepancies[?(@.type == 'NOT_ON_CHAIN')].recordId").value("ALC-2026-999"));
    }

    private String bearer(String id, String role) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(login(id, "1234", role)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + JsonPath.read(body, "$.token");
    }

    private static String login(String id, String password, String role) {
        return """
                {"identifier":"%s","password":"%s","role":"%s"}""".formatted(id, password, role);
    }

    private static String distribution(String allocationId, String amount) {
        return """
                {"allocationId":"%s","beneficiaryName":"Test Beneficiary","beneficiaryId":"","amount":%s,"description":""}"""
                .formatted(allocationId, amount);
    }
}
