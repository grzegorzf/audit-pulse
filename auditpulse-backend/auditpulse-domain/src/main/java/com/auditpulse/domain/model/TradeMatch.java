package com.auditpulse.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

/**
 * TradeMatch Entity representing an executed market match from the exchange.
 */
public record TradeMatch(
        long tradeId,
        long sequence,
        BigDecimal price,
        BigDecimal size,
        TradeSide side,
        Instant timestamp,
        ProductPair productPair
) {
    public TradeMatch {
        Objects.requireNonNull(price, "price cannot be null");
        Objects.requireNonNull(size, "size cannot be null");
        Objects.requireNonNull(side, "side cannot be null");
        Objects.requireNonNull(timestamp, "timestamp cannot be null");
        Objects.requireNonNull(productPair, "productPair cannot be null");

        if (price.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Trade price must be positive: " + price);
        }
        if (size.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Trade size must be positive: " + size);
        }
    }

    public BigDecimal totalValue() {
        return price.multiply(size);
    }
}
