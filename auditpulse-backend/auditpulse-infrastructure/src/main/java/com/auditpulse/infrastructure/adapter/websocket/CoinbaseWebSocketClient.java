package com.auditpulse.infrastructure.adapter.websocket;

import com.auditpulse.application.dto.IngestionCommand;
import com.auditpulse.application.usecase.IngestTradeUseCase;
import com.auditpulse.infrastructure.serialization.CoinbaseMessage;
import com.auditpulse.infrastructure.serialization.CoinbaseMessageParser;
import io.netty.handler.codec.http.websocketx.TextWebSocketFrame;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.Disposable;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;

import java.net.URI;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * High-performance Reactor Netty WebSocket client connecting to the Coinbase Exchange WebSocket feed.
 */
public class CoinbaseWebSocketClient {

    private static final Logger log = LoggerFactory.getLogger(CoinbaseWebSocketClient.class);
    private static final String SUBSCRIPTION_PAYLOAD = """
            {
              "type": "subscribe",
              "product_ids": ["BTC-USD", "ETH-USD"],
              "channels": ["matches", "heartbeat"]
            }
            """;

    private final URI wsUri;
    private final IngestTradeUseCase ingestTradeUseCase;
    private final CoinbaseMessageParser parser;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private Disposable connectionDisposable;

    public CoinbaseWebSocketClient(
            String wsUri,
            IngestTradeUseCase ingestTradeUseCase,
            CoinbaseMessageParser parser
    ) {
        this.wsUri = URI.create(wsUri);
        this.ingestTradeUseCase = ingestTradeUseCase;
        this.parser = parser;
    }

    public synchronized void start() {
        if (running.compareAndSet(false, true)) {
            log.info("Starting Coinbase WebSocket Client connecting to {}", wsUri);
            connectWithRetry();
        }
    }

    private void connectWithRetry() {
        if (!running.get()) return;

        connectionDisposable = HttpClient.create()
                .websocket()
                .uri(wsUri)
                .handle((inbound, outbound) -> {
                    log.info("Connected to Coinbase WebSocket. Sending subscription...");
                    Mono<Void> sendSub = outbound.sendString(Mono.just(SUBSCRIPTION_PAYLOAD)).then();

                    Mono<Void> receiveFlux = inbound.receiveFrames()
                            .filter(frame -> frame instanceof TextWebSocketFrame)
                            .cast(TextWebSocketFrame.class)
                            .map(TextWebSocketFrame::text)
                            .doOnNext(this::processMessage)
                            .doOnError(err -> log.warn("Error in WS receive stream: {}", err.getMessage()))
                            .then();

                    return Mono.zip(sendSub, receiveFlux).then();
                })
                .retryWhen(reactor.util.retry.Retry.backoff(Long.MAX_VALUE, Duration.ofSeconds(1))
                        .maxBackoff(Duration.ofSeconds(10))
                        .doBeforeRetry(retrySignal -> log.warn("WS disconnected. Retrying connection (attempt {})...", retrySignal.totalRetries() + 1)))
                .subscribe(
                        null,
                        error -> log.error("Fatal error in WebSocket client: {}", error.getMessage(), error),
                        () -> log.info("WebSocket connection completed")
                );
    }

    private void processMessage(String rawJson) {
        try {
            CoinbaseMessage message = parser.parse(rawJson);
            Optional<IngestionCommand> commandOpt = parser.toIngestionCommand(message, rawJson);
            commandOpt.ifPresent(ingestTradeUseCase::ingest);
        } catch (Exception ex) {
            log.error("Failed to process WebSocket frame: {}", ex.getMessage());
        }
    }

    public synchronized void stop() {
        if (running.compareAndSet(true, false)) {
            log.info("Stopping Coinbase WebSocket Client");
            if (connectionDisposable != null && !connectionDisposable.isDisposed()) {
                connectionDisposable.dispose();
            }
        }
    }

    public boolean isRunning() {
        return running.get();
    }
}
