package com.firman.myfund.ledger;

import com.firman.myfund.FakeLedgerGateway;
import com.firman.myfund.ledger.ChainSeeder.Mode;
import com.firman.myfund.model.Allocation;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/** Seeding decisions and resume, on the in-memory ledger only: no Spring, no database, no live sequences. */
class ChainSeederTest {

    private final JsonMapper json = JsonMapper.builder().build();
    private final List<String> sample = DemoSeed.ids(json);

    @Test
    void modeFollowsWhatTheChainHolds() {
        Set<String> all = Set.copyOf(sample);
        assertThat(ChainSeeder.mode(Set.of(), all)).isEqualTo(Mode.FRESH);
        assertThat(ChainSeeder.mode(all, all)).isEqualTo(Mode.COMPLETE);
        assertThat(ChainSeeder.mode(Set.copyOf(sample.subList(0, 3)), all)).isEqualTo(Mode.RESUME);
        assertThat(ChainSeeder.mode(Set.of("ALC-2026-001", "ALC-2026-099"), all)).isEqualTo(Mode.NOT_SAMPLE);
        Set<String> completePlusReal = new HashSet<>(all);
        completePlusReal.add("ALC-2026-005");
        assertThat(ChainSeeder.mode(completePlusReal, all)).isEqualTo(Mode.NOT_SAMPLE);
    }

    @Test
    void resumingAnInterruptedSeedSubmitsOnlyTheRestAndEndsComplete() {
        FakeLedgerGateway ledger = new FakeLedgerGateway(json);
        ledger.clear();
        // Interrupted after the first 3 sample records (2 allocations, 1 distribution), as in the live test.
        DemoSeed.submit(ledger, json, Set.copyOf(sample.subList(3, sample.size())), a -> { }, d -> { });
        assertThat(onChain(ledger)).containsExactlyInAnyOrderElementsOf(sample.subList(0, 3));

        DemoSeed.submit(ledger, json, onChain(ledger), a -> { }, d -> { });

        assertThat(onChain(ledger)).containsExactlyInAnyOrderElementsOf(sample);
        Allocation alc1 = ledger.allocations().stream().filter(a -> a.getId().equals("ALC-2026-001")).findFirst()
                .orElseThrow();
        assertThat(alc1.getDistributedAmount()).isEqualByComparingTo(new BigDecimal("11250000.00"));
    }

    private static Set<String> onChain(FakeLedgerGateway ledger) {
        return Stream.concat(ledger.allocations().stream().map(Allocation::getId),
                ledger.distributions().stream().map(d -> d.getId())).collect(Collectors.toSet());
    }
}
