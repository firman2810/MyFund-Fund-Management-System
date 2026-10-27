package com.firman.myfund.dto;

import com.firman.myfund.model.Allocation;
import com.firman.myfund.model.Distribution;

import java.math.BigDecimal;

/** Derived view of an allocation or distribution; mirrors buildInitialTransactions in frontend mockData.ts. */
public record TransactionResponse(String id, String txHash, String type, String from, String to, BigDecimal amount,
        String date, String status, String programme, String description, String referenceNo,
        BlockchainRecordResponse blockchainRecord) {

    public static TransactionResponse of(Allocation a) {
        return new TransactionResponse("TX-ALC-" + a.getId().replace("ALC-", ""), a.getLedger().getTxId(),
                "Fund Allocation", a.getAllocatedBy(), a.getReceivingAgency(), a.getAmount(),
                Formats.local(a.getAllocatedAt()), "Committed", a.getProgramme(), a.getDescription(),
                a.getReferenceNo(), BlockchainRecordResponse.from(a.getLedger()));
    }

    public static TransactionResponse of(Distribution d) {
        return new TransactionResponse("TX-DST-" + d.getId().replace("DST-", ""), d.getLedger().getTxId(),
                "Fund Distribution", d.getAgencyName(), d.getBeneficiaryName() + " (" + d.getBeneficiaryId() + ")",
                d.getAmount(), Formats.local(d.getDistributedAt()), "Committed", d.getProgrammeName(),
                d.getDescription(), d.getId(), BlockchainRecordResponse.from(d.getLedger()));
    }
}
