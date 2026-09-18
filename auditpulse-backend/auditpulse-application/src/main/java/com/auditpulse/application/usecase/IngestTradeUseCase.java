package com.auditpulse.application.usecase;

import com.auditpulse.application.dto.IngestionCommand;
import com.auditpulse.domain.event.DomainEvent;
import com.auditpulse.domain.event.DuplicateTradeEvent;
import com.auditpulse.domain.event.SequenceGapDetectedEvent;
import com.auditpulse.domain.event.TradeIngestedEvent;
import com.auditpulse.domain.model.DeadLetter;
import com.auditpulse.domain.model.DeadLetterReason;
import com.auditpulse.domain.model.ProductPair;
import com.auditpulse.domain.model.SequenceTracker;
import com.auditpulse.domain.model.TradeMatch;
import com.auditpulse.domain.model.TradeSide;
import com.auditpulse.domain.port.DlqRepositoryPort;
import com.auditpulse.domain.port.MetricsPort;
import com.auditpulse.domain.port.TradeEventPublisherPort;

import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/**
 * IngestTradeUseCase: Validates incoming payload, updates the SequenceTracker aggregate,
 * emits domain events to live stream port or DLQ port.
 */
public class IngestTradeUseCase {

    private final TradeEventPublisherPort eventPublisherPort;
    private final DlqRepositoryPort dlqRepositoryPort;
    private final MetricsPort metricsPort;
    private final Map<ProductPair, SequenceTracker> sequenceTrackers = new ConcurrentHashMap<>();

    public IngestTradeUseCase(
            TradeEventPublisherPort eventPublisherPort,
            DlqRepositoryPort dlqRepositoryPort,
            MetricsPort metricsPort
    ) {
        this.eventPublisherPort = Objects.requireNonNull(eventPublisherPort, "eventPublisherPort cannot be null");
        this.dlqRepositoryPort = Objects.requireNonNull(dlqRepositoryPort, "dlqRepositoryPort cannot be null");
        this.metricsPort = Objects.requireNonNull(metricsPort, "metricsPort cannot be null");
    }

    public void ingest(IngestionCommand command) {
        Objects.requireNonNull(command, "command cannot be null");

        // 1. Validate Product Pair
        ProductPair pair;
        try {
            pair = ProductPair.of(command.product());
        } catch (Exception ex) {
            handleSchemaViolation(command, "Invalid product pair: " + command.product());
            return;
        }

        // 2. Validate and build TradeMatch
        TradeMatch trade;
        try {
            trade = new TradeMatch(
                    command.tradeId(),
                    command.sequence(),
                    command.price(),
                    command.size(),
                    TradeSide.fromString(command.side()),
                    command.timestamp(),
                    pair
            );
        } catch (Exception ex) {
            handleSchemaViolation(command, "Payload validation error: " + ex.getMessage());
            return;
        }

        // 3. Evaluate Sequence Tracker Aggregate
        SequenceTracker tracker = sequenceTrackers.computeIfAbsent(pair, SequenceTracker::new);
        DomainEvent event = tracker.evaluate(trade);

        // 4. Java 25 Pattern Matching on Sealed DomainEvent Hierarchy
        switch (event) {
            case TradeIngestedEvent ingested -> {
                eventPublisherPort.publish(ingested);
                metricsPort.recordTrade(ingested.trade());
            }
            case SequenceGapDetectedEvent gap -> {
                DeadLetter deadLetter = DeadLetter.create(
                        trade.tradeId(),
                        gap.productPair(),
                        gap.receivedSequence(),
                        gap.expectedSequence(),
                        DeadLetterReason.GAP_DETECTED,
                        command.rawPayload() != null ? command.rawPayload() : command.toString()
                );
                dlqRepositoryPort.save(deadLetter);
                eventPublisherPort.publish(gap);
                eventPublisherPort.publish(TradeIngestedEvent.now(trade));
                metricsPort.recordTrade(trade);
                metricsPort.recordGap(gap);
                metricsPort.recordDeadLetter(deadLetter);
            }
            case DuplicateTradeEvent dup -> {
                DeadLetter deadLetter = DeadLetter.create(
                        trade.tradeId(),
                        dup.productPair(),
                        dup.receivedSequence(),
                        dup.expectedSequence(),
                        DeadLetterReason.UNEXPECTED_PAYLOAD,
                        command.rawPayload() != null ? command.rawPayload() : command.toString()
                );
                dlqRepositoryPort.save(deadLetter);
                eventPublisherPort.publish(dup);
                metricsPort.recordDeadLetter(deadLetter);
            }
        }
    }

    private void handleSchemaViolation(IngestionCommand command, String reasonDetails) {
        ProductPair fallbackPair;
        try {
            fallbackPair = ProductPair.of(command.product());
        } catch (Exception ignored) {
            fallbackPair = ProductPair.of("UNKNOWN-USD");
        }

        DeadLetter deadLetter = DeadLetter.create(
                command.tradeId() > 0 ? command.tradeId() : null,
                fallbackPair,
                command.sequence() > 0 ? command.sequence() : null,
                null,
                DeadLetterReason.SCHEMA_VIOLATION,
                (command.rawPayload() != null ? command.rawPayload() : command.toString()) + " [" + reasonDetails + "]"
        );

        dlqRepositoryPort.save(deadLetter);
        metricsPort.recordDeadLetter(deadLetter);
    }

    public SequenceTracker getTracker(ProductPair pair) {
        return sequenceTrackers.get(pair);
    }

    public void resetAll() {
        sequenceTrackers.values().forEach(SequenceTracker::reset);
    }
}
