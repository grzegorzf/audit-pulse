import { MockDeadLetter } from '../model/MockDeadLetter';
import { ProductPairString } from '../model/MockTradeMatch';

export interface MockRepositoryPort {
  save(item: MockDeadLetter): void;
  findAll(offset?: number, limit?: number): MockDeadLetter[];
  findByProduct(product: ProductPairString, offset?: number, limit?: number): MockDeadLetter[];
  findById(id: string): MockDeadLetter | undefined;
  reconcile(id: string): MockDeadLetter | undefined;
  countUnreconciled(): number;
  countTotal(): number;
  clear(): void;
}
