package com.auditpulse.infrastructure.adapter.web;

import com.auditpulse.application.dto.MetricsSnapshot;
import com.auditpulse.application.usecase.StreamMetricsUseCase;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;

/**
 * Real-time telemetry controller emitting sliding-window metrics every 1000ms.
 */
@RestController
@CrossOrigin(origins = "*")
public class MetricsStreamController {

    private final StreamMetricsUseCase streamMetricsUseCase;

    public MetricsStreamController(StreamMetricsUseCase streamMetricsUseCase) {
        this.streamMetricsUseCase = streamMetricsUseCase;
    }

    @GetMapping(value = "/api/v1/stream/metrics", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<MetricsSnapshot>> streamMetrics() {
        return Flux.interval(Duration.ofMillis(1000))
                .map(tick -> ServerSentEvent.<MetricsSnapshot>builder()
                        .event("metrics")
                        .data(streamMetricsUseCase.getSnapshot())
                        .build());
    }

    @GetMapping("/api/v1/metrics")
    public Mono<ResponseEntity<MetricsSnapshot>> getMetrics() {
        return Mono.just(ResponseEntity.ok(streamMetricsUseCase.getSnapshot()));
    }
}
