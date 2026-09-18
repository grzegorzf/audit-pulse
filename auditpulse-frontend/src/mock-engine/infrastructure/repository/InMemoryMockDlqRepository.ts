import { MockDeadLetter } from '../../core/domain/model/MockDeadLetter';
import { ProductPairString } from '../../core/domain/model/MockTradeMatch';
import { MockRepositoryPort } from '../../core/domain/port/MockRepositoryPort';

export class InMemoryMockDlqRepository implements MockRepositoryPort {
  private readonly maxCapacity: number;
  private readonly store: Map<string, MockDeadLetter> = new Map();
  private readonly chronologicalIds: string[] = [];

  constructor(maxCapacity = 10_000) {
    this.maxCapacity = maxCapacity;
  }

  public save(item: MockDeadLetter): void {
    if (!this.store.has(item.id)) {
      if (this.chronologicalIds.length >= this.maxCapacity) {
        const oldestId = this.chronologicalIds.shift();
        if (oldestId) {
          this.store.delete(oldestId);
        }
      }
      this.chronologicalIds.push(item.id);
    }
    this.store.set(item.id, item);
  }

  public findAll(offset = 0, limit = 50): MockDeadLetter[] {
    const total = this.chronologicalIds.length;
    if (total === 0 || offset >= total) {
      return [];
    }

    const result: MockDeadLetter[] = [];
    const start = total - 1 - offset;

    for (let i = start; i >= 0 && result.length < limit; i--) {
      const id = this.chronologicalIds[i];
      const dl = this.store.get(id);
      if (dl) {
        result.push(dl);
      }
    }
    return result;
  }

  public findByProduct(product: ProductPairString, offset = 0, limit = 50): MockDeadLetter[] {
    const result: MockDeadLetter[] = [];
    let skipped = 0;

    for (let i = this.chronologicalIds.length - 1; i >= 0 && result.length < limit; i--) {
      const id = this.chronologicalIds[i];
      const dl = this.store.get(id);
      if (dl && dl.productPair === product) {
        if (skipped < offset) {
          skipped++;
        } else {
          result.push(dl);
        }
      }
    }
    return result;
  }

  public findById(id: string): MockDeadLetter | undefined {
    return this.store.get(id);
  }

  public reconcile(id: string): MockDeadLetter | undefined {
    const item = this.store.get(id);
    if (!item) return undefined;

    const updated: MockDeadLetter = {
      ...item,
      reconciled: true,
    };
    this.store.set(id, updated);
    return updated;
  }

  public countUnreconciled(): number {
    let count = 0;
    for (const item of this.store.values()) {
      if (!item.reconciled) count++;
    }
    return count;
  }

  public countTotal(): number {
    return this.store.size;
  }

  public clear(): void {
    this.store.clear();
    this.chronologicalIds.length = 0;
  }
}
