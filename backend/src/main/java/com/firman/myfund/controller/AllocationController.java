package com.firman.myfund.controller;

import com.firman.myfund.dto.AllocationResponse;
import com.firman.myfund.dto.AllocationResult;
import com.firman.myfund.dto.CreateAllocationRequest;
import com.firman.myfund.model.UserPrincipal;
import com.firman.myfund.service.AllocationService;
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
@RequestMapping("/api/allocations")
@RequiredArgsConstructor
public class AllocationController {

    private final AllocationService allocationService;

    @GetMapping
    public ResponseEntity<List<AllocationResponse>> list() {
        return ResponseEntity.ok(allocationService.findAll());
    }

    @PostMapping
    public ResponseEntity<AllocationResult> create(@Valid @RequestBody CreateAllocationRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(allocationService.create(request, principal.getUser()));
    }
}
