package com.auditpulse.infrastructure.adapter.repository;

import com.auditpulse.domain.model.DeadLetter;
import com.auditpulse.domain.model.ProductPair;
import com.auditpulse.domain.port.DlqRepositoryPort;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Thread-safe, bounded in-memory repository for quarantined dead letters.
 */
public class InMemoryDlqRepository implements DlqRepositoryPort {

    private static final int MAX_CAPACITY = 50_000;

    private final Map<String, DeadLetter> store = new ConcurrentHashMap<>();
    private final ConcurrentLinkedDeque<String> chronologicalIds = new ConcurrentLinkedDeque<>();
    private final AtomicLong unreconciledCount = new AtomicLong(0);

    @Override
    public void save(DeadLetter deadLetter) {
        if (deadLetter == null) return;

        // Evict oldest if capacity exceeded
        if (store.size() >= MAX_CAPACITY) {
            String oldestId = chronologicalIds.pollFirst();
            if (oldestId != null) {
                DeadLetter removed = store.remove(oldestId);
                if (removed != null && !removed.reconciled()) {
                    unreconciledCount.decrementAndGet();
                }
            }
        }

        store.put(deadLetter.id(), deadLetter);
        chronologicalIds.addLast(deadLetter.id());
        if (!deadLetter.reconciled()) {
            unreconciledCount.incrementAndGet();
        }
    }

    @Override
    public List<DeadLetter> findAll(int offset, int limit) {
        List<String> ids = new ArrayList<>(chronologicalIds);
        int total = ids.size();
        if (total == 0 || offset >= total) {
            return Collections.emptyList();
        }
        List<DeadLetter> result = new ArrayList<>();
        int start = total - 1 - offset;
        int count = 0;

        for (int i = start; i >= 0 && count < limit; i--) {
            DeadLetter dl = store.get(ids.get(i));
            if (dl != null) {
                result.add(dl);
                count++;
            }
        }
        return result;
    }

    @Override
    public List<DeadLetter> findByProduct(ProductPair productPair, int offset, int limit) {
        List<String> ids = new ArrayList<>(chronologicalIds);
        if (ids.isEmpty()) {
            return Collections.emptyList();
        }
        List<DeadLetter> result = new ArrayList<>();
        int skipped = 0;

        for (int i = ids.size() - 1; i >= 0 && result.size() < limit; i--) {
            DeadLetter dl = store.get(ids.get(i));
            if (dl != null && dl.productPair().equals(productPair)) {
                if (skipped < offset) {
                    skipped++;
                } else {
                    result.add(dl);
                }
            }
        }
        return result;
    }

    @Override
    public Optional<DeadLetter> findById(String id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public boolean markReconciled(String id) {
        DeadLetter existing = store.get(id);
        if (existing != null && !existing.reconciled()) {
            DeadLetter updated = existing.markReconciled();
            store.put(id, updated);
            unreconciledCount.decrementAndGet();
            return true;
        }
        return false;
    }

    @Override
    public long countUnreconciled() {
        return Math.max(0, unreconciledCount.get());
    }

    @Override
    public long totalCount() {
        return store.size();
    }
}
