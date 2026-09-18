import { ProductPairString } from '../../core/domain/model/MockTradeMatch';
import { GenerateTradeTickUseCase, IngestResult } from './GenerateTradeTickUseCase';
import { MockSequenceTracker } from '../../core/domain/model/MockSequenceTracker';

export class SimulateSequenceGapUseCase {
  constructor(
    private sequenceTracker: MockSequenceTracker,
    private generateTradeTickUseCase: GenerateTradeTickUseCase
  ) {}

  /**
   * Intentionally triggers a sequence gap anomaly by jumping the received sequence ahead.
   * Quarantines the out-of-order trade directly into the mock DLQ.
   */
  public execute(product: ProductPairString, gapSize: number = 5): IngestResult {
    const expected = this.sequenceTracker.getExpectedSequence(product);
    const jumpedSequence = expected + Math.max(1, gapSize);
    return this.generateTradeTickUseCase.execute(product, jumpedSequence);
  }
}
