package com.auditpulse.infrastructure.adapter.web;

import com.auditpulse.application.usecase.QueryDlqUseCase;
import com.auditpulse.application.usecase.ReconcileDlqUseCase;
import com.auditpulse.domain.event.DomainEvent;
import com.auditpulse.domain.model.DeadLetter;
import com.auditpulse.infrastructure.adapter.streaming.ReactiveTradeEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

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

    public DlqController(
            ReactiveTradeEventPublisher eventPublisher,
            QueryDlqUseCase queryDlqUseCase,
            ReconcileDlqUseCase reconcileDlqUseCase
    ) {
        this.eventPublisher = eventPublisher;
        this.queryDlqUseCase = queryDlqUseCase;
        this.reconcileDlqUseCase = reconcileDlqUseCase;
    }

    /**
     * SSE Stream emitting quarantined sequence anomaly events in real time.
     */
    @GetMapping(value = "/api/v1/stream/dlq", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<DomainEvent>> streamDlq() {
        return eventPublisher.getAnomalyStream()
                .map(event -> ServerSentEvent.<DomainEvent>builder()
                        .event("anomaly")
                        .data(event)
                        .build());
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
}
