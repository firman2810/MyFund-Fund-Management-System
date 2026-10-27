package com.firman.myfund.dto;

import com.firman.myfund.model.Allocation;

import java.math.BigDecimal;

public record AllocationResponse(String id, String programme, String receivingAgency, BigDecimal amount,
        BigDecimal distributedAmount, BigDecimal remainingAmount, String description, String supportingInfo,
        String referenceNo, String allocatedBy, String allocatedDate, BlockchainRecordResponse blockchainRecord) {

    public static AllocationResponse from(Allocation a) {
        return new AllocationResponse(a.getId(), a.getProgramme(), a.getReceivingAgency(), a.getAmount(),
                a.getDistributedAmount(), a.getRemainingAmount(), a.getDescription(), a.getSupportingInfo(),
                a.getReferenceNo(), a.getAllocatedBy(), Formats.local(a.getAllocatedAt()),
                BlockchainRecordResponse.from(a.getLedger()));
    }
}
