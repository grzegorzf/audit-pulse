package com.auditpulse.domain.port;

import com.auditpulse.domain.model.DeadLetter;
import com.auditpulse.domain.model.ProductPair;

import java.util.List;
import java.util.Optional;

/**
 * Outbound port for Dead-Letter Queue persistence and retrieval.
 */
public interface DlqRepositoryPort {

    void save(DeadLetter deadLetter);

    List<DeadLetter> findAll(int offset, int limit);

    List<DeadLetter> findByProduct(ProductPair productPair, int offset, int limit);

    Optional<DeadLetter> findById(String id);

    boolean markReconciled(String id);

    long countUnreconciled();

    long totalCount();
}
