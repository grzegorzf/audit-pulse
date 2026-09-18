package com.auditpulse.application.usecase;

import com.auditpulse.domain.model.DeadLetter;
import com.auditpulse.domain.model.ProductPair;
import com.auditpulse.domain.port.DlqRepositoryPort;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * QueryDlqUseCase: Returns paginated and filtered dead-letter entries.
 */
public class QueryDlqUseCase {

    private final DlqRepositoryPort dlqRepositoryPort;

    public QueryDlqUseCase(DlqRepositoryPort dlqRepositoryPort) {
        this.dlqRepositoryPort = Objects.requireNonNull(dlqRepositoryPort, "dlqRepositoryPort cannot be null");
    }

    public List<DeadLetter> query(String product, int offset, int limit) {
        if (product != null && !product.isBlank()) {
            try {
                ProductPair pair = ProductPair.of(product);
                return dlqRepositoryPort.findByProduct(pair, offset, limit);
            } catch (Exception ignored) {
                return List.of();
            }
        }
        return dlqRepositoryPort.findAll(offset, limit);
    }

    public Optional<DeadLetter> findById(String id) {
        return dlqRepositoryPort.findById(id);
    }

    public long totalCount() {
        return dlqRepositoryPort.totalCount();
    }

    public long unreconciledCount() {
        return dlqRepositoryPort.countUnreconciled();
    }
}
