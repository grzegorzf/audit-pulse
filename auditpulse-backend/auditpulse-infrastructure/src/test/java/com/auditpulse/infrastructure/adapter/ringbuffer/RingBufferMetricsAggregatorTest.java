package com.auditpulse.infrastructure.adapter.ringbuffer;

import com.auditpulse.application.dto.MetricsSnapshot;
import com.auditpulse.domain.event.SequenceGapDetectedEvent;
import com.auditpulse.domain.model.DeadLetter;
import com.auditpulse.domain.model.DeadLetterReason;
import com.auditpulse.domain.model.ProductPair;
import com.auditpulse.domain.model.TradeMatch;
import com.auditpulse.domain.model.TradeSide;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class RingBufferMetricsAggregatorTest {

    @Test
    @DisplayName("Aggregator correctly records trades, gaps, dead letters, and computes snapshot")
    void testMetricsAggregation() {
        RingBufferMetricsAggregator aggregator = new RingBufferMetricsAggregator();

        TradeMatch trade1 = new TradeMatch(
                1001L,
                50000L,
                new BigDecimal("67000.00"),
                new BigDecimal("0.5"),
                TradeSide.BUY,
                Instant.now(),
                ProductPair.of("BTC-USD")
        );

        TradeMatch trade2 = new TradeMatch(
                1002L,
                50001L,
                new BigDecimal("67010.00"),
                new BigDecimal("1.2"),
                TradeSide.SELL,
                Instant.now(),
                ProductPair.of("BTC-USD")
        );

        aggregator.recordTrade(trade1);
        aggregator.recordTrade(trade2);

        SequenceGapDetectedEvent gap = SequenceGapDetectedEvent.of(ProductPair.of("BTC-USD"), 50002L, 50007L);
        aggregator.recordGap(gap);

        DeadLetter dl = DeadLetter.create(
                1003L,
                ProductPair.of("BTC-USD"),
                50007L,
                50002L,
                DeadLetterReason.GAP_DETECTED,
                "{}"
        );
        aggregator.recordDeadLetter(dl);

        MetricsSnapshot snapshot = aggregator.get();

        assertThat(snapshot.totalProcessed()).isEqualTo(2);
        assertThat(snapshot.quarantinedCount()).isEqualTo(1);
        assertThat(snapshot.lastSequence()).isEqualTo(50007L);
        assertThat(snapshot.eventsPerSecond()).isGreaterThanOrEqualTo(0);
        assertThat(snapshot.latencyMs()).isGreaterThanOrEqualTo(0);
    }
}
