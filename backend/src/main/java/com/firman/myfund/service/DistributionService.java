package com.firman.myfund.service;

import com.firman.myfund.dto.AllocationResponse;
import com.firman.myfund.dto.CreateDistributionRequest;
import com.firman.myfund.dto.DistributionResponse;
import com.firman.myfund.dto.DistributionResult;
import com.firman.myfund.dto.TransactionResponse;
import com.firman.myfund.exception.NotFoundException;
import com.firman.myfund.ledger.LedgerGateway;
import com.firman.myfund.model.Allocation;
import com.firman.myfund.model.Distribution;
import com.firman.myfund.model.User;
import com.firman.myfund.repo.AllocationRepo;
import com.firman.myfund.repo.DistributionRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.NumberFormat;
import java.time.Instant;
import java.time.Year;
import java.util.List;
import java.util.Locale;

import static com.firman.myfund.service.AllocationService.orDefault;

@Service
@RequiredArgsConstructor
public class DistributionService {

    private final DistributionRepo repo;
    private final AllocationRepo allocationRepo;
    private final LedgerGateway ledger;

    @Transactional(readOnly = true)
    public List<DistributionResponse> findAll() {
        return repo.findAllByOrderByDistributedAtDesc().stream().map(DistributionResponse::from).toList();
    }

    @Transactional
    public DistributionResult create(CreateDistributionRequest req, User user) {
        String allocationId = req.allocationId().trim();
        // Atomic check-and-reserve, so concurrent requests can never overspend an allocation.
        if (allocationRepo.reserve(allocationId, req.amount()) == 0) {
            Allocation source = allocationRepo.findById(allocationId)
                    .orElseThrow(() -> new NotFoundException("Allocation not found."));
            throw new IllegalArgumentException("Amount exceeds remaining allocation balance (%s)."
                    .formatted(rm(source)));
        }
        Allocation source = allocationRepo.findById(allocationId).orElseThrow();

        int year = Year.now().getValue();
        String id = "DST-%d-%03d".formatted(year, repo.nextSeq());

        // Default texts match frontend mockApi.createDistribution.
        Distribution d = new Distribution();
        d.setId(id);
        d.setAllocationId(source.getId());
        d.setProgrammeName(source.getProgramme());
        d.setAgencyName(user.getOrganization());
        d.setBeneficiaryName(req.beneficiaryName().trim());
        d.setBeneficiaryId(orDefault(req.beneficiaryId(), "BEN-%d-%03d".formatted(year, repo.nextBeneficiarySeq())));
        d.setAmount(req.amount());
        d.setDescription(orDefault(req.description(),
                "Direct beneficiary distribution under approved ministry allocation."));
        d.setDistributedAt(Instant.now());
        d.setLedger(ledger.record(String.join("|", "DISTRIBUTION", id, source.getId(), d.getAgencyName(),
                d.getBeneficiaryName(), d.getBeneficiaryId(), d.getAmount().toPlainString()),
                LedgerGateway.DISTRIBUTION_POLICY));
        repo.save(d);

        return new DistributionResult(DistributionResponse.from(d), AllocationResponse.from(source),
                TransactionResponse.of(d));
    }

    private static String rm(Allocation a) {
        NumberFormat f = NumberFormat.getNumberInstance(Locale.of("en", "MY"));
        f.setMinimumFractionDigits(2);
        f.setMaximumFractionDigits(2);
        return "RM " + f.format(a.getRemainingAmount());
    }
}
