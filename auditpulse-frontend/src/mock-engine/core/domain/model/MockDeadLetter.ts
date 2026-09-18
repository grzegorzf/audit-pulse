import { ProductPairString } from './MockTradeMatch';

export type DeadLetterReason = 'GAP_DETECTED' | 'SCHEMA_VIOLATION' | 'UNEXPECTED_PAYLOAD';

export interface MockDeadLetter {
  readonly id: string;
  readonly tradeId: number | null;
  readonly productPair: ProductPairString;
  readonly receivedSequence: number | null;
  readonly expectedSequence: number | null;
  readonly reason: DeadLetterReason;
  readonly rawPayload: string;
  readonly timestamp: string;
  readonly reconciled: boolean;
}

export function createMockDeadLetter(params: {
  id?: string;
  tradeId?: number | null;
  productPair: ProductPairString;
  receivedSequence: number | null;
  expectedSequence: number | null;
  reason: DeadLetterReason;
  rawPayload: string;
  timestamp?: string;
  reconciled?: boolean;
}): MockDeadLetter {
  return {
    id: params.id || `mock-dlq-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    tradeId: params.tradeId ?? null,
    productPair: params.productPair,
    receivedSequence: params.receivedSequence,
    expectedSequence: params.expectedSequence,
    reason: params.reason,
    rawPayload: params.rawPayload,
    timestamp: params.timestamp || new Date().toISOString(),
    reconciled: params.reconciled ?? false,
  };
}
