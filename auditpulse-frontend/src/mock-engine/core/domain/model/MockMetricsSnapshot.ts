export interface MockMetricsSnapshot {
  readonly eventsPerSecond: number;
  readonly totalProcessed: number;
  readonly quarantinedCount: number;
  readonly lastSequence: number;
  readonly latencyMs: number;
  readonly memoryHeapMb?: number;
}
