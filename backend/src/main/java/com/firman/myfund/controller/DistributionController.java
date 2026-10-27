package com.firman.myfund.controller;

import com.firman.myfund.dto.CreateDistributionRequest;
import com.firman.myfund.dto.DistributionResponse;
import com.firman.myfund.dto.DistributionResult;
import com.firman.myfund.model.UserPrincipal;
import com.firman.myfund.service.DistributionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/distributions")
@RequiredArgsConstructor
public class DistributionController {

    private final DistributionService distributionService;

    @GetMapping
    public ResponseEntity<List<DistributionResponse>> list() {
        return ResponseEntity.ok(distributionService.findAll());
    }

    @PostMapping
    public ResponseEntity<DistributionResult> create(@Valid @RequestBody CreateDistributionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(distributionService.create(request, principal.getUser()));
    }
}
