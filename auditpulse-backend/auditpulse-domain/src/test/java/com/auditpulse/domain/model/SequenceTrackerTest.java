package com.auditpulse.domain.model;

import com.auditpulse.domain.event.DomainEvent;
import com.auditpulse.domain.event.DuplicateTradeEvent;
import com.auditpulse.domain.event.SequenceGapDetectedEvent;
import com.auditpulse.domain.event.TradeIngestedEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class SequenceTrackerTest {

    private SequenceTracker tracker;
    private final ProductPair btcUsd = ProductPair.of("BTC-USD");

    @BeforeEach
    void setUp() {
        tracker = new SequenceTracker(btcUsd);
    }

    private TradeMatch createTrade(long tradeId, long sequence) {
        return new TradeMatch(
                tradeId,
                sequence,
                new BigDecimal("65000.50"),
                new BigDecimal("0.125"),
                TradeSide.BUY,
                Instant.now(),
                btcUsd
        );
    }

    @Test
    @DisplayName("First received trade should initialize sequence and emit TradeIngestedEvent")
    void firstTradeInitializesSequence() {
        TradeMatch trade = createTrade(101L, 1000L);
        DomainEvent event = tracker.evaluate(trade);

        assertThat(event).isInstanceOf(TradeIngestedEvent.class);
        assertThat(tracker.nextExpectedSequence()).isEqualTo(1001L);
        assertThat(tracker.totalProcessed()).isEqualTo(1L);
        assertThat(tracker.totalGaps()).isEqualTo(0L);
    }

    @Test
    @DisplayName("Continuous sequential trades should maintain invariant and emit TradeIngestedEvent")
    void continuousTradesAdvanceSequence() {
        tracker.evaluate(createTrade(101L, 1000L));
        DomainEvent event2 = tracker.evaluate(createTrade(102L, 1001L));
        DomainEvent event3 = tracker.evaluate(createTrade(103L, 1002L));

        assertThat(event2).isInstanceOf(TradeIngestedEvent.class);
        assertThat(event3).isInstanceOf(TradeIngestedEvent.class);
        assertThat(tracker.nextExpectedSequence()).isEqualTo(1003L);
        assertThat(tracker.totalProcessed()).isEqualTo(3L);
        assertThat(tracker.totalGaps()).isEqualTo(0L);
    }

    @Test
    @DisplayName("Skipped sequence should detect gap and emit SequenceGapDetectedEvent")
    void skippedSequenceEmitsGapEvent() {
        tracker.evaluate(createTrade(101L, 1000L)); // sets nextExpected = 1001

        // Skip to 1005 (expected was 1001, gap size = 4)
        TradeMatch gapTrade = createTrade(105L, 1005L);
        DomainEvent gapEvent = tracker.evaluate(gapTrade);

        assertThat(gapEvent).isInstanceOf(SequenceGapDetectedEvent.class);
        SequenceGapDetectedEvent event = (SequenceGapDetectedEvent) gapEvent;
        assertThat(event.expectedSequence()).isEqualTo(1001L);
        assertThat(event.receivedSequence()).isEqualTo(1005L);
        assertThat(event.gapSize()).isEqualTo(4L);

        // SequenceTracker should fast-forward to 1006 to keep stream moving
        assertThat(tracker.nextExpectedSequence()).isEqualTo(1006L);
        assertThat(tracker.totalGaps()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Old or duplicate sequence should emit DuplicateTradeEvent")
    void duplicateSequenceEmitsDuplicateEvent() {
        tracker.evaluate(createTrade(101L, 1000L)); // next = 1001
        tracker.evaluate(createTrade(102L, 1001L)); // next = 1002

        // Duplicate/older sequence 1000 arrives
        TradeMatch duplicateTrade = createTrade(101L, 1000L);
        DomainEvent duplicateEvent = tracker.evaluate(duplicateTrade);

        assertThat(duplicateEvent).isInstanceOf(DuplicateTradeEvent.class);
        DuplicateTradeEvent event = (DuplicateTradeEvent) duplicateEvent;
        assertThat(event.expectedSequence()).isEqualTo(1002L);
        assertThat(event.receivedSequence()).isEqualTo(1000L);

        // Tracker sequence should not be altered by duplicate
        assertThat(tracker.nextExpectedSequence()).isEqualTo(1002L);
        assertThat(tracker.totalDuplicates()).isEqualTo(1L);
    }
}
