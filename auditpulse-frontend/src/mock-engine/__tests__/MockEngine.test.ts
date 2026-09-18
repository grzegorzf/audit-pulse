import test from 'node:test';
import assert from 'node:assert/strict';

import { MockSequenceTracker } from '../core/domain/model/MockSequenceTracker';
import { PriceMotionEngine } from '../infrastructure/generator/PriceMotionEngine';
import { InMemoryMockDlqRepository } from '../infrastructure/repository/InMemoryMockDlqRepository';
import { SlidingWindowMetricsCollector } from '../infrastructure/metrics/SlidingWindowMetricsCollector';
import { createMockDeadLetter } from '../core/domain/model/MockDeadLetter';
import { GenerateTradeTickUseCase } from '../application/usecase/GenerateTradeTickUseCase';
import { SimulateSequenceGapUseCase } from '../application/usecase/SimulateSequenceGapUseCase';
import { SimulateMalformedPayloadUseCase } from '../application/usecase/SimulateMalformedPayloadUseCase';
import { ReconcileMockDlqUseCase } from '../application/usecase/ReconcileMockDlqUseCase';
import { MockEngineFacade } from '../interface/MockEngineFacade';

test('MockSequenceTracker - monotonic sequence progression and gap detection', () => {
  const tracker = new MockSequenceTracker();

  // First sequence
  const r1 = tracker.process('BTC-USD', 100);
  assert.equal(r1.status, 'VALID');
  assert.equal(tracker.getExpectedSequence('BTC-USD'), 101);

  // Consecutive sequence
  const r2 = tracker.process('BTC-USD', 101);
  assert.equal(r2.status, 'VALID');
  assert.equal(tracker.getExpectedSequence('BTC-USD'), 102);

  // Intentional Gap
  const r3 = tracker.process('BTC-USD', 107);
  assert.equal(r3.status, 'GAP');
  if (r3.status === 'GAP') {
    assert.equal(r3.expectedSequence, 102);
    assert.equal(r3.receivedSequence, 107);
    assert.equal(r3.gapSize, 5);
  }

  // Next after gap
  assert.equal(tracker.getExpectedSequence('BTC-USD'), 108);

  // Duplicate / out-of-order replayed sequence
  const r4 = tracker.process('BTC-USD', 105);
  assert.equal(r4.status, 'DUPLICATE');
});

test('PriceMotionEngine - generates valid market ticks with correct precision', () => {
  const engine = new PriceMotionEngine();
  const trade = engine.nextTrade('BTC-USD', 5001);

  assert.equal(trade.sequence, 5001);
  assert.equal(trade.productPair, 'BTC-USD');
  assert.ok(parseFloat(trade.price) > 50000);
  assert.ok(parseFloat(trade.size) > 0);
  assert.ok(trade.side === 'BUY' || trade.side === 'SELL');
});

test('InMemoryMockDlqRepository - storage, pagination, filtering, and reconciliation', () => {
  const repo = new InMemoryMockDlqRepository(10);

  const dlq1 = createMockDeadLetter({
    tradeId: 1001,
    productPair: 'BTC-USD',
    receivedSequence: 50,
    expectedSequence: 45,
    reason: 'GAP_DETECTED',
    rawPayload: '{}',
  });

  const dlq2 = createMockDeadLetter({
    tradeId: 1002,
    productPair: 'ETH-USD',
    receivedSequence: 80,
    expectedSequence: 75,
    reason: 'SCHEMA_VIOLATION',
    rawPayload: '{}',
  });

  repo.save(dlq1);
  repo.save(dlq2);

  assert.equal(repo.countTotal(), 2);
  assert.equal(repo.countUnreconciled(), 2);

  // Product filtering
  const btcItems = repo.findByProduct('BTC-USD');
  assert.equal(btcItems.length, 1);
  assert.equal(btcItems[0].productPair, 'BTC-USD');

  // Reconciliation
  const reconciled = repo.reconcile(dlq1.id);
  assert.ok(reconciled);
  assert.equal(reconciled?.reconciled, true);
  assert.equal(repo.countUnreconciled(), 1);
});

test('GenerateTradeTickUseCase and SimulateSequenceGapUseCase', () => {
  const tracker = new MockSequenceTracker();
  const engine = new PriceMotionEngine();
  const repo = new InMemoryMockDlqRepository(50);
  const metrics = new SlidingWindowMetricsCollector(5000);

  const generateUseCase = new GenerateTradeTickUseCase(tracker, engine, repo, metrics);
  const gapUseCase = new SimulateSequenceGapUseCase(tracker, generateUseCase);

  // Normal ticks
  const t1 = generateUseCase.execute('BTC-USD');
  assert.equal(t1.type, 'TRADE');

  const t2 = generateUseCase.execute('BTC-USD');
  assert.equal(t2.type, 'TRADE');

  // Simulate sequence gap
  const gapResult = gapUseCase.execute('BTC-USD', 4);
  assert.equal(gapResult.type, 'ANOMALY');
  if (gapResult.type === 'ANOMALY') {
    assert.equal(gapResult.deadLetter.reason, 'GAP_DETECTED');
    assert.equal(repo.countUnreconciled(), 1);
  }
});

test('SimulateMalformedPayloadUseCase and ReconcileMockDlqUseCase', () => {
  const tracker = new MockSequenceTracker();
  const repo = new InMemoryMockDlqRepository(50);
  const metrics = new SlidingWindowMetricsCollector(5000);

  const malformedUseCase = new SimulateMalformedPayloadUseCase(tracker, repo, metrics);
  const reconcileUseCase = new ReconcileMockDlqUseCase(repo);

  const deadLetter = malformedUseCase.execute({
    product: 'ETH-USD',
    reason: 'SCHEMA_VIOLATION',
  });

  assert.equal(deadLetter.reason, 'SCHEMA_VIOLATION');
  assert.equal(repo.countUnreconciled(), 1);

  const reconciled = reconcileUseCase.execute(deadLetter.id);
  assert.ok(reconciled);
  assert.equal(reconciled?.reconciled, true);
  assert.equal(repo.countUnreconciled(), 0);
});

test('MockEngineFacade - end-to-end coordination and sink events', () => {
  let tradesCount = 0;
  let deadLettersCount = 0;
  let metricsSnapshotCount = 0;

  const facade = new MockEngineFacade({
    initialProduct: 'BTC-USD',
    targetEventsPerSecond: 100,
    simulateBackgroundAnomalies: false,
    feedSink: {
      emitTradesBatch(trades) {
        tradesCount += trades.length;
      },
      emitDeadLetter() {
        deadLettersCount++;
      },
      emitMetrics() {
        metricsSnapshotCount++;
      },
    },
  });

  // Manually trigger a sequence gap
  facade.triggerSequenceGap(5);
  assert.equal(deadLettersCount, 1);
  assert.equal(tradesCount, 1);

  // Verify DLQ retrieval
  const dlq = facade.getDlq('BTC-USD');
  assert.equal(dlq.length, 1);

  // Reconcile
  facade.reconcileDlq(dlq[0].id);
  const updatedDlq = facade.getDlq('BTC-USD');
  assert.equal(updatedDlq[0].reconciled, true);
});
