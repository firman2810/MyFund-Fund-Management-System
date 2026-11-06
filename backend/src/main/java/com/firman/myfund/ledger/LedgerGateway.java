package com.firman.myfund.ledger;

import com.firman.myfund.model.Allocation;
import com.firman.myfund.model.Distribution;
import com.firman.myfund.model.Role;

import java.util.List;

/**
 * The fund ledger (Hyperledger Fabric). It is the source of truth: services read from it and write through it,
 * and never depend on Fabric types. Returned records are detached values, ledger fields filled in.
 * Failures are {@link LedgerException}s.
 */
public interface LedgerGateway {

    String NETWORK = "Hyperledger Fabric v2.5 LTS";
    String CHAINCODE_LABEL = "fund_cc:v1.0";   // keep in step with CC_VERSION in smart-contract/network.sh
    String COMMITTED = "COMMITTED_VALID";
    // What actually endorses each function (chaincode policy + FundContract's peer guards).
    String ALLOCATION_POLICY = "AND('MinistryMSP.peer', 'AuditorMSP.peer')";
    String DISTRIBUTION_POLICY = "AND('AgencyMSP.peer', 'AuditorMSP.peer')";

    /** Submits as {@code caller}'s organization and waits for the commit. */
    Allocation createAllocation(Role caller, Allocation draft);

    /** Submits as {@code caller}'s organization; returns the distribution and its updated allocation. */
    DistributionCommit createDistribution(Role caller, Distribution draft);

    List<Allocation> allocations();

    List<Distribution> distributions();

    record DistributionCommit(Distribution distribution, Allocation allocation) {
    }
}
