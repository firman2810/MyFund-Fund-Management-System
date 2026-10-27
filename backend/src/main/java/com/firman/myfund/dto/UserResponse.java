package com.firman.myfund.dto;

import com.firman.myfund.model.Role;
import com.firman.myfund.model.User;

public record UserResponse(String id, String name, Role role, String organization, String designation,
        String department) {

    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getName(), u.getRole(), u.getOrganization(), u.getDesignation(),
                u.getDepartment());
    }
}
