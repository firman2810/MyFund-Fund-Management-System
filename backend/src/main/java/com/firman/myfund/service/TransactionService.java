package com.firman.myfund.service;

import com.firman.myfund.dto.TransactionResponse;
import com.firman.myfund.ledger.LedgerGateway;
import com.firman.myfund.model.Allocation;
import com.firman.myfund.model.Distribution;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** No transactions table: the trail is derived from the ledger's allocations and distributions. */
@Service
@RequiredArgsConstructor
public class TransactionService {

    private final LedgerGateway ledger;

    private record Dated(Instant at, TransactionResponse tx) {
    }

    public List<TransactionResponse> findAll() {
        List<Dated> all = new ArrayList<>();
        for (Allocation a : ledger.allocations()) {
            all.add(new Dated(a.getAllocatedAt(), TransactionResponse.of(a)));
        }
        for (Distribution d : ledger.distributions()) {
            all.add(new Dated(d.getDistributedAt(), TransactionResponse.of(d)));
        }
        return all.stream().sorted(Comparator.comparing(Dated::at).reversed()).map(Dated::tx).toList();
    }
}
