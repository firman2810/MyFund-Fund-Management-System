package com.firman.myfund.service;

import com.firman.myfund.dto.TransactionResponse;
import com.firman.myfund.model.Allocation;
import com.firman.myfund.model.Distribution;
import com.firman.myfund.repo.AllocationRepo;
import com.firman.myfund.repo.DistributionRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** No transactions table: the trail is derived from allocations and distributions, so it can't drift. */
@Service
@RequiredArgsConstructor
public class TransactionService {

    private final AllocationRepo allocationRepo;
    private final DistributionRepo distributionRepo;

    private record Dated(Instant at, TransactionResponse tx) {
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> findAll() {
        List<Dated> all = new ArrayList<>();
        for (Allocation a : allocationRepo.findAll()) {
            all.add(new Dated(a.getAllocatedAt(), TransactionResponse.of(a)));
        }
        for (Distribution d : distributionRepo.findAll()) {
            all.add(new Dated(d.getDistributedAt(), TransactionResponse.of(d)));
        }
        return all.stream().sorted(Comparator.comparing(Dated::at).reversed()).map(Dated::tx).toList();
    }
}
