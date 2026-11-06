package com.firman.myfund.service;

import com.firman.myfund.dto.AllocationResponse;
import com.firman.myfund.dto.CreateDistributionRequest;
import com.firman.myfund.dto.DistributionResponse;
import com.firman.myfund.dto.DistributionResult;
import com.firman.myfund.dto.TransactionResponse;
import com.firman.myfund.ledger.LedgerGateway;
import com.firman.myfund.ledger.LedgerGateway.DistributionCommit;
import com.firman.myfund.model.Distribution;
import com.firman.myfund.model.User;
import com.firman.myfund.repo.AllocationRepo;
import com.firman.myfund.repo.DistributionRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Year;
import java.util.Comparator;
import java.util.List;

import static com.firman.myfund.service.AllocationService.now;
import static com.firman.myfund.service.AllocationService.orDefault;
import static com.firman.myfund.service.AllocationService.saveCopy;

/**
 * Reads come from the ledger only; writes go to the ledger, then to the Postgres copy. Balance, ownership and
 * overspend rules are enforced by the contract, so concurrent requests can't overspend either.
 */
@Service
@RequiredArgsConstructor
public class DistributionService {

    private final DistributionRepo repo;
    private final AllocationRepo allocationRepo;
    private final LedgerGateway ledger;

    public List<DistributionResponse> findAll() {
        return ledger.distributions().stream()
                .sorted(Comparator.comparing(Distribution::getDistributedAt).reversed())
                .map(DistributionResponse::from).toList();
    }

    public DistributionResult create(CreateDistributionRequest req, User user) {
        int year = Year.now().getValue();
        String id = "DST-%d-%03d".formatted(year, repo.nextSeq());

        // Default texts match frontend mockApi.createDistribution.
        Distribution draft = new Distribution();
        draft.setId(id);
        draft.setAllocationId(req.allocationId().trim());
        draft.setAgencyName(user.getOrganization());
        draft.setBeneficiaryName(req.beneficiaryName().trim());
        draft.setBeneficiaryId(orDefault(req.beneficiaryId(), "BEN-%d-%03d".formatted(year, repo.nextBeneficiarySeq())));
        draft.setAmount(req.amount());
        draft.setDescription(orDefault(req.description(),
                "Direct beneficiary distribution under approved ministry allocation."));
        draft.setDistributedAt(now());

        DistributionCommit c = ledger.createDistribution(user.getRole(), draft);
        saveCopy(id, () -> {
            allocationRepo.save(c.allocation());
            repo.save(c.distribution());
        });
        return new DistributionResult(DistributionResponse.from(c.distribution()), AllocationResponse.from(c.allocation()),
                TransactionResponse.of(c.distribution()));
    }
}
