import { MockTradeMatch, ProductPairString } from '../../core/domain/model/MockTradeMatch';
import { MockDeadLetter, createMockDeadLetter } from '../../core/domain/model/MockDeadLetter';
import { MockSequenceTracker } from '../../core/domain/model/MockSequenceTracker';
import { MockRepositoryPort } from '../../core/domain/port/MockRepositoryPort';
import { PriceMotionEngine } from '../../infrastructure/generator/PriceMotionEngine';
import { SlidingWindowMetricsCollector } from '../../infrastructure/metrics/SlidingWindowMetricsCollector';

export type IngestResult =
  | { type: 'TRADE'; trade: MockTradeMatch }
  | { type: 'ANOMALY'; deadLetter: MockDeadLetter; trade: MockTradeMatch };

export class GenerateTradeTickUseCase {
  constructor(
    private sequenceTracker: MockSequenceTracker,
    private priceMotionEngine: PriceMotionEngine,
    private dlqRepository: MockRepositoryPort,
    private metricsCollector: SlidingWindowMetricsCollector
  ) {}

  public execute(product: ProductPairString, forcedSequence?: number): IngestResult {
    const nextSeq = forcedSequence !== undefined
      ? forcedSequence
      : this.sequenceTracker.getExpectedSequence(product);

    const trade = this.priceMotionEngine.nextTrade(product, nextSeq);
    const validation = this.sequenceTracker.process(product, nextSeq);

    this.metricsCollector.recordEvent(nextSeq);

    if (validation.status === 'GAP') {
      const deadLetter = createMockDeadLetter({
        tradeId: trade.tradeId,
        productPair: product,
        receivedSequence: validation.receivedSequence,
        expectedSequence: validation.expectedSequence,
        reason: 'GAP_DETECTED',
        rawPayload: JSON.stringify({
          type: 'match',
          trade_id: trade.tradeId,
          sequence: validation.receivedSequence,
          expected_sequence: validation.expectedSequence,
          gap_size: validation.gapSize,
          price: trade.price,
          size: trade.size,
          side: trade.side.toLowerCase(),
          product_id: product,
          time: trade.timestamp,
        }, null, 2),
      });

      this.dlqRepository.save(deadLetter);
      return { type: 'ANOMALY', deadLetter, trade };
    }

    return { type: 'TRADE', trade };
  }
}
