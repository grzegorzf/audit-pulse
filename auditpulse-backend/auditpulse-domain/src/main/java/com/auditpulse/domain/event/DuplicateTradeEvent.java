package com.auditpulse.domain.event;

import com.auditpulse.domain.model.ProductPair;
import java.time.Instant;
import java.util.Objects;

/**
 * Emitted when an incoming trade sequence has already been processed or is out of order (currentSequence < nextExpectedSequence).
 */
public record DuplicateTradeEvent(
        ProductPair productPair,
        long expectedSequence,
        long receivedSequence,
        Instant occurredAt
) implements DomainEvent {
    public DuplicateTradeEvent {
        Objects.requireNonNull(productPair, "productPair cannot be null");
        Objects.requireNonNull(occurredAt, "occurredAt cannot be null");
        if (receivedSequence >= expectedSequence) {
            throw new IllegalArgumentException("receivedSequence must be strictly less than expectedSequence for a duplicate");
        }
    }

    public static DuplicateTradeEvent of(ProductPair productPair, long expectedSequence, long receivedSequence) {
        return new DuplicateTradeEvent(productPair, expectedSequence, receivedSequence, Instant.now());
    }
}
