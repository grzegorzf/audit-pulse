package com.auditpulse.infrastructure.serialization;

import com.auditpulse.application.dto.IngestionCommand;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

/**
 * High-performance parser utilizing Java 25 Record Patterns and Switch Expressions
 * to deserialize polymorphic WebSocket frames.
 */
public class CoinbaseMessageParser {

    private final ObjectMapper objectMapper;

    public CoinbaseMessageParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public CoinbaseMessage parse(String payload) {
        if (payload == null || payload.isBlank()) {
            return new CoinbaseMessage.CoinbaseUnknown("empty payload");
        }

        try {
            JsonNode node = objectMapper.readTree(payload);
            String type = node.path("type").asText("");

            return switch (type) {
                case "match", "last_match" -> {
                    long tradeId = node.path("trade_id").asLong(0L);
                    long sequence = node.path("sequence").asLong(-1L);
                    String priceStr = node.path("price").asText("0");
                    String sizeStr = node.path("size").asText("0");
                    String side = node.path("side").asText("").toUpperCase();
                    String timeStr = node.path("time").asText("");
                    String productId = node.path("product_id").asText("");

                    Instant time = timeStr.isBlank() ? Instant.now() : Instant.parse(timeStr);
                    yield new CoinbaseMessage.CoinbaseMatch(
                            tradeId,
                            sequence,
                            new BigDecimal(priceStr),
                            new BigDecimal(sizeStr),
                            side,
                            time,
                            productId
                    );
                }
                case "heartbeat" -> {
                    long sequence = node.path("sequence").asLong(-1L);
                    String timeStr = node.path("time").asText("");
                    String productId = node.path("product_id").asText("");
                    Instant time = timeStr.isBlank() ? Instant.now() : Instant.parse(timeStr);
                    yield new CoinbaseMessage.CoinbaseHeartbeat(sequence, time, productId);
                }
                case "error" -> {
                    String message = node.path("message").asText("Unknown error");
                    String reason = node.path("reason").asText("");
                    yield new CoinbaseMessage.CoinbaseError(message, reason);
                }
                default -> new CoinbaseMessage.CoinbaseUnknown(payload);
            };
        } catch (Exception e) {
            return new CoinbaseMessage.CoinbaseUnknown(payload);
        }
    }

    /**
     * Converts a polymorphic CoinbaseMessage into an IngestionCommand using Java 25 Record Patterns.
     */
    public Optional<IngestionCommand> toIngestionCommand(CoinbaseMessage message, String rawPayload) {
        return switch (message) {
            case CoinbaseMessage.CoinbaseMatch m -> {
                // On Coinbase Exchange WebSocket, trade_id is the monotonic match sequence (N, N+1, N+2...)
                // Order-book 'sequence' jumps on non-trade events (limit orders/cancels)
                long monotonicSequence = m.tradeId() > 0 ? m.tradeId() : m.sequence();
                yield Optional.of(new IngestionCommand(
                        m.tradeId(),
                        monotonicSequence,
                        m.price(),
                        m.size(),
                        m.side(),
                        m.time(),
                        m.productId(),
                        rawPayload
                ));
            }
            case CoinbaseMessage.CoinbaseHeartbeat ignored -> Optional.empty();
            case CoinbaseMessage.CoinbaseError ignored -> Optional.empty();
            case CoinbaseMessage.CoinbaseUnknown ignored -> Optional.empty();
        };
    }
}
