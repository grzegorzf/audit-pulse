import { ProductPairString, MockTradeMatch } from '../core/domain/model/MockTradeMatch';
import { MockDeadLetter, DeadLetterReason } from '../core/domain/model/MockDeadLetter';
import { MockMetricsSnapshot } from '../core/domain/model/MockMetricsSnapshot';
import { MockSequenceTracker } from '../core/domain/model/MockSequenceTracker';
import { MockFeedSinkPort } from '../core/domain/port/MockFeedSinkPort';
import { PriceMotionEngine } from '../infrastructure/generator/PriceMotionEngine';
import { InMemoryMockDlqRepository } from '../infrastructure/repository/InMemoryMockDlqRepository';
import { SlidingWindowMetricsCollector } from '../infrastructure/metrics/SlidingWindowMetricsCollector';
import { MockTickScheduler } from '../infrastructure/scheduler/MockTickScheduler';
import { GenerateTradeTickUseCase } from '../application/usecase/GenerateTradeTickUseCase';
import { SimulateSequenceGapUseCase } from '../application/usecase/SimulateSequenceGapUseCase';
import { SimulateMalformedPayloadUseCase } from '../application/usecase/SimulateMalformedPayloadUseCase';
import { ReconcileMockDlqUseCase } from '../application/usecase/ReconcileMockDlqUseCase';
import { CalculateMockMetricsUseCase } from '../application/usecase/CalculateMockMetricsUseCase';

export interface MockEngineOptions {
  initialProduct?: ProductPairString;
  targetEventsPerSecond?: number;
  feedSink?: MockFeedSinkPort;
  simulateBackgroundAnomalies?: boolean;
}

/**
 * MockEngineFacade serves as the unified interface and composition root
 * for the multi-layered mock engine, coordinating domain models,
 * infrastructure services, and application use cases.
 */
export class MockEngineFacade {
  private currentProduct: ProductPairString;
  private feedSink?: MockFeedSinkPort;
  private readonly simulateBackgroundAnomalies: boolean;
  private tickCounter = 0;

  // Domain & Infrastructure
  private readonly sequenceTracker: MockSequenceTracker;
  private readonly priceMotionEngine: PriceMotionEngine;
  private readonly dlqRepository: InMemoryMockDlqRepository;
  private readonly metricsCollector: SlidingWindowMetricsCollector;
  private readonly scheduler: MockTickScheduler;

  // Application Use Cases
  private readonly generateTradeTickUseCase: GenerateTradeTickUseCase;
  private readonly simulateSequenceGapUseCase: SimulateSequenceGapUseCase;
  private readonly simulateMalformedPayloadUseCase: SimulateMalformedPayloadUseCase;
  private readonly reconcileMockDlqUseCase: ReconcileMockDlqUseCase;
  private readonly calculateMockMetricsUseCase: CalculateMockMetricsUseCase;

  constructor(options: MockEngineOptions = {}) {
    this.currentProduct = options.initialProduct ?? 'BTC-USD';
    this.feedSink = options.feedSink;
    this.simulateBackgroundAnomalies = options.simulateBackgroundAnomalies ?? true;

    // Initialize domain state
    this.sequenceTracker = new MockSequenceTracker({
      'BTC-USD': 5492040000,
      'ETH-USD': 1820490000,
    });
    this.priceMotionEngine = new PriceMotionEngine();
    this.dlqRepository = new InMemoryMockDlqRepository(500);
    this.metricsCollector = new SlidingWindowMetricsCollector(5000);

    // Initialize use cases
    this.generateTradeTickUseCase = new GenerateTradeTickUseCase(
      this.sequenceTracker,
      this.priceMotionEngine,
      this.dlqRepository,
      this.metricsCollector
    );

    this.simulateSequenceGapUseCase = new SimulateSequenceGapUseCase(
      this.sequenceTracker,
      this.generateTradeTickUseCase
    );

    this.simulateMalformedPayloadUseCase = new SimulateMalformedPayloadUseCase(
      this.sequenceTracker,
      this.dlqRepository,
      this.metricsCollector
    );

    this.reconcileMockDlqUseCase = new ReconcileMockDlqUseCase(this.dlqRepository);

    this.calculateMockMetricsUseCase = new CalculateMockMetricsUseCase(
      this.dlqRepository,
      this.metricsCollector
    );

    // Initialize scheduler
    this.scheduler = new MockTickScheduler(
      options.targetEventsPerSecond ?? 120,
      (batchSize) => this.handleBatchTick(batchSize),
      () => this.handleMetricsBroadcast()
    );
  }

