package com.auditpulse.infrastructure.adapter.web;

import com.auditpulse.application.dto.IngestionCommand;
import com.auditpulse.application.usecase.IngestTradeUseCase;
import com.auditpulse.application.usecase.QueryDlqUseCase;
import com.auditpulse.application.usecase.ReconcileDlqUseCase;
import com.auditpulse.domain.event.DomainEvent;
import com.auditpulse.domain.model.DeadLetter;
import com.auditpulse.domain.model.ProductPair;
import com.auditpulse.domain.model.SequenceTracker;
import com.auditpulse.infrastructure.adapter.streaming.ReactiveTradeEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Controller for Dead-Letter Queue inspection, live anomaly SSE streaming, and reconciliation.
 */
@RestController
@CrossOrigin(origins = "*")
public class DlqController {

    private final ReactiveTradeEventPublisher eventPublisher;
    private final QueryDlqUseCase queryDlqUseCase;
    private final ReconcileDlqUseCase reconcileDlqUseCase;
    private final IngestTradeUseCase ingestTradeUseCase;

    public DlqController(
            ReactiveTradeEventPublisher eventPublisher,
            QueryDlqUseCase queryDlqUseCase,
            ReconcileDlqUseCase reconcileDlqUseCase,
            IngestTradeUseCase ingestTradeUseCase
    ) {
        this.eventPublisher = eventPublisher;
        this.queryDlqUseCase = queryDlqUseCase;
        this.reconcileDlqUseCase = reconcileDlqUseCase;
        this.ingestTradeUseCase = ingestTradeUseCase;
    }

    /**
     * SSE Stream emitting quarantined sequence anomaly events in real time.
     */
    @GetMapping(value = "/api/v1/stream/dlq", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<DomainEvent>> streamDlq() {
        Flux<ServerSentEvent<DomainEvent>> anomalyFlux = eventPublisher.getAnomalyStream()
                .map(event -> ServerSentEvent.<DomainEvent>builder()
                        .event("anomaly")
                        .data(event)
                        .build());

        ServerSentEvent<DomainEvent> initEvent = ServerSentEvent.<DomainEvent>builder()
                .comment("connected")
                .build();

        return Flux.concat(Mono.just(initEvent), anomalyFlux);
    }

    /**
     * REST endpoint to query quarantined dead letters with pagination and filters.
     */
    @GetMapping("/api/v1/dlq")
    public ResponseEntity<Map<String, Object>> getDlqItems(
            @RequestParam(required = false) String product,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "50") int limit
    ) {
        List<DeadLetter> items = queryDlqUseCase.query(product, offset, limit);
        long total = queryDlqUseCase.totalCount();
        long unreconciled = queryDlqUseCase.unreconciledCount();

        return ResponseEntity.ok(Map.of(
                "items", items,
                "totalCount", total,
                "unreconciledCount", unreconciled,
                "offset", offset,
                "limit", limit
        ));
    }

    /**
     * REST endpoint to reconcile a dead letter entry.
     */
    @PostMapping("/api/v1/dlq/{id}/reconcile")
    public ResponseEntity<DeadLetter> reconcileDlqItem(@PathVariable String id) {
        return reconcileDlqUseCase.reconcile(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    /**
     * Simulation endpoint to intentionally trigger a sequence gap through the DDD aggregate.
     */
    @PostMapping("/api/v1/simulate/gap")
    public ResponseEntity<Map<String, Object>> simulateGap(
            @RequestParam(defaultValue = "BTC-USD") String product
    ) {
        ProductPair pair = ProductPair.of(product);
        SequenceTracker tracker = ingestTradeUseCase.getTracker(pair);

        long expectedSeq;
        long gapSeq;

        if (tracker != null && tracker.nextExpectedSequence() > 0) {
            expectedSeq = tracker.nextExpectedSequence();
            gapSeq = expectedSeq + 5;
        } else {
            long baseSeq = 5492040000L + (System.currentTimeMillis() % 100000);
            ingestTradeUseCase.ingest(new IngestionCommand(
                    System.currentTimeMillis(),
                    baseSeq,
                    new BigDecimal("67420.50"),
                    new BigDecimal("0.35"),
                    "BUY",
                    Instant.now(),
                    pair.value(),
                    "{\"type\":\"match\",\"simulated\":true,\"trade_id\":" + System.currentTimeMillis() + "}"
            ));
            expectedSeq = baseSeq + 1;
            gapSeq = baseSeq + 5;
        }

        long tradeId = System.currentTimeMillis() + 1;
        ingestTradeUseCase.ingest(new IngestionCommand(
                tradeId,
                gapSeq,
                new BigDecimal("67430.00"),
                new BigDecimal("0.20"),
                "SELL",
                Instant.now(),
                pair.value(),
                "{\"type\":\"match\",\"simulated\":true,\"gap\":4,\"trade_id\":" + tradeId + "}"
        ));

        return ResponseEntity.ok(Map.of(
                "status", "GAP_INJECTED",
                "product", pair.value(),
                "expectedSequence", expectedSeq,
                "receivedSequence", gapSeq
        ));
    }
}
