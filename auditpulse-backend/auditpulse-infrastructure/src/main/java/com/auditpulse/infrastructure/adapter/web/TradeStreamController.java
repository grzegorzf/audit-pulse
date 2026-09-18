package com.auditpulse.infrastructure.adapter.web;

import com.auditpulse.domain.model.ProductPair;
import com.auditpulse.domain.model.TradeMatch;
import com.auditpulse.infrastructure.adapter.streaming.ReactiveTradeEventPublisher;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

/**
 * Reactive SSE Controller streaming live market trades to terminal clients.
 */
@RestController
@RequestMapping("/api/v1/stream")
@CrossOrigin(origins = "*")
public class TradeStreamController {

    private final ReactiveTradeEventPublisher eventPublisher;

    public TradeStreamController(ReactiveTradeEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    @GetMapping(value = "/trades", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<TradeMatch>> streamTrades(
            @RequestParam(required = false) String product
    ) {
        Flux<TradeMatch> stream;
        if (product != null && !product.isBlank()) {
            try {
                ProductPair pair = ProductPair.of(product);
                stream = eventPublisher.getTradeStream(pair);
            } catch (Exception e) {
                stream = eventPublisher.getTradeStream();
            }
        } else {
            stream = eventPublisher.getTradeStream();
        }

        return stream.map(trade -> ServerSentEvent.<TradeMatch>builder()
                .id(String.valueOf(trade.tradeId()))
                .event("trade")
                .data(trade)
                .build());
    }
}
