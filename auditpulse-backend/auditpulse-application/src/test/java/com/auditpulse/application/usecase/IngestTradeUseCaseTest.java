package com.auditpulse.application.usecase;

import com.auditpulse.application.dto.IngestionCommand;
import com.auditpulse.domain.event.DomainEvent;
import com.auditpulse.domain.event.SequenceGapDetectedEvent;
import com.auditpulse.domain.event.TradeIngestedEvent;
import com.auditpulse.domain.model.DeadLetter;
import com.auditpulse.domain.model.DeadLetterReason;
import com.auditpulse.domain.model.ProductPair;
import com.auditpulse.domain.port.DlqRepositoryPort;
import com.auditpulse.domain.port.MetricsPort;
import com.auditpulse.domain.port.TradeEventPublisherPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class IngestTradeUseCaseTest {

    private final List<DomainEvent> publishedEvents = new ArrayList<>();
    private final List<DeadLetter> savedDeadLetters = new ArrayList<>();

    private IngestTradeUseCase ingestTradeUseCase;

    @BeforeEach
    void setUp() {
        publishedEvents.clear();
        savedDeadLetters.clear();

        TradeEventPublisherPort publisher = publishedEvents::add;

        DlqRepositoryPort dlqRepo = new DlqRepositoryPort() {
            @Override
            public void save(DeadLetter deadLetter) {
                savedDeadLetters.add(deadLetter);
            }

            @Override
            public List<DeadLetter> findAll(int offset, int limit) {
                return savedDeadLetters;
            }

            @Override
            public List<DeadLetter> findByProduct(ProductPair productPair, int offset, int limit) {
                return savedDeadLetters.stream().filter(d -> d.productPair().equals(productPair)).toList();
            }

            @Override
            public Optional<DeadLetter> findById(String id) {
                return savedDeadLetters.stream().filter(d -> d.id().equals(id)).findFirst();
            }

            @Override
            public boolean markReconciled(String id) {
                return true;
            }

            @Override
            public long countUnreconciled() {
                return savedDeadLetters.stream().filter(d -> !d.reconciled()).count();
            }

            @Override
            public long totalCount() {
                return savedDeadLetters.size();
            }
        };

        MetricsPort metrics = new MetricsPort() {
            @Override
            public void recordTrade(com.auditpulse.domain.model.TradeMatch trade) {}
            @Override
            public void recordGap(SequenceGapDetectedEvent gap) {}
            @Override
            public void recordDeadLetter(DeadLetter deadLetter) {}
        };

        ingestTradeUseCase = new IngestTradeUseCase(publisher, dlqRepo, metrics);
    }

    @Test
    @DisplayName("Valid sequential command should publish TradeIngestedEvent without DLQ")
    void validSequentialCommandIngestion() {
        IngestionCommand cmd = new IngestionCommand(
                1001L,
                50000L,
                new BigDecimal("60120.00"),
                new BigDecimal("0.5"),
                "BUY",
                Instant.now(),
                "BTC-USD",
                "{\"type\":\"match\"}"
        );

        ingestTradeUseCase.ingest(cmd);

        assertThat(publishedEvents).hasSize(1);
        assertThat(publishedEvents.get(0)).isInstanceOf(TradeIngestedEvent.class);
        assertThat(savedDeadLetters).isEmpty();
    }

    @Test
    @DisplayName("Sequence gap should persist DeadLetter and publish SequenceGapDetectedEvent")
    void sequenceGapDetectedAndQuarantined() {
        // Initial trade (50000)
        ingestTradeUseCase.ingest(new IngestionCommand(
                1001L, 50000L, new BigDecimal("60000.00"), new BigDecimal("0.1"), "BUY", Instant.now(), "BTC-USD", "{}"
        ));

        // Gap trade (50005) skips 50001, 50002, 50003, 50004
        ingestTradeUseCase.ingest(new IngestionCommand(
                1005L, 50005L, new BigDecimal("60050.00"), new BigDecimal("0.2"), "SELL", Instant.now(), "BTC-USD", "{\"raw\":\"gap\"}"
        ));

        assertThat(publishedEvents).hasSize(2);
        assertThat(publishedEvents.get(1)).isInstanceOf(SequenceGapDetectedEvent.class);

        assertThat(savedDeadLetters).hasSize(1);
        DeadLetter dlq = savedDeadLetters.get(0);
        assertThat(dlq.reason()).isEqualTo(DeadLetterReason.GAP_DETECTED);
        assertThat(dlq.expectedSequence()).isEqualTo(50001L);
        assertThat(dlq.receivedSequence()).isEqualTo(50005L);
        assertThat(dlq.productPair().value()).isEqualTo("BTC-USD");
    }

    @Test
    @DisplayName("Invalid payload format should trigger schema violation DLQ")
    void schemaViolationTriggersDeadLetter() {
        // Negative price invalid
        IngestionCommand invalidCmd = new IngestionCommand(
                1001L, 50000L, new BigDecimal("-100.00"), new BigDecimal("0.1"), "BUY", Instant.now(), "BTC-USD", "{}"
        );

        ingestTradeUseCase.ingest(invalidCmd);

        assertThat(savedDeadLetters).hasSize(1);
        assertThat(savedDeadLetters.get(0).reason()).isEqualTo(DeadLetterReason.SCHEMA_VIOLATION);
    }
}
