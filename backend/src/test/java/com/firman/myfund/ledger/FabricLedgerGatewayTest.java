package com.firman.myfund.ledger;

import com.firman.myfund.ledger.LedgerException.Kind;
import com.firman.myfund.model.Allocation;
import com.firman.myfund.model.Distribution;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/** Pure mapping logic of FabricLedgerGateway; the live network path is checked by smart-contract/verify.sh. */
class FabricLedgerGatewayTest {

    private final JsonMapper json = JsonMapper.builder().build();

    // Shape copied from a live FundContract response (phase 4 check).
    private static final String ALLOCATION = """
            {"id":"ALC-T1","programme":"Flood Relief","receivingAgency":"NADMA","amountSen":100000,
             "distributedSen":40001,"description":"d","supportingInfo":"s","referenceNo":"REF","allocatedBy":"MOF",
             "businessDate":"2026-01-15T00:00:00Z","txId":"bfd3","timestamp":"2026-11-06T13:39:55.148225042Z",
             "payloadHash":"sha256:1a36"}""";

    @Test
    void allocationJsonBecomesModelWithExactMoneyAndMicrosecondTimestamp() {
        Allocation a = FabricLedgerGateway.toAllocation(json.readTree(ALLOCATION), "myfund-channel", 7);
        assertThat(a.getAmount()).isEqualTo(new BigDecimal("1000.00"));
        assertThat(a.getDistributedAmount()).isEqualTo(new BigDecimal("400.01"));
        assertThat(a.getRemainingAmount()).isEqualTo(new BigDecimal("599.99"));
        assertThat(a.getAllocatedAt()).isEqualTo(Instant.parse("2026-01-15T00:00:00Z"));
        assertThat(a.getLedger().getTimestamp()).isEqualTo(Instant.parse("2026-11-06T13:39:55.148225Z"));
        assertThat(a.getLedger().getBlockNumber()).isEqualTo(7);
        assertThat(a.getLedger().getTxId()).isEqualTo("bfd3");
        assertThat(a.getLedger().getChaincode()).isEqualTo("fund_cc:v1.0");
        assertThat(a.getLedger().getEndorsementPolicy()).isEqualTo(LedgerGateway.ALLOCATION_POLICY);
    }

    @Test
    void distributionJsonBecomesModel() {
        Distribution d = FabricLedgerGateway.toDistribution(json.readTree("""
                {"id":"DST-1","allocationId":"ALC-T1","programmeName":"Flood Relief","agencyName":"NADMA",
                 "beneficiaryName":"Ali","beneficiaryId":"900101","amountSen":5,"description":"aid",
                 "businessDate":"2026-01-15T00:00:00Z","txId":"t","timestamp":"2026-11-06T13:39:55Z",
                 "payloadHash":"sha256:x"}"""), "myfund-channel", 9);
        assertThat(d.getAmount()).isEqualTo(new BigDecimal("0.05"));
        assertThat(d.getProgrammeName()).isEqualTo("Flood Relief");
        assertThat(d.getLedger().getEndorsementPolicy()).isEqualTo(LedgerGateway.DISTRIBUTION_POLICY);
    }

    @Test
    void contractErrorTextMapsToKindAndUserMessage() {
        LedgerException overspend = FabricLedgerGateway.contractError(
                "chaincode response 500, OVERSPEND: amount 60001 sen exceeds remaining 60000 sen");
        assertThat(overspend.getKind()).isEqualTo(Kind.OVERSPEND);
        assertThat(overspend.getMessage()).isEqualTo("Amount exceeds remaining allocation balance (RM 600.00).");

        assertThat(FabricLedgerGateway.contractError("x WRONG_AGENCY: allocation A belongs to NADMA, not KEMAS").getKind())
                .isEqualTo(Kind.WRONG_AGENCY);
        assertThat(FabricLedgerGateway.contractError("INVALID: amount must be greater than zero").getMessage())
                .isEqualTo("Invalid request: amount must be greater than zero");
        assertThat(FabricLedgerGateway.contractError("failed to collect enough peer endorsements")).isNull();
    }
}
