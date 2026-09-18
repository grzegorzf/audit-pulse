import { ProductPairString } from './MockTradeMatch';

export type SequenceValidationResult =
  | { status: 'VALID'; sequence: number }
  | { status: 'GAP'; receivedSequence: number; expectedSequence: number; gapSize: number }
  | { status: 'DUPLICATE'; receivedSequence: number; expectedSequence: number };

export class MockSequenceTracker {
  private lastSequenceMap: Map<ProductPairString, number> = new Map();

  constructor(initialSequences?: Partial<Record<ProductPairString, number>>) {
    if (initialSequences) {
      Object.entries(initialSequences).forEach(([pair, seq]) => {
        if (seq !== undefined) {
          this.lastSequenceMap.set(pair as ProductPairString, seq);
        }
      });
    }
  }

  public getExpectedSequence(product: ProductPairString): number {
    const last = this.lastSequenceMap.get(product);
    return last !== undefined ? last + 1 : 1;
  }

  public getLastSequence(product: ProductPairString): number | undefined {
    return this.lastSequenceMap.get(product);
  }

  public process(product: ProductPairString, receivedSequence: number): SequenceValidationResult {
    const last = this.lastSequenceMap.get(product);

    if (last === undefined) {
      // First sequence received for product
      this.lastSequenceMap.set(product, receivedSequence);
      return { status: 'VALID', sequence: receivedSequence };
    }

    const expected = last + 1;

    if (receivedSequence === expected) {
      this.lastSequenceMap.set(product, receivedSequence);
      return { status: 'VALID', sequence: receivedSequence };
    }

    if (receivedSequence > expected) {
      const gapSize = receivedSequence - expected;
      // Advance to received sequence to maintain tracking
      this.lastSequenceMap.set(product, receivedSequence);
      return {
        status: 'GAP',
        receivedSequence,
        expectedSequence: expected,
        gapSize,
      };
    }

    return {
      status: 'DUPLICATE',
      receivedSequence,
      expectedSequence: expected,
    };
  }

  public reset(product?: ProductPairString): void {
    if (product) {
      this.lastSequenceMap.delete(product);
    } else {
      this.lastSequenceMap.clear();
    }
  }
}
