package com.auditpulse.application.usecase;

import com.auditpulse.domain.model.DeadLetter;
import com.auditpulse.domain.model.DeadLetterReason;
import com.auditpulse.domain.model.ProductPair;
import com.auditpulse.domain.port.DlqRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class ReconcileDlqUseCaseTest {

    private final List<DeadLetter> storage = new ArrayList<>();
    private DlqRepositoryPort repo;
    private ReconcileDlqUseCase useCase;

    @BeforeEach
    void setUp() {
        storage.clear();
        repo = new DlqRepositoryPort() {
            @Override
            public void save(DeadLetter deadLetter) {
                storage.add(deadLetter);
            }

            @Override
            public List<DeadLetter> findAll(int offset, int limit) {
                return storage;
            }

            @Override
            public List<DeadLetter> findByProduct(ProductPair productPair, int offset, int limit) {
                return storage.stream().filter(d -> d.productPair().equals(productPair)).toList();
            }

            @Override
            public Optional<DeadLetter> findById(String id) {
                return storage.stream().filter(d -> d.id().equals(id)).findFirst();
            }

            @Override
            public boolean markReconciled(String id) {
                for (int i = 0; i < storage.size(); i++) {
                    DeadLetter d = storage.get(i);
                    if (d.id().equals(id)) {
                        storage.set(i, d.markReconciled());
                        return true;
                    }
                }
                return false;
            }

            @Override
            public long countUnreconciled() {
                return storage.stream().filter(d -> !d.reconciled()).count();
            }

            @Override
            public long totalCount() {
                return storage.size();
            }
        };

        useCase = new ReconcileDlqUseCase(repo);
    }

    @Test
    @DisplayName("Reconcile existing dead letter returns updated entity marked reconciled")
    void reconcileExistingEntity() {
        DeadLetter dl = DeadLetter.create(
                1001L,
                ProductPair.of("BTC-USD"),
                105L,
                100L,
                DeadLetterReason.GAP_DETECTED,
                "{}"
        );
        repo.save(dl);

        assertThat(dl.reconciled()).isFalse();
        Optional<DeadLetter> reconciled = useCase.reconcile(dl.id());

        assertThat(reconciled).isPresent();
        assertThat(reconciled.get().reconciled()).isTrue();
        assertThat(repo.countUnreconciled()).isZero();
    }

    @Test
    @DisplayName("Reconcile non-existing ID returns empty optional")
    void reconcileNonExistingReturnsEmpty() {
        Optional<DeadLetter> result = useCase.reconcile("non-existent-id");
        assertThat(result).isEmpty();
    }
}
