import { MockTradeMatch } from '../model/MockTradeMatch';
import { MockDeadLetter } from '../model/MockDeadLetter';
import { MockMetricsSnapshot } from '../model/MockMetricsSnapshot';

export interface MockFeedSinkPort {
  emitTradesBatch(trades: MockTradeMatch[]): void;
  emitDeadLetter(deadLetter: MockDeadLetter): void;
  emitMetrics(metrics: MockMetricsSnapshot): void;
}
