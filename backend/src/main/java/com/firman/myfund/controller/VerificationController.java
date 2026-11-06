package com.firman.myfund.controller;

import com.firman.myfund.dto.VerificationResponse;
import com.firman.myfund.service.VerificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/verification")
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationService verificationService;

    @GetMapping
    public ResponseEntity<VerificationResponse> verify() {
        return ResponseEntity.ok(verificationService.verify());
    }
}
