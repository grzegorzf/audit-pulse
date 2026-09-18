package com.auditpulse.infrastructure.serialization;

import com.auditpulse.application.dto.IngestionCommand;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class CoinbaseMessageParserTest {

    private CoinbaseMessageParser parser;

    @BeforeEach
    void setUp() {
        parser = new CoinbaseMessageParser(new ObjectMapper());
    }

    @Test
    @DisplayName("Should parse match frame using Java 25 record pattern matching")
    void parseMatchFrame() {
        String json = """
                {
                  "type": "match",
                  "trade_id": 987654,
                  "sequence": 50001,
                  "maker_order_id": "m-123",
                  "taker_order_id": "t-456",
                  "time": "2026-03-24T12:00:00.000000Z",
                  "product_id": "BTC-USD",
                  "size": "0.01500000",
                  "price": "67250.80",
                  "side": "buy"
                }
                """;

        CoinbaseMessage message = parser.parse(json);

        assertThat(message).isInstanceOf(CoinbaseMessage.CoinbaseMatch.class);
        if (message instanceof CoinbaseMessage.CoinbaseMatch match) {
            assertThat(match.tradeId()).isEqualTo(987654L);
            assertThat(match.sequence()).isEqualTo(50001L);
            assertThat(match.price()).isEqualByComparingTo(new BigDecimal("67250.80"));
            assertThat(match.size()).isEqualByComparingTo(new BigDecimal("0.015"));
            assertThat(match.side()).isEqualTo("BUY");
            assertThat(match.productId()).isEqualTo("BTC-USD");
        }

        Optional<IngestionCommand> cmdOpt = parser.toIngestionCommand(message, json);
        assertThat(cmdOpt).isPresent();
        IngestionCommand cmd = cmdOpt.get();
        assertThat(cmd.tradeId()).isEqualTo(987654L);
        assertThat(cmd.product()).isEqualTo("BTC-USD");
        assertThat(cmd.side()).isEqualTo("BUY");
    }

    @Test
    @DisplayName("Should parse heartbeat frame into CoinbaseHeartbeat")
    void parseHeartbeatFrame() {
        String json = """
                {
                  "type": "heartbeat",
                  "last_trade_id": 987654,
                  "product_id": "BTC-USD",
                  "sequence": 50002,
                  "time": "2026-03-24T12:00:01.000000Z"
                }
                """;

        CoinbaseMessage message = parser.parse(json);
        assertThat(message).isInstanceOf(CoinbaseMessage.CoinbaseHeartbeat.class);
        Optional<IngestionCommand> cmdOpt = parser.toIngestionCommand(message, json);
        assertThat(cmdOpt).isEmpty();
    }

    @Test
    @DisplayName("Should handle malformed or unexpected frame as CoinbaseUnknown")
    void parseMalformedFrame() {
        String json = "not valid json";
        CoinbaseMessage message = parser.parse(json);
        assertThat(message).isInstanceOf(CoinbaseMessage.CoinbaseUnknown.class);
    }
}
