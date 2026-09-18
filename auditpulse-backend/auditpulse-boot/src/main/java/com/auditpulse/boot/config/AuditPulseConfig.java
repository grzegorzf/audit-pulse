package com.auditpulse.boot.config;

import com.auditpulse.application.usecase.IngestTradeUseCase;
import com.auditpulse.application.usecase.QueryDlqUseCase;
import com.auditpulse.application.usecase.ReconcileDlqUseCase;
import com.auditpulse.application.usecase.StreamMetricsUseCase;
import com.auditpulse.domain.port.DlqRepositoryPort;
import com.auditpulse.domain.port.MetricsPort;
import com.auditpulse.domain.port.TradeEventPublisherPort;
import com.auditpulse.infrastructure.adapter.repository.InMemoryDlqRepository;
import com.auditpulse.infrastructure.adapter.ringbuffer.RingBufferMetricsAggregator;
import com.auditpulse.infrastructure.adapter.streaming.ReactiveTradeEventPublisher;
import com.auditpulse.infrastructure.adapter.websocket.CoinbaseWebSocketClient;
import com.auditpulse.infrastructure.serialization.CoinbaseMessageParser;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AuditPulseConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        return mapper;
    }

    @Bean
    public CoinbaseMessageParser coinbaseMessageParser(ObjectMapper objectMapper) {
        return new CoinbaseMessageParser(objectMapper);
    }

    @Bean
    public ReactiveTradeEventPublisher reactiveTradeEventPublisher() {
        return new ReactiveTradeEventPublisher();
    }

    @Bean
    public InMemoryDlqRepository inMemoryDlqRepository() {
        return new InMemoryDlqRepository();
    }

    @Bean
    public RingBufferMetricsAggregator ringBufferMetricsAggregator() {
        return new RingBufferMetricsAggregator();
    }

    @Bean
    public IngestTradeUseCase ingestTradeUseCase(
            TradeEventPublisherPort publisher,
            DlqRepositoryPort dlqRepository,
            MetricsPort metricsPort
    ) {
        return new IngestTradeUseCase(publisher, dlqRepository, metricsPort);
    }

    @Bean
    public QueryDlqUseCase queryDlqUseCase(DlqRepositoryPort dlqRepository) {
        return new QueryDlqUseCase(dlqRepository);
    }

    @Bean
    public ReconcileDlqUseCase reconcileDlqUseCase(DlqRepositoryPort dlqRepository) {
        return new ReconcileDlqUseCase(dlqRepository);
    }

    @Bean
    public StreamMetricsUseCase streamMetricsUseCase(RingBufferMetricsAggregator aggregator) {
        return new StreamMetricsUseCase(aggregator);
    }

    @Bean
    public CoinbaseWebSocketClient coinbaseWebSocketClient(
            @Value("${coinbase.websocket.uri:wss://ws-feed.exchange.coinbase.com}") String wsUri,
            IngestTradeUseCase ingestTradeUseCase,
            CoinbaseMessageParser parser
    ) {
        return new CoinbaseWebSocketClient(wsUri, ingestTradeUseCase, parser);
    }

    @Bean
    public CommandLineRunner startWebSocket(
            CoinbaseWebSocketClient client,
            @Value("${coinbase.websocket.auto-start:true}") boolean autoStart
    ) {
        return args -> {
            if (autoStart) {
                client.start();
            }
        };
    }
}
