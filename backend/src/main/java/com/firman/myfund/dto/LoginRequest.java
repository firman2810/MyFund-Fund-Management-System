package com.firman.myfund.dto;

import com.firman.myfund.model.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LoginRequest(
        @NotBlank(message = "ID is required") String identifier,
        @NotBlank(message = "Password is required") String password,
        @NotNull(message = "Role is required") Role role) {
}
