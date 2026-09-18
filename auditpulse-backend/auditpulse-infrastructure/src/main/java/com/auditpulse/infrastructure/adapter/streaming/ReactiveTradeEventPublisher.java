package com.auditpulse.infrastructure.adapter.streaming;

import com.auditpulse.domain.event.DomainEvent;
import com.auditpulse.domain.event.DuplicateTradeEvent;
import com.auditpulse.domain.event.SequenceGapDetectedEvent;
import com.auditpulse.domain.event.TradeIngestedEvent;
import com.auditpulse.domain.model.DeadLetter;
import com.auditpulse.domain.model.ProductPair;
import com.auditpulse.domain.model.TradeMatch;
import com.auditpulse.domain.port.TradeEventPublisherPort;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

/**
 * High-throughput reactive event publisher using Project Reactor multicast Sinks.
 */
public class ReactiveTradeEventPublisher implements TradeEventPublisherPort {

    private final Sinks.Many<TradeMatch> tradeSink = Sinks.many()
            .multicast()
            .onBackpressureBuffer(20_000, false);

    private final Sinks.Many<DomainEvent> anomalySink = Sinks.many()
            .multicast()
            .onBackpressureBuffer(5_000, false);

    @Override
    public void publish(DomainEvent event) {
        if (event == null) return;

        switch (event) {
            case TradeIngestedEvent ingested -> tradeSink.tryEmitNext(ingested.trade());
            case SequenceGapDetectedEvent gap -> anomalySink.tryEmitNext(gap);
            case DuplicateTradeEvent dup -> anomalySink.tryEmitNext(dup);
        }
    }

    public Flux<TradeMatch> getTradeStream() {
        return tradeSink.asFlux();
    }

    public Flux<TradeMatch> getTradeStream(ProductPair pair) {
        return tradeSink.asFlux().filter(t -> t.productPair().equals(pair));
    }

    public Flux<DomainEvent> getAnomalyStream() {
        return anomalySink.asFlux();
    }
}
