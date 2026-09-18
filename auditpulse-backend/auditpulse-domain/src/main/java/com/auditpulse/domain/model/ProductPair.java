package com.auditpulse.domain.model;

import java.util.Objects;
import java.util.regex.Pattern;

/**
 * ProductPair Value Object representing a validated market symbol (e.g. BTC-USD, ETH-USD).
 */
public record ProductPair(String value) {

    private static final Pattern PAIR_PATTERN = Pattern.compile("^[A-Z0-9]{2,10}-[A-Z0-9]{2,10}$");

    public ProductPair {
        Objects.requireNonNull(value, "Product pair cannot be null");
        String trimmed = value.trim().toUpperCase();
        if (!PAIR_PATTERN.matcher(trimmed).matches()) {
            throw new IllegalArgumentException("Invalid product pair format: " + value + ". Expected format e.g. BTC-USD");
        }
        value = trimmed;
    }

    public static ProductPair of(String value) {
        return new ProductPair(value);
    }

    @Override
    public String toString() {
        return value;
    }
}
