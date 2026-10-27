package com.firman.myfund.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/** The Fabric ledger entry for an allocation or distribution (columns prefixed ledger_). */
@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class LedgerRecord {

    @Column(name = "ledger_network")
    private String network;

    @Column(name = "ledger_channel")
    private String channel;

    @Column(name = "ledger_chaincode")
    private String chaincode;

    @Column(name = "ledger_block_number")
    private long blockNumber;

    @Column(name = "ledger_tx_id")
    private String txId;

    @Column(name = "ledger_status")
    private String status;

    @Column(name = "ledger_endorsement_policy")
    private String endorsementPolicy;

    @Column(name = "ledger_timestamp")
    private Instant timestamp;

    @Column(name = "ledger_payload_hash")
    private String payloadHash;
}
