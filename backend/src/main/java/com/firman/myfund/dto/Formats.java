package com.firman.myfund.dto;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

final class Formats {

    // The frontend shows dates as local Malaysian time strings, matching mockData ("2026-01-14 09:30:00").
    private static final DateTimeFormatter LOCAL =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneId.of("Asia/Kuala_Lumpur"));

    private Formats() {
    }

    static String local(Instant instant) {
        return LOCAL.format(instant);
    }
}
