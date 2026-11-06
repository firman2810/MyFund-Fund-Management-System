package com.firman.myfund.service;

import com.firman.myfund.dto.VerificationResponse;
import com.firman.myfund.dto.VerificationResponse.Discrepancy;
import com.firman.myfund.ledger.LedgerGateway;
import com.firman.myfund.model.Allocation;
import com.firman.myfund.model.Distribution;
import com.firman.myfund.repo.AllocationRepo;
import com.firman.myfund.repo.DistributionRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Function;

/** Compares every ledger record with its Postgres copy, field by field (block number included). */
@Service
@RequiredArgsConstructor
public class VerificationService {

    private record Field<T>(String name, Function<T, ?> value) {
    }

    private static Field<Allocation> a(String name, Function<Allocation, ?> value) {
        return new Field<>(name, value);
    }

    private static Field<Distribution> d(String name, Function<Distribution, ?> value) {
        return new Field<>(name, value);
    }

    private static final List<Field<Allocation>> ALLOCATION_FIELDS = List.of(
            a("programme", Allocation::getProgramme),
            a("receivingAgency", Allocation::getReceivingAgency),
            a("amount", Allocation::getAmount),
            a("distributedAmount", Allocation::getDistributedAmount),
            a("description", Allocation::getDescription),
            a("supportingInfo", Allocation::getSupportingInfo),
            a("referenceNo", Allocation::getReferenceNo),
            a("allocatedBy", Allocation::getAllocatedBy),
            a("allocatedDate", Allocation::getAllocatedAt),
            a("txId", x -> x.getLedger().getTxId()),
            a("blockNumber", x -> x.getLedger().getBlockNumber()),
            a("ledgerTimestamp", x -> x.getLedger().getTimestamp()),
            a("payloadHash", x -> x.getLedger().getPayloadHash()));

    private static final List<Field<Distribution>> DISTRIBUTION_FIELDS = List.of(
            d("allocationId", Distribution::getAllocationId),
            d("programmeName", Distribution::getProgrammeName),
            d("agencyName", Distribution::getAgencyName),
            d("beneficiaryName", Distribution::getBeneficiaryName),
            d("beneficiaryId", Distribution::getBeneficiaryId),
            d("amount", Distribution::getAmount),
            d("description", Distribution::getDescription),
            d("distributedDate", Distribution::getDistributedAt),
            d("txId", x -> x.getLedger().getTxId()),
            d("blockNumber", x -> x.getLedger().getBlockNumber()),
            d("ledgerTimestamp", x -> x.getLedger().getTimestamp()),
            d("payloadHash", x -> x.getLedger().getPayloadHash()));

    private final LedgerGateway ledger;
    private final AllocationRepo allocationRepo;
    private final DistributionRepo distributionRepo;

    @Transactional(readOnly = true)
    public VerificationResponse verify() {
        List<Discrepancy> out = new ArrayList<>();
        Set<String> ids = new HashSet<>();
        compare(byId(ledger.allocations(), Allocation::getId), byId(allocationRepo.findAll(), Allocation::getId),
                ALLOCATION_FIELDS, out, ids);
        compare(byId(ledger.distributions(), Distribution::getId),
                byId(distributionRepo.findAll(), Distribution::getId), DISTRIBUTION_FIELDS, out, ids);
        return new VerificationResponse(Instant.now(), ids.size(), out);
    }

    private static <T> Map<String, T> byId(List<T> records, Function<T, String> id) {
        Map<String, T> map = new TreeMap<>();
        records.forEach(r -> map.put(id.apply(r), r));
        return map;
    }

    private static <T> void compare(Map<String, T> chain, Map<String, T> copy, List<Field<T>> fields,
                                    List<Discrepancy> out, Set<String> ids) {
        ids.addAll(chain.keySet());
        ids.addAll(copy.keySet());
        chain.forEach((id, onChain) -> {
            T row = copy.get(id);
            if (row == null) {
                out.add(new Discrepancy(id, "MISSING_FROM_COPY", null, null, null));
                return;
            }
            for (Field<T> f : fields) {
                String chainValue = text(f.value().apply(onChain));
                String copyValue = text(f.value().apply(row));
                if (!Objects.equals(chainValue, copyValue)) {
                    out.add(new Discrepancy(id, "VALUE_MISMATCH", f.name(), chainValue, copyValue));
                }
            }
        });
        copy.keySet().stream().filter(id -> !chain.containsKey(id))
                .forEach(id -> out.add(new Discrepancy(id, "NOT_ON_CHAIN", null, null, null)));
    }

    private static String text(Object value) {
        if (value instanceof BigDecimal money) return money.setScale(2, RoundingMode.HALF_UP).toPlainString();
        return value == null ? null : value.toString();
    }
}
