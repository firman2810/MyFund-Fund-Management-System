package com.firman.myfund.ledger;

import com.firman.myfund.model.LedgerRecord;

/** Writes a fund event to the Fabric ledger. Services depend only on this, never on Fabric types. */
public interface LedgerGateway {

    String ALLOCATION_POLICY = "AND('MinistryMSP.peer', 'AuditorMSP.peer')";
    String DISTRIBUTION_POLICY = "AND('AgencyMSP.peer', 'AuditorMSP.peer')";

    /** Submits {@code payload} under {@code endorsementPolicy}; throws if the ledger rejects it. */
    LedgerRecord record(String payload, String endorsementPolicy);
}
