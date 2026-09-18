import { MockMetricsSnapshot } from '../../core/domain/model/MockMetricsSnapshot';

export class SlidingWindowMetricsCollector {
  private readonly windowMs: number;
  private readonly timestamps: number[] = [];
  private totalProcessedCounter = 0;
  private lastObservedSequence = 0;
  private latencyJitterMs = 8;

  constructor(windowMs = 5000) {
    this.windowMs = windowMs;
  }

  public recordEvent(sequence: number): void {
    const now = Date.now();
    this.timestamps.push(now);
    this.totalProcessedCounter++;
    if (sequence > this.lastObservedSequence) {
      this.lastObservedSequence = sequence;
    }
  }

  public getSnapshot(quarantinedCount: number): MockMetricsSnapshot {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    // Prune expired timestamps
    while (this.timestamps.length > 0 && this.timestamps[0] < cutoff) {
      this.timestamps.shift();
    }

    const windowSeconds = this.windowMs / 1000;
    const eps = Math.round(this.timestamps.length / windowSeconds);

    // Realistic micro-latency jitter (6ms - 15ms)
    this.latencyJitterMs = 7 + Math.floor(Math.random() * 8);

    // Simulated browser heap estimation
    const heapMb = typeof performance !== 'undefined' && (performance as any).memory
      ? Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024) * 10) / 10
      : 14.5 + Math.round(Math.random() * 30) / 10;

    return {
      eventsPerSecond: eps,
      totalProcessed: this.totalProcessedCounter,
      quarantinedCount,
      lastSequence: this.lastObservedSequence,
      latencyMs: this.latencyJitterMs,
      memoryHeapMb: heapMb,
    };
  }

  public reset(): void {
    this.timestamps.length = 0;
    this.totalProcessedCounter = 0;
    this.lastObservedSequence = 0;
  }
}
