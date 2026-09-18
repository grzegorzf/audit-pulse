package com.auditpulse.application.dto;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * IngestionCommand carries normalized incoming data from exchange gateways or mock engines.
 */
public record IngestionCommand(
        long tradeId,
        long sequence,
        BigDecimal price,
        BigDecimal size,
        String side,
        Instant timestamp,
        String product,
        String rawPayload
) {
}
