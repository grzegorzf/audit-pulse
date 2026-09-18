package com.auditpulse.domain.event;

import com.auditpulse.domain.model.ProductPair;
import java.time.Instant;
import java.util.Objects;

/**
 * Emitted when an incoming trade sequence skips expected values (currentSequence > nextExpectedSequence).
 */
public record SequenceGapDetectedEvent(
        ProductPair productPair,
        long expectedSequence,
        long receivedSequence,
        long gapSize,
        Instant occurredAt
) implements DomainEvent {
    public SequenceGapDetectedEvent {
        Objects.requireNonNull(productPair, "productPair cannot be null");
        Objects.requireNonNull(occurredAt, "occurredAt cannot be null");
        if (receivedSequence <= expectedSequence) {
            throw new IllegalArgumentException("receivedSequence must be strictly greater than expectedSequence for a gap");
        }
        if (gapSize <= 0) {
            throw new IllegalArgumentException("gapSize must be positive: " + gapSize);
        }
    }

    public static SequenceGapDetectedEvent of(ProductPair productPair, long expectedSequence, long receivedSequence) {
        long gapSize = receivedSequence - expectedSequence;
        return new SequenceGapDetectedEvent(productPair, expectedSequence, receivedSequence, gapSize, Instant.now());
    }
}
