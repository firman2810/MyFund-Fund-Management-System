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
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.Year;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

/** Reads come from the ledger only; writes go to the ledger, then to the Postgres copy. */
@Slf4j
@Service
@RequiredArgsConstructor
public class AllocationService {

    private final AllocationRepo repo;
    private final LedgerGateway ledger;

    public List<AllocationResponse> findAll() {
        return ledger.allocations().stream()
                .sorted(Comparator.comparing(Allocation::getAllocatedAt).reversed())
                .map(AllocationResponse::from).toList();
    }

    public AllocationResult create(CreateAllocationRequest req, User user) {
        int year = Year.now().getValue();
        long seq = repo.nextSeq();
        String id = "ALC-%d-%03d".formatted(year, seq);
        String referenceNo = orDefault(req.referenceNo(), "MOF/WAR/%d/%04d".formatted(year, 100 + seq));

        // Default texts match frontend mockApi.createAllocation.
        Allocation draft = new Allocation();
        draft.setId(id);
        draft.setProgramme(req.programme().trim());
        draft.setReceivingAgency(req.receivingAgency().trim());
        draft.setAmount(req.amount());
        draft.setDescription(orDefault(req.description(),
                "Official ministerial fund allocation approved under national treasury warrants."));
        draft.setSupportingInfo(orDefault(req.supportingInfo(), "Ministry Allocation Warrant Ref: " + referenceNo));
        draft.setReferenceNo(referenceNo);
        draft.setAllocatedBy(user.getOrganization());
        draft.setAllocatedAt(now());

        Allocation a = ledger.createAllocation(user.getRole(), draft);
        saveCopy(id, () -> repo.save(a));
        return new AllocationResult(AllocationResponse.from(a), TransactionResponse.of(a));
    }

    static String orDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    /** Business date of a new record; microseconds so the Postgres copy can hold it exactly. */
    static Instant now() {
        return Instant.now().truncatedTo(ChronoUnit.MICROS);
    }

    /** The ledger already committed, so a failed copy write is logged, not raised: verification will report it. */
    static void saveCopy(String id, Runnable save) {
        try {
            save.run();
        } catch (RuntimeException e) {
            log.error("{} is committed on the ledger but the Postgres copy write failed", id, e);
        }
    }
}
