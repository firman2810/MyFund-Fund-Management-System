package com.firman.myfund.ledger;

import com.firman.myfund.model.Allocation;
import com.firman.myfund.model.Distribution;
import com.firman.myfund.repo.AllocationRepo;
import com.firman.myfund.repo.DistributionRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * At startup: checks the Fabric network answers (the backend refuses to start otherwise, it never serves fake data),
 * then seeds the illustrative demo records according to what the chain already holds (see {@link Mode}).
 * Off in tests: it truncates the copy, which tests share with the running app.
 */
@Slf4j
@Component
@Profile("!test")
@RequiredArgsConstructor
public class ChainSeeder implements ApplicationRunner {

    enum Mode {
        /** Empty chain: clear the copy and submit every sample record. */
        FRESH,
        /** Every sample record is on chain and nothing else: do nothing, so a tampered copy is never repaired. */
        COMPLETE,
        /** Only some sample records (an earlier seed was interrupted): submit the rest, rewrite their copy rows. */
        RESUME,
        /** The chain holds records that aren't samples: it's in use, so never add sample data. */
        NOT_SAMPLE
    }

    private final LedgerGateway ledger;
    private final JsonMapper json;
    private final AllocationRepo allocationRepo;
    private final DistributionRepo distributionRepo;
    private final JdbcClient jdbc;

    static Mode mode(Set<String> onChain, Set<String> sampleIds) {
        if (onChain.isEmpty()) return Mode.FRESH;
        if (!sampleIds.containsAll(onChain)) return Mode.NOT_SAMPLE;
        return onChain.containsAll(sampleIds) ? Mode.COMPLETE : Mode.RESUME;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<Allocation> allocations;
        List<Distribution> distributions;
        try {
            allocations = ledger.allocations();
            distributions = ledger.distributions();
        } catch (LedgerException e) {
            throw new IllegalStateException("The Fabric network is not reachable, so the backend will not start. "
                    + "Start it in WSL with: smart-contract/network.sh up", e);
        }
        Set<String> onChain = new HashSet<>();
        allocations.forEach(a -> onChain.add(a.getId()));
        distributions.forEach(d -> onChain.add(d.getId()));
        List<String> sample = DemoSeed.ids(json);

        switch (mode(onChain, Set.copyOf(sample))) {
            case NOT_SAMPLE -> log.info("Ledger holds {} records, not only the sample; not seeding.", onChain.size());
            case COMPLETE -> log.info("Ledger holds all {} sample records; not seeding.", sample.size());
            case FRESH -> {
                log.info("Ledger is empty: clearing the Postgres copy and submitting the illustrative demo seed.");
                jdbc.sql("TRUNCATE distributions, allocations").update();
                DemoSeed.submit(ledger, json, Set.of(), allocationRepo::save, c -> {
                    allocationRepo.save(c.allocation());
                    distributionRepo.save(c.distribution());
                });
                finish();
            }
            case RESUME -> {
                log.warn("An earlier seed was interrupted: {} of {} sample records are on the ledger; "
                        + "submitting the rest.", onChain.size(), sample.size());
                DemoSeed.submit(ledger, json, onChain, a -> { }, c -> { });
                // A record committed just before the interruption may be missing or stale in the copy:
                // rewrite every sample record's copy row from the chain (allocations first, for the FK).
                ledger.allocations().forEach(allocationRepo::save);
                ledger.distributions().forEach(distributionRepo::save);
                finish();
            }
        }
    }

    private void finish() {
        // Seed IDs are ALC/DST-2026-001.. in order, so the next generated ID follows the last seeded one.
        jdbc.sql("SELECT setval('alc_seq', ?)").param(DemoSeed.count(json, "allocation")).query(Long.class).single();
        jdbc.sql("SELECT setval('dst_seq', ?)").param(DemoSeed.count(json, "distribution")).query(Long.class).single();
        log.info("Seeded {} records on the ledger.", ledger.allocations().size() + ledger.distributions().size());
    }
}
