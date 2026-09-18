package com.auditpulse.domain.model;

import com.auditpulse.domain.event.DomainEvent;
import com.auditpulse.domain.event.DuplicateTradeEvent;
import com.auditpulse.domain.event.SequenceGapDetectedEvent;
import com.auditpulse.domain.event.TradeIngestedEvent;

import java.util.Objects;
import java.util.concurrent.atomic.AtomicLong;

/**
 * SequenceTracker Domain Aggregate.
 * Responsible for enforcing monotonic sequence continuity for a specific ProductPair.
 * Invariant: nextExpectedSequence == currentSequence + 1.
 */
public class SequenceTracker {

    private final ProductPair productPair;
    private final AtomicLong nextExpectedSequence;
    private final AtomicLong totalProcessed;
    private final AtomicLong totalGaps;
    private final AtomicLong totalDuplicates;

    public SequenceTracker(ProductPair productPair) {
        this(productPair, -1L);
    }

    public SequenceTracker(ProductPair productPair, long initialSequence) {
        this.productPair = Objects.requireNonNull(productPair, "productPair cannot be null");
        this.nextExpectedSequence = new AtomicLong(initialSequence);
        this.totalProcessed = new AtomicLong(0);
        this.totalGaps = new AtomicLong(0);
        this.totalDuplicates = new AtomicLong(0);
    }

    /**
     * Evaluates an incoming TradeMatch against the sequence invariant.
     *
     * @param trade the incoming trade match
     * @return the resulting DomainEvent (TradeIngestedEvent, SequenceGapDetectedEvent, or DuplicateTradeEvent)
     */
    public synchronized DomainEvent evaluate(TradeMatch trade) {
        Objects.requireNonNull(trade, "trade cannot be null");
        if (!trade.productPair().equals(this.productPair)) {
            throw new IllegalArgumentException("Product pair mismatch: expected " + this.productPair + ", got " + trade.productPair());
        }

        long current = trade.sequence();
        long expected = nextExpectedSequence.get();

        totalProcessed.incrementAndGet();

        // Cold start initialization
        if (expected == -1L) {
            nextExpectedSequence.set(current + 1);
            return TradeIngestedEvent.now(trade);
        }

        if (current == expected) {
            nextExpectedSequence.set(current + 1);
            return TradeIngestedEvent.now(trade);
        } else if (current > expected) {
            // Monotonic invariant broken: GAP DETECTED
            totalGaps.incrementAndGet();
            // Fast-forward sequence tracker to resume tracking next trades
            nextExpectedSequence.set(current + 1);
            return SequenceGapDetectedEvent.of(productPair, expected, current);
        } else {
            // Stale or duplicate trade received
            totalDuplicates.incrementAndGet();
            return DuplicateTradeEvent.of(productPair, expected, current);
        }
    }

    public ProductPair productPair() {
        return productPair;
    }

    public long nextExpectedSequence() {
        return nextExpectedSequence.get();
    }

    public long totalProcessed() {
        return totalProcessed.get();
    }

    public long totalGaps() {
        return totalGaps.get();
    }

    public long totalDuplicates() {
        return totalDuplicates.get();
    }

    public synchronized void reset() {
        nextExpectedSequence.set(-1L);
        totalProcessed.set(0);
        totalGaps.set(0);
        totalDuplicates.set(0);
    }

    public synchronized void reset(long startingSequence) {
        nextExpectedSequence.set(startingSequence);
    }
}
