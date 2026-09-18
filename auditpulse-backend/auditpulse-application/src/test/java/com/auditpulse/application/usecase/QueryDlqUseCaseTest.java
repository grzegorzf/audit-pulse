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

class QueryDlqUseCaseTest {

    private final List<DeadLetter> storage = new ArrayList<>();
    private DlqRepositoryPort repo;
    private QueryDlqUseCase useCase;

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
                return storage.stream().skip(offset).limit(limit).toList();
            }

            @Override
            public List<DeadLetter> findByProduct(ProductPair productPair, int offset, int limit) {
                return storage.stream()
                        .filter(d -> d.productPair().equals(productPair))
                        .skip(offset)
                        .limit(limit)
                        .toList();
            }

            @Override
            public Optional<DeadLetter> findById(String id) {
                return storage.stream().filter(d -> d.id().equals(id)).findFirst();
            }

            @Override
            public boolean markReconciled(String id) {
                return true;
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

        useCase = new QueryDlqUseCase(repo);
    }

    @Test
    @DisplayName("Query all returns paginated results and total counts")
    void queryAllPaginated() {
        for (int i = 0; i < 5; i++) {
            repo.save(DeadLetter.create(
                    (long) (1000 + i),
                    ProductPair.of("BTC-USD"),
                    (long) (50 + i),
                    (long) (45 + i),
                    DeadLetterReason.GAP_DETECTED,
                    "{}"
            ));
        }

        List<DeadLetter> page = useCase.query(null, 1, 2);
        assertThat(page).hasSize(2);
        assertThat(useCase.totalCount()).isEqualTo(5);
        assertThat(useCase.unreconciledCount()).isEqualTo(5);
    }

    @Test
    @DisplayName("Query with product filter returns only matching product items")
    void queryWithProductFilter() {
        repo.save(DeadLetter.create(1001L, ProductPair.of("BTC-USD"), 50L, 45L, DeadLetterReason.GAP_DETECTED, "{}"));
        repo.save(DeadLetter.create(1002L, ProductPair.of("ETH-USD"), 80L, 75L, DeadLetterReason.GAP_DETECTED, "{}"));

        List<DeadLetter> btc = useCase.query("BTC-USD", 0, 10);
        assertThat(btc).hasSize(1);
        assertThat(btc.get(0).productPair().value()).isEqualTo("BTC-USD");

        List<DeadLetter> eth = useCase.query("ETH-USD", 0, 10);
        assertThat(eth).hasSize(1);
        assertThat(eth.get(0).productPair().value()).isEqualTo("ETH-USD");

        List<DeadLetter> invalid = useCase.query("INVALID-PAIR", 0, 10);
        assertThat(invalid).isEmpty();
    }
}
