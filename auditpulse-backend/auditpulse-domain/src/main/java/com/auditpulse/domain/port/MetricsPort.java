package com.auditpulse.domain.port;

import com.auditpulse.domain.event.SequenceGapDetectedEvent;
import com.auditpulse.domain.model.DeadLetter;
import com.auditpulse.domain.model.TradeMatch;

/**
 * Outbound port for recording ingestion and telemetry metrics.
 */
public interface MetricsPort {

    void recordTrade(TradeMatch trade);

    void recordGap(SequenceGapDetectedEvent gap);

    void recordDeadLetter(DeadLetter deadLetter);
}
