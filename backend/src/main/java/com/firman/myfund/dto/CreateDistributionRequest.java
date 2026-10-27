package com.firman.myfund.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateDistributionRequest(
        @NotBlank(message = "Allocation is required") String allocationId,
        @NotBlank(message = "Beneficiary name is required") @Size(max = 300) String beneficiaryName,
        @Size(max = 100) String beneficiaryId,
        @NotNull(message = "Amount is required") @Positive(message = "Amount must be greater than 0")
        @Digits(integer = 13, fraction = 2) BigDecimal amount,
        @Size(max = 2000) String description) {
}
