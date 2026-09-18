package com.auditpulse.domain.event;

import com.auditpulse.domain.model.TradeMatch;
import java.time.Instant;
import java.util.Objects;

/**
 * Emitted when an incoming trade satisfies monotonic sequence continuity.
 */
public record TradeIngestedEvent(
        TradeMatch trade,
        Instant occurredAt
) implements DomainEvent {
    public TradeIngestedEvent {
        Objects.requireNonNull(trade, "trade cannot be null");
        Objects.requireNonNull(occurredAt, "occurredAt cannot be null");
    }

    public static TradeIngestedEvent now(TradeMatch trade) {
        return new TradeIngestedEvent(trade, Instant.now());
    }
}
