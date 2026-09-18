package com.auditpulse.application.usecase;

import com.auditpulse.domain.model.DeadLetter;
import com.auditpulse.domain.port.DlqRepositoryPort;

import java.util.Objects;
import java.util.Optional;

/**
 * ReconcileDlqUseCase: Simulates or marks a quarantined entry as reconciled.
 */
public class ReconcileDlqUseCase {

    private final DlqRepositoryPort dlqRepositoryPort;

    public ReconcileDlqUseCase(DlqRepositoryPort dlqRepositoryPort) {
        this.dlqRepositoryPort = Objects.requireNonNull(dlqRepositoryPort, "dlqRepositoryPort cannot be null");
    }

    public Optional<DeadLetter> reconcile(String id) {
        Objects.requireNonNull(id, "id cannot be null");
        boolean updated = dlqRepositoryPort.markReconciled(id);
        if (updated) {
            return dlqRepositoryPort.findById(id);
        }
        return Optional.empty();
    }
}
