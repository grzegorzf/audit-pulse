import test from 'node:test';
import assert from 'node:assert/strict';

import { useStreamStore } from '../../lib/store';
import { DeadLetter, MetricsSnapshot, TradeMatch } from '../../lib/types';

test('StreamStore - initial state and target endpoint defaults', () => {
  const state = useStreamStore.getState();
  assert.ok(state.trades);
  assert.equal(state.trades.length, 0);
  assert.equal(state.isStreamPaused, false);
  assert.equal(state.selectedProduct, 'BTC-USD');
});

test('StreamStore - batch trade ingestion and product filtering', () => {
  const store = useStreamStore.getState();
  store.clearTrades();
  store.setSelectedProduct('BTC-USD');

  const btcTrade: TradeMatch = {
    tradeId: 1,
    sequence: 500,
    price: '67000.00',
    size: '0.1',
    side: 'BUY',
    timestamp: new Date().toISOString(),
    productPair: 'BTC-USD',
  };

  const ethTrade: TradeMatch = {
    tradeId: 2,
    sequence: 501,
    price: '3400.00',
    size: '1.0',
    side: 'SELL',
    timestamp: new Date().toISOString(),
    productPair: 'ETH-USD',
  };

  // When selectedProduct is BTC-USD, only BTC-USD trade is stored
  store.addTradesBatch([btcTrade, ethTrade]);
  assert.equal(useStreamStore.getState().trades.length, 1);
  assert.equal(useStreamStore.getState().trades[0].tradeId, 1);

  // Switch to ALL
  store.setSelectedProduct('ALL');
  store.addTradesBatch([btcTrade, ethTrade]);
  assert.equal(useStreamStore.getState().trades.length, 3);
});

test('StreamStore - pause stream blocks additions', () => {
  const store = useStreamStore.getState();
  store.clearTrades();
  store.togglePauseStream(); // paused = true
  assert.equal(useStreamStore.getState().isStreamPaused, true);

  const trade: TradeMatch = {
    tradeId: 10,
    sequence: 600,
    price: '68000.00',
    size: '0.5',
    side: 'BUY',
    timestamp: new Date().toISOString(),
    productPair: 'BTC-USD',
  };

  store.addTradesBatch([trade]);
  assert.equal(useStreamStore.getState().trades.length, 0);

  store.togglePauseStream(); // resume
  assert.equal(useStreamStore.getState().isStreamPaused, false);
});

test('StreamStore - dead letter queue ingestion, deduplication, and reconciliation', () => {
  const store = useStreamStore.getState();
  store.setDlqItems([]);

  const dlq1: DeadLetter = {
    id: 'dlq-test-1',
    tradeId: 5001,
    productPair: 'BTC-USD',
    receivedSequence: 205,
    expectedSequence: 200,
    reason: 'GAP_DETECTED',
    rawPayload: '{}',
    timestamp: new Date().toISOString(),
    reconciled: false,
  };

  store.addDeadLetter(dlq1);
  assert.equal(useStreamStore.getState().dlqItems.length, 1);

  // Duplicate DLQ insertion with same id is ignored
  store.addDeadLetter(dlq1);
  assert.equal(useStreamStore.getState().dlqItems.length, 1);

  // Reconcile item
  store.reconcileDeadLetter('dlq-test-1');
  const reconciledItem = useStreamStore.getState().dlqItems.find(d => d.id === 'dlq-test-1');
  assert.ok(reconciledItem);
  assert.equal(reconciledItem?.reconciled, true);
});

test('StreamStore - metrics telemetry and sliding 60-slot history', () => {
  const store = useStreamStore.getState();

  const snapshot: MetricsSnapshot = {
    eventsPerSecond: 150,
    totalProcessed: 12000,
    quarantinedCount: 3,
    lastSequence: 89000,
    latencyMs: 5,
  };

  store.setMetrics(snapshot);
  const state = useStreamStore.getState();
  assert.equal(state.metrics.eventsPerSecond, 150);
  assert.equal(state.metrics.totalProcessed, 12000);
  assert.ok(state.metricsHistory.length > 0);
  assert.equal(state.metricsHistory[state.metricsHistory.length - 1].eventsPerSecond, 150);
});

test('StreamStore - feed target transitions', () => {
  const store = useStreamStore.getState();

  store.setTargetEndpoint('MOCK_ENGINE');
  assert.equal(useStreamStore.getState().targetEndpoint, 'MOCK_ENGINE');

  store.setTargetEndpoint('BACKEND_LOCAL');
  assert.equal(useStreamStore.getState().targetEndpoint, 'BACKEND_LOCAL');

  store.setTargetEndpoint('CLOUD_JVM');
  assert.equal(useStreamStore.getState().targetEndpoint, 'CLOUD_JVM');
});
