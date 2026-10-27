package com.firman.myfund.service;

import com.firman.myfund.dto.AllocationResponse;
import com.firman.myfund.dto.AllocationResult;
import com.firman.myfund.dto.CreateAllocationRequest;
import com.firman.myfund.dto.TransactionResponse;
import com.firman.myfund.ledger.LedgerGateway;
import com.firman.myfund.model.Allocation;
import com.firman.myfund.model.User;
import com.firman.myfund.repo.AllocationRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.Year;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AllocationService {

    private final AllocationRepo repo;
    private final LedgerGateway ledger;

    @Transactional(readOnly = true)
    public List<AllocationResponse> findAll() {
        return repo.findAllByOrderByAllocatedAtDesc().stream().map(AllocationResponse::from).toList();
    }

    @Transactional
    public AllocationResult create(CreateAllocationRequest req, User user) {
        int year = Year.now().getValue();
        long seq = repo.nextSeq();
        String id = "ALC-%d-%03d".formatted(year, seq);
        String referenceNo = orDefault(req.referenceNo(), "MOF/WAR/%d/%04d".formatted(year, 100 + seq));

        // Default texts match frontend mockApi.createAllocation.
        Allocation a = new Allocation();
        a.setId(id);
        a.setProgramme(req.programme().trim());
        a.setReceivingAgency(req.receivingAgency().trim());
        a.setAmount(req.amount());
        a.setDistributedAmount(BigDecimal.ZERO);
        a.setDescription(orDefault(req.description(),
                "Official ministerial fund allocation approved under national treasury warrants."));
        a.setSupportingInfo(orDefault(req.supportingInfo(), "Ministry Allocation Warrant Ref: " + referenceNo));
        a.setReferenceNo(referenceNo);
        a.setAllocatedBy(user.getOrganization());
        a.setAllocatedAt(Instant.now());
        a.setLedger(ledger.record(String.join("|", "ALLOCATION", id, a.getProgramme(), a.getReceivingAgency(),
                a.getAmount().toPlainString(), referenceNo, a.getAllocatedBy()), LedgerGateway.ALLOCATION_POLICY));
        repo.save(a);

        return new AllocationResult(AllocationResponse.from(a), TransactionResponse.of(a));
    }

    static String orDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
