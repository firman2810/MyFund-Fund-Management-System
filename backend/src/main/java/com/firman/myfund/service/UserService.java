package com.firman.myfund.service;

import com.firman.myfund.dto.AuthResponse;
import com.firman.myfund.dto.LoginRequest;
import com.firman.myfund.dto.RegisterRequest;
import com.firman.myfund.dto.UserResponse;
import com.firman.myfund.model.Role;
import com.firman.myfund.model.User;
import com.firman.myfund.model.UserPrincipal;
import com.firman.myfund.repo.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepo repo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String id = request.id().trim();
        if (repo.existsById(id)) {
            throw new IllegalArgumentException("ID already registered: " + id);
        }

        // Demo mode (decided): the client chooses the role, as in mockApi.
        User user = new User();
        user.setId(id);
        user.setName(request.name().trim());
        user.setRole(request.role());
        user.setOrganization(request.organization().trim());
        user.setDesignation(designationFor(request.role()));
        user.setDepartment(user.getOrganization());
        user.setPassword(passwordEncoder.encode(request.password()));
        repo.save(user);

        return new AuthResponse(jwtService.generateToken(user.getId()), UserResponse.from(user));
    }

    public AuthResponse login(LoginRequest request) {
        var auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.identifier().trim(), request.password()));
        User user = ((UserPrincipal) auth.getPrincipal()).getUser();
        if (user.getRole() != request.role()) {
            throw new BadCredentialsException("Role mismatch");
        }
        return new AuthResponse(jwtService.generateToken(user.getId()), UserResponse.from(user));
    }

    private static String designationFor(Role role) {
        return switch (role) {
            case MINISTRY -> "Ministry Allocation Officer";
            case AGENCY -> "Authorized Disbursing Officer";
            case AUDITOR -> "Statutory Compliance Auditor";
        };
    }
}
