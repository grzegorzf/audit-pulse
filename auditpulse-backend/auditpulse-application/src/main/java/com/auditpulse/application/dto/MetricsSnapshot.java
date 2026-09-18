package com.auditpulse.application.dto;

/**
 * Real-time telemetry snapshot calculated over a sliding window.
 */
public record MetricsSnapshot(
        long eventsPerSecond,
        long totalProcessed,
        long quarantinedCount,
        long lastSequence,
        long latencyMs
) {
}
