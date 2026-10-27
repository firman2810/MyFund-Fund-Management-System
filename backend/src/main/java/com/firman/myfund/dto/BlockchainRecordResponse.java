package com.firman.myfund.dto;

import com.firman.myfund.model.LedgerRecord;

public record BlockchainRecordResponse(String network, String channel, String chaincode, long blockNumber,
        String txId, String ledgerStatus, String endorsementPolicy, String timestamp, String payloadHash) {

    public static BlockchainRecordResponse from(LedgerRecord r) {
        return new BlockchainRecordResponse(r.getNetwork(), r.getChannel(), r.getChaincode(), r.getBlockNumber(),
                r.getTxId(), r.getStatus(), r.getEndorsementPolicy(), r.getTimestamp().toString(),
                r.getPayloadHash());
    }
}
