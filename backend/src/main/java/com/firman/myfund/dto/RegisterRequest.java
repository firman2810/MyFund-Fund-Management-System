package com.firman.myfund.dto;

import com.firman.myfund.model.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "ID is required") @Size(max = 100) String id,
        @NotBlank(message = "Name is required") @Size(max = 200) String name,
        @NotNull(message = "Role is required") Role role,
        @NotBlank(message = "Organization is required") @Size(max = 200) String organization,
        @NotBlank(message = "Password is required")
        @Size(min = 4, max = 200, message = "Password must be at least 4 characters") String password) {
}
