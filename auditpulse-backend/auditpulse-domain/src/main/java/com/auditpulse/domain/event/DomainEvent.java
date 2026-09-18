package com.auditpulse.domain.event;

import java.time.Instant;

/**
 * Sealed DomainEvent hierarchy representing business events emitted by domain aggregates.
 */
public sealed interface DomainEvent permits TradeIngestedEvent, SequenceGapDetectedEvent, DuplicateTradeEvent {
    Instant occurredAt();
}
