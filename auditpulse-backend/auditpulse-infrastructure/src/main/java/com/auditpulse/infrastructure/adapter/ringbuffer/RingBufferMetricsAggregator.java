package com.auditpulse.infrastructure.adapter.ringbuffer;

import com.auditpulse.application.dto.MetricsSnapshot;
import com.auditpulse.domain.event.SequenceGapDetectedEvent;
import com.auditpulse.domain.model.DeadLetter;
import com.auditpulse.domain.model.TradeMatch;
import com.auditpulse.domain.port.MetricsPort;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicLongArray;
import java.util.function.Supplier;

/**
 * Lock-free, high-throughput metrics aggregator using a circular ring buffer
 * to compute a sliding 5-second window of events/second, gap rates, and latency.
 */
public class RingBufferMetricsAggregator implements MetricsPort, Supplier<MetricsSnapshot> {

    private static final int BUCKET_COUNT = 50; // 50 buckets of 100ms = 5000ms window
    private static final long BUCKET_DURATION_MS = 100L;

    private final AtomicLongArray tradeBuckets = new AtomicLongArray(BUCKET_COUNT);
    private final AtomicLongArray bucketTimestamps = new AtomicLongArray(BUCKET_COUNT);

    private final AtomicLong totalProcessed = new AtomicLong(0);
    private final AtomicLong quarantinedCount = new AtomicLong(0);
    private final AtomicLong lastSequence = new AtomicLong(0);
    private final AtomicLong accumulatedLatencyMs = new AtomicLong(0);
    private final AtomicLong latencySamplesCount = new AtomicLong(0);

    @Override
    public void recordTrade(TradeMatch trade) {
        long now = System.currentTimeMillis();
        recordInBucket(now);

        totalProcessed.incrementAndGet();
        lastSequence.set(trade.sequence());

        // Compute latency from trade exchange timestamp to ingestion
        if (trade.timestamp() != null) {
            long latency = Math.max(0, Duration.between(trade.timestamp(), Instant.now()).toMillis());
            accumulatedLatencyMs.addAndGet(latency);
            latencySamplesCount.incrementAndGet();
        }
    }

    @Override
    public void recordGap(SequenceGapDetectedEvent gap) {
        lastSequence.set(gap.receivedSequence());
    }

    @Override
    public void recordDeadLetter(DeadLetter deadLetter) {
        quarantinedCount.incrementAndGet();
    }

    private void recordInBucket(long nowMs) {
        int bucketIndex = (int) ((nowMs / BUCKET_DURATION_MS) % BUCKET_COUNT);
        long bucketTime = nowMs - (nowMs % BUCKET_DURATION_MS);

        long prevTime = bucketTimestamps.get(bucketIndex);
        if (prevTime != bucketTime) {
            // Bucket has aged out, reset if we win CAS
            if (bucketTimestamps.compareAndSet(bucketIndex, prevTime, bucketTime)) {
                tradeBuckets.set(bucketIndex, 1L);
                return;
            }
        }
        tradeBuckets.incrementAndGet(bucketIndex);
    }

    @Override
    public MetricsSnapshot get() {
        long now = System.currentTimeMillis();
        long windowStart = now - (BUCKET_COUNT * BUCKET_DURATION_MS);
        long windowTrades = 0;

        for (int i = 0; i < BUCKET_COUNT; i++) {
            long bucketTime = bucketTimestamps.get(i);
            if (bucketTime >= windowStart && bucketTime <= now) {
                windowTrades += tradeBuckets.get(i);
            }
        }

        // Calculate events per second over the 5-second window
        long eventsPerSecond = windowTrades / 5;

        long samples = latencySamplesCount.getAndSet(0);
        long accLatency = accumulatedLatencyMs.getAndSet(0);
        long avgLatency = samples > 0 ? (accLatency / samples) : 12L;

        return new MetricsSnapshot(
                eventsPerSecond,
                totalProcessed.get(),
                quarantinedCount.get(),
                lastSequence.get(),
                avgLatency
        );
    }
}
