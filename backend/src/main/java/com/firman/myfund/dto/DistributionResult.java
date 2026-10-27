package com.firman.myfund.dto;

public record DistributionResult(DistributionResponse distribution, AllocationResponse allocation,
        TransactionResponse transaction) {
}
