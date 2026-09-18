export type TradeSide = 'BUY' | 'SELL';

export interface TradeMatch {
  tradeId: number;
  sequence: number;
  price: string;
  size: string;
  side: TradeSide;
  timestamp: string;
  productPair: string | { value: string };
  flashType?: 'BUY' | 'SELL';
}

export type DeadLetterReason = 'GAP_DETECTED' | 'SCHEMA_VIOLATION' | 'UNEXPECTED_PAYLOAD';

export interface DeadLetter {
  id: string;
  tradeId: number | null;
  productPair: string | { value: string };
  receivedSequence: number | null;
  expectedSequence: number | null;
  reason: DeadLetterReason;
  rawPayload: string;
  timestamp: string;
  reconciled: boolean;
}

export interface MetricsSnapshot {
  eventsPerSecond: number;
  totalProcessed: number;
  quarantinedCount: number;
  lastSequence: number;
  latencyMs: number;
}

export type ConnectionStatus = 'ONLINE' | 'DEGRADED' | 'MOCK_ACTIVE' | 'CONNECTING' | 'OFFLINE';

export type TargetEndpoint = 'BACKEND_LOCAL' | 'CLOUD_JVM' | 'MOCK_ENGINE';
