package com.auditpulse.application.usecase;

import com.auditpulse.application.dto.MetricsSnapshot;

import java.util.Objects;
import java.util.function.Supplier;

/**
 * StreamMetricsUseCase: Provides real-time sliding window metrics (events/sec, gap rate, latency).
 */
public class StreamMetricsUseCase {

    private final Supplier<MetricsSnapshot> snapshotSupplier;

    public StreamMetricsUseCase(Supplier<MetricsSnapshot> snapshotSupplier) {
        this.snapshotSupplier = Objects.requireNonNull(snapshotSupplier, "snapshotSupplier cannot be null");
    }

    public MetricsSnapshot getSnapshot() {
        return snapshotSupplier.get();
    }
}
