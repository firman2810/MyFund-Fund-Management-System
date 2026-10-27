package com.firman.myfund.ledger;

import com.firman.myfund.model.LedgerRecord;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;

/**
 * shortcut: fakes Fabric commits (random txId, DB-sequence block numbers) the same way frontend mockApi does;
 * replace with a Fabric Gateway implementation behind a Spring profile once smart-contract/ exists.
 */
@Component
@RequiredArgsConstructor
public class StubLedgerGateway implements LedgerGateway {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcClient jdbc;

    @Override
    public LedgerRecord record(String payload, String endorsementPolicy) {
        long block = jdbc.sql("select nextval('ledger_block_seq')").query(Long.class).single();
        byte[] txId = new byte[32];
        RANDOM.nextBytes(txId);
        return new LedgerRecord("Hyperledger Fabric v2.5 LTS", "myfund-channel", "fund_cc:v1.2", block,
                HexFormat.of().formatHex(txId), "COMMITTED_VALID", endorsementPolicy, Instant.now(),
                "sha256:" + sha256(payload));
    }

    private static String sha256(String payload) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
