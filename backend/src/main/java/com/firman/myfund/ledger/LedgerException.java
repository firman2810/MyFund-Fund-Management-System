package com.firman.myfund.ledger;

import lombok.Getter;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** A ledger refusal or outage, free of Fabric types. The message is shown to the user as-is. */
@Getter
public class LedgerException extends RuntimeException {

    /** Mirrors the contract's error codes, plus CONFLICT (MVCC) and UNAVAILABLE (network). */
    public enum Kind { NOT_FOUND, OVERSPEND, WRONG_AGENCY, FORBIDDEN, DUPLICATE, INVALID, CONFLICT, UNAVAILABLE }

    private final Kind kind;

    public LedgerException(Kind kind, String message) {
        super(message);
        this.kind = kind;
    }

    public LedgerException(Kind kind, String message, Throwable cause) {
        super(message, cause);
        this.kind = kind;
    }

    public static LedgerException overspend(BigDecimal remaining) {
        return new LedgerException(Kind.OVERSPEND,
                "Amount exceeds remaining allocation balance (%s).".formatted(rm(remaining)));
    }

    /** Builds the user-facing exception for a contract error code and its detail text. */
    public static LedgerException fromContract(Kind kind, String detail) {
        return switch (kind) {
            case NOT_FOUND -> new LedgerException(kind, "Allocation not found.");
            case WRONG_AGENCY -> new LedgerException(kind, "This allocation belongs to another agency.");
            case FORBIDDEN -> new LedgerException(kind, "The ledger refused this request for your organization.");
            case DUPLICATE -> new LedgerException(kind, "This record already exists on the ledger.");
            case INVALID -> new LedgerException(kind, "Invalid request: " + detail);
            case CONFLICT -> new LedgerException(kind,
                    "Another update to this allocation was committed at the same time. Please try again.");
            case UNAVAILABLE -> unavailable(null);
            case OVERSPEND -> {
                // FundContract writes "amount <n> sen exceeds remaining <n> sen".
                Matcher m = REMAINING_SEN.matcher(detail);
                yield m.find() ? overspend(BigDecimal.valueOf(Long.parseLong(m.group(1)), 2))
                        : new LedgerException(kind, "Amount exceeds remaining allocation balance.");
            }
        };
    }

    private static final Pattern REMAINING_SEN = Pattern.compile("remaining (\\d+) sen");

    public static LedgerException unavailable(Throwable cause) {
        return new LedgerException(Kind.UNAVAILABLE,
                "The blockchain network is unavailable, so nothing was recorded. Please try again shortly.", cause);
    }

    private static String rm(BigDecimal amount) {
        NumberFormat f = NumberFormat.getNumberInstance(Locale.of("en", "MY"));
        f.setMinimumFractionDigits(2);
        f.setMaximumFractionDigits(2);
        return "RM " + f.format(amount);
    }
}