  public setFeedSink(sink: MockFeedSinkPort): void {
    this.feedSink = sink;
  }

  public start(): void {
    this.scheduler.start();
    this.handleMetricsBroadcast();
  }

  public stop(): void {
    this.scheduler.stop();
  }

  public isActive(): boolean {
    return this.scheduler.active();
  }

  public setProduct(product: ProductPairString): void {
    this.currentProduct = product;
  }

  public getProduct(): ProductPairString {
    return this.currentProduct;
  }

  public setRate(rate: number): void {
    this.scheduler.setRate(rate);
  }

  public getRate(): number {
    return this.scheduler.getRate();
  }

  /**
   * Intentionally trigger a sequence gap for the current active product.
   */
  public triggerSequenceGap(gapSize: number = 5): void {
    const result = this.simulateSequenceGapUseCase.execute(this.currentProduct, gapSize);
    if (result.type === 'ANOMALY') {
      this.feedSink?.emitDeadLetter(result.deadLetter);
      this.feedSink?.emitTradesBatch([result.trade]);
      this.handleMetricsBroadcast();
    }
  }

  /**
   * Intentionally trigger a malformed payload / schema violation anomaly.
   */
  public triggerMalformedPayload(
    reason?: 'SCHEMA_VIOLATION' | 'UNEXPECTED_PAYLOAD',
    customPayload?: string
  ): MockDeadLetter {
    const deadLetter = this.simulateMalformedPayloadUseCase.execute({
      product: this.currentProduct,
      reason,
      customPayload,
    });
    this.feedSink?.emitDeadLetter(deadLetter);
    this.handleMetricsBroadcast();
    return deadLetter;
  }

  /**
   * Reconcile a DLQ item by ID.
   */
  public reconcileDlq(id: string): MockDeadLetter | undefined {
    const item = this.reconcileMockDlqUseCase.execute(id);
    if (item) {
      this.handleMetricsBroadcast();
    }
    return item;
  }

  /**
   * Fetch DLQ items with optional pagination and product filter.
   */
  public getDlq(product?: ProductPairString, offset = 0, limit = 50): MockDeadLetter[] {
    if (product) {
      return this.dlqRepository.findByProduct(product, offset, limit);
    }
    return this.dlqRepository.findAll(offset, limit);
  }

  /**
   * Fetch current metrics snapshot.
   */
  public getMetrics(): MockMetricsSnapshot {
    return this.calculateMockMetricsUseCase.execute();
  }

  /**
   * Reset engine state (clears DLQ, sequence tracker, metrics).
   */
  public reset(): void {
    this.sequenceTracker.reset();
    this.dlqRepository.clear();
    this.metricsCollector.reset();
    this.handleMetricsBroadcast();
  }

  private handleBatchTick(batchSize: number): void {
    const trades: MockTradeMatch[] = [];

    for (let i = 0; i < batchSize; i++) {
      this.tickCounter++;

      // Inject intentional background sequence gap anomaly every ~280 ticks
      if (this.simulateBackgroundAnomalies && this.tickCounter > 50 && this.tickCounter % 280 === 0) {
        const gapResult = this.simulateSequenceGapUseCase.execute(this.currentProduct, 3);
        if (gapResult.type === 'ANOMALY') {
          trades.push(gapResult.trade);
          this.feedSink?.emitDeadLetter(gapResult.deadLetter);
        }
        continue;
      }

      // Inject intentional background schema anomaly every ~750 ticks
      if (this.simulateBackgroundAnomalies && this.tickCounter > 100 && this.tickCounter % 750 === 0) {
        const deadLetter = this.simulateMalformedPayloadUseCase.execute({ product: this.currentProduct });
        this.feedSink?.emitDeadLetter(deadLetter);
      }

      const result = this.generateTradeTickUseCase.execute(this.currentProduct);
      if (result.type === 'TRADE') {
        trades.push(result.trade);
      } else if (result.type === 'ANOMALY') {
        trades.push(result.trade);
        this.feedSink?.emitDeadLetter(result.deadLetter);
      }
    }

    if (trades.length > 0) {
      this.feedSink?.emitTradesBatch(trades);
    }
  }

  private handleMetricsBroadcast(): void {
    if (!this.feedSink) return;
    const metrics = this.calculateMockMetricsUseCase.execute();
    this.feedSink.emitMetrics(metrics);
  }
}
