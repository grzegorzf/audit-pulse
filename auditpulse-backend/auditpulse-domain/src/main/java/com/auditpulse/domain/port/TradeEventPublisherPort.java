package com.auditpulse.domain.port;

import com.auditpulse.domain.event.DomainEvent;

/**
 * Outbound port for publishing domain trade events to streaming consumers.
 */
public interface TradeEventPublisherPort {
    void publish(DomainEvent event);
}
