package com.firman.myfund.dto;

import com.firman.myfund.model.Distribution;

import java.math.BigDecimal;

public record DistributionResponse(String id, String allocationId, String programmeName, String agencyName,
        String beneficiaryName, String beneficiaryId, BigDecimal amount, String description, String distributedDate,
        BlockchainRecordResponse blockchainRecord) {

    public static DistributionResponse from(Distribution d) {
        return new DistributionResponse(d.getId(), d.getAllocationId(), d.getProgrammeName(), d.getAgencyName(),
                d.getBeneficiaryName(), d.getBeneficiaryId(), d.getAmount(), d.getDescription(),
                Formats.local(d.getDistributedAt()), BlockchainRecordResponse.from(d.getLedger()));
    }
}
