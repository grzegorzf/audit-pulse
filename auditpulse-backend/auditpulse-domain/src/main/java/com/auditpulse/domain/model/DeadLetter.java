package com.auditpulse.domain.model;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * DeadLetter Entity capturing malformed payloads, sequence gaps, or desynchronized events.
 */
public record DeadLetter(
        String id,
        Long tradeId,
        ProductPair productPair,
        Long receivedSequence,
        Long expectedSequence,
        DeadLetterReason reason,
        String rawPayload,
        Instant timestamp,
        boolean reconciled
) {
    public DeadLetter {
        Objects.requireNonNull(id, "id cannot be null");
        Objects.requireNonNull(productPair, "productPair cannot be null");
        Objects.requireNonNull(reason, "reason cannot be null");
        Objects.requireNonNull(rawPayload, "rawPayload cannot be null");
        Objects.requireNonNull(timestamp, "timestamp cannot be null");
    }

    public static DeadLetter create(
            Long tradeId,
            ProductPair productPair,
            Long receivedSequence,
            Long expectedSequence,
            DeadLetterReason reason,
            String rawPayload
    ) {
        return new DeadLetter(
                UUID.randomUUID().toString(),
                tradeId,
                productPair,
                receivedSequence,
                expectedSequence,
                reason,
                rawPayload,
                Instant.now(),
                false
        );
    }

    public DeadLetter markReconciled() {
        return new DeadLetter(
                id,
                tradeId,
                productPair,
                receivedSequence,
                expectedSequence,
                reason,
                rawPayload,
                timestamp,
                true
        );
    }
}
