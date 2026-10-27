package com.firman.myfund.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateAllocationRequest(
        @NotBlank(message = "Programme is required") @Size(max = 300) String programme,
        @NotBlank(message = "Receiving agency is required") @Size(max = 200) String receivingAgency,
        @NotNull(message = "Amount is required") @Positive(message = "Amount must be greater than 0")
        @Digits(integer = 13, fraction = 2) BigDecimal amount,
        @Size(max = 2000) String description,
        @Size(max = 2000) String supportingInfo,
        @Size(max = 100) String referenceNo) {
}
