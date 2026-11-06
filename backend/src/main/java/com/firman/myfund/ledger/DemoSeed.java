package com.firman.myfund.ledger;

import com.firman.myfund.model.Allocation;
import com.firman.myfund.model.Distribution;
import com.firman.myfund.model.Role;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;

/** The illustrative sample records in {@code seed/demo-seed.json}, submitted in date order. */
public final class DemoSeed {

    record Event(String type, String id, String date, String programme, String receivingAgency, BigDecimal amount,
                 String description, String supportingInfo, String referenceNo, String allocatedBy,
                 String allocationId, String agencyName, String beneficiaryName, String beneficiaryId) {
    }

    record File(String note, List<Event> events) {
    }

    private DemoSeed() {
    }

    static List<Event> load(JsonMapper json) {
        try (InputStream in = DemoSeed.class.getResourceAsStream("/seed/demo-seed.json")) {
            return json.readValue(in, File.class).events();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /**
     * Submits each sample record not in {@code skipIds} as its organization (Ministry or Agency), in date order,
     * and hands each result to the sinks. Skipping what is already on chain makes an interrupted seed resumable.
     */
    public static void submit(LedgerGateway ledger, JsonMapper json, Set<String> skipIds,
                              Consumer<Allocation> allocations,
                              Consumer<LedgerGateway.DistributionCommit> distributions) {
        for (Event e : load(json)) {
            if (skipIds.contains(e.id())) continue;
            var at = OffsetDateTime.parse(e.date()).toInstant();
            if (e.type().equals("allocation")) {
                Allocation a = new Allocation();
                a.setId(e.id());
                a.setProgramme(e.programme());
                a.setReceivingAgency(e.receivingAgency());
                a.setAmount(e.amount());
                a.setDescription(e.description());
                a.setSupportingInfo(e.supportingInfo());
                a.setReferenceNo(e.referenceNo());
                a.setAllocatedBy(e.allocatedBy());
                a.setAllocatedAt(at);
                allocations.accept(ledger.createAllocation(Role.MINISTRY, a));
            } else {
                Distribution d = new Distribution();
                d.setId(e.id());
                d.setAllocationId(e.allocationId());
                d.setAgencyName(e.agencyName());
                d.setBeneficiaryName(e.beneficiaryName());
                d.setBeneficiaryId(e.beneficiaryId());
                d.setAmount(e.amount());
                d.setDescription(e.description());
                d.setDistributedAt(at);
                distributions.accept(ledger.createDistribution(Role.AGENCY, d));
            }
        }
    }

    /** Sample record IDs in submission (date) order. */
    static List<String> ids(JsonMapper json) {
        return load(json).stream().map(Event::id).toList();
    }

    static long count(JsonMapper json, String type) {
        return load(json).stream().filter(e -> e.type().equals(type)).count();
    }
}
