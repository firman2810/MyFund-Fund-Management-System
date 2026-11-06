package com.firman.myfund.dto;

import java.time.Instant;
import java.util.List;

/** Result of comparing every ledger record with its Postgres copy. Reports only; never repairs the copy. */
public record VerificationResponse(Instant checkedAt, int recordsChecked, List<Discrepancy> discrepancies) {

    /** {@code type}: VALUE_MISMATCH (field, chainValue, copyValue set), MISSING_FROM_COPY or NOT_ON_CHAIN. */
    public record Discrepancy(String recordId, String type, String field, String chainValue, String copyValue) {
    }
}
