package com.auditpulse.infrastructure.adapter.repository;

import com.auditpulse.domain.model.DeadLetter;
import com.auditpulse.domain.model.DeadLetterReason;
import com.auditpulse.domain.model.ProductPair;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class InMemoryDlqRepositoryTest {

    private InMemoryDlqRepository repository;

    @BeforeEach
    void setUp() {
        repository = new InMemoryDlqRepository();
    }

    @Test
    void findAll_whenEmpty_returnsEmptyList() {
        List<DeadLetter> result = repository.findAll(0, 50);
        assertThat(result).isEmpty();
    }

    @Test
    void findByProduct_whenEmpty_returnsEmptyList() {
        List<DeadLetter> result = repository.findByProduct(ProductPair.of("BTC-USD"), 0, 50);
        assertThat(result).isEmpty();
    }

    @Test
    void saveAndFindAll_returnsNewestFirst() {
        DeadLetter dl1 = DeadLetter.create(1L, ProductPair.of("BTC-USD"), 100L, 101L, DeadLetterReason.GAP_DETECTED, "raw1");
        DeadLetter dl2 = DeadLetter.create(2L, ProductPair.of("BTC-USD"), 102L, 103L, DeadLetterReason.GAP_DETECTED, "raw2");

        repository.save(dl1);
        repository.save(dl2);

        List<DeadLetter> all = repository.findAll(0, 10);
        assertThat(all).hasSize(2);
        assertThat(all.get(0).id()).isEqualTo(dl2.id());
        assertThat(all.get(1).id()).isEqualTo(dl1.id());
    }
}
