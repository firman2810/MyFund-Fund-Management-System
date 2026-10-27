package com.firman.myfund;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Runs against the local Postgres with the V2 demo seed; each test rolls back. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ApiFlowTests {

    private static final String MINISTRY = "officer.mof@mof.gov.my";
    private static final String AGENCY = "director.nadma@nadma.gov.my";

    @Autowired
    private MockMvc mvc;

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
                        .content(distribution("ALC-2026-004", "1")))
                .andExpect(status().isForbidden());
    }

    @Test
    void ministryCreatesAllocation() throws Exception {
        mvc.perform(post("/api/allocations").header("Authorization", bearer(MINISTRY, "ministry"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"programme":"Test Programme","receivingAgency":"Social Welfare Department (JKM)",
                                 "amount":1000000,"description":"","supportingInfo":"","referenceNo":""}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.allocation.id").value(startsWith("ALC-")))
                .andExpect(jsonPath("$.allocation.remainingAmount").value(1000000.0))
                .andExpect(jsonPath("$.allocation.allocatedBy").value("Ministry of Finance"))
                .andExpect(jsonPath("$.transaction.id").value(startsWith("TX-ALC-")))
                .andExpect(jsonPath("$.transaction.type").value("Fund Allocation"));
    }

    @Test
    void distributionCannotExceedRemainingButMayEqualIt() throws Exception {
        String token = bearer(AGENCY, "agency");
        // Seeded ALC-2026-004 has RM 2,200,000.00 remaining.
        mvc.perform(post("/api/distributions").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(distribution("ALC-2026-004", "2200000.01")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("RM 2,200,000.00")));

        mvc.perform(post("/api/distributions").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(distribution("ALC-2026-004", "2200000")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.allocation.remainingAmount").value(0.0))
                .andExpect(jsonPath("$.distribution.agencyName").value("National Disaster Management Agency (NADMA)"))
                .andExpect(jsonPath("$.distribution.beneficiaryId").value(startsWith("BEN-")))
                .andExpect(jsonPath("$.transaction.id").value(startsWith("TX-DST-")));

        mvc.perform(post("/api/distributions").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(distribution("ALC-NOPE", "1")))
                .andExpect(status().isNotFound());
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
        assertTrue(dates.size() >= 10);
        // "yyyy-MM-dd HH:mm:ss" sorts lexically in time order.
        assertEquals(dates.stream().sorted(Comparator.reverseOrder()).toList(), dates);
        assertEquals(JsonPath.<List<String>>read(body, "$[*].txHash"),
                JsonPath.read(body, "$[*].blockchainRecord.txId"));
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
