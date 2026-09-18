import { ProductPairString } from '../../core/domain/model/MockTradeMatch';
import { MockDeadLetter, createMockDeadLetter, DeadLetterReason } from '../../core/domain/model/MockDeadLetter';
import { MockRepositoryPort } from '../../core/domain/port/MockRepositoryPort';
import { SlidingWindowMetricsCollector } from '../../infrastructure/metrics/SlidingWindowMetricsCollector';
import { MockSequenceTracker } from '../../core/domain/model/MockSequenceTracker';

export interface MalformedSimulationOptions {
  product: ProductPairString;
  reason?: Extract<DeadLetterReason, 'SCHEMA_VIOLATION' | 'UNEXPECTED_PAYLOAD'>;
  customPayload?: string;
}

export class SimulateMalformedPayloadUseCase {
  constructor(
    private sequenceTracker: MockSequenceTracker,
    private dlqRepository: MockRepositoryPort,
    private metricsCollector: SlidingWindowMetricsCollector
  ) {}

  public execute(options: MalformedSimulationOptions): MockDeadLetter {
    const { product, reason = 'SCHEMA_VIOLATION', customPayload } = options;
    const currentSeq = this.sequenceTracker.getExpectedSequence(product);

    const malformedPayload = customPayload || (
      reason === 'SCHEMA_VIOLATION'
        ? JSON.stringify({
            type: 'match',
            trade_id: `malformed-${Date.now()}`,
            sequence: currentSeq,
            price: null, // Invalid schema: null price
            size: 'INVALID_FLOAT',
            product_id: product,
            timestamp: new Date().toISOString(),
          }, null, 2)
        : `<!DOCTYPE html><html><body>502 Bad Gateway from upstream CDN</body></html>`
    );

    const deadLetter = createMockDeadLetter({
      tradeId: null,
      productPair: product,
      receivedSequence: currentSeq,
      expectedSequence: currentSeq,
      reason,
      rawPayload: malformedPayload,
    });

    this.dlqRepository.save(deadLetter);
    this.metricsCollector.recordEvent(currentSeq);

    return deadLetter;
  }
}
