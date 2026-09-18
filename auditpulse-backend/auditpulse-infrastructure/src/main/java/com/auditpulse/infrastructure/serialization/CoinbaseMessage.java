package com.auditpulse.infrastructure.serialization;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Sealed hierarchy of polymorphic messages received from the Coinbase WebSocket feed.
 */
public sealed interface CoinbaseMessage permits
        CoinbaseMessage.CoinbaseMatch,
        CoinbaseMessage.CoinbaseHeartbeat,
        CoinbaseMessage.CoinbaseError,
        CoinbaseMessage.CoinbaseUnknown {

    record CoinbaseMatch(
            long tradeId,
            long sequence,
            BigDecimal price,
            BigDecimal size,
            String side,
            Instant time,
            String productId
    ) implements CoinbaseMessage {
    }

    record CoinbaseHeartbeat(
            long sequence,
            Instant time,
            String productId
    ) implements CoinbaseMessage {
    }

    record CoinbaseError(
            String message,
            String reason
    ) implements CoinbaseMessage {
    }

    record CoinbaseUnknown(
            String raw
    ) implements CoinbaseMessage {
    }
}
