export type TickCallback = (batchSize: number) => void;
export type MetricsCallback = () => void;

export class MockTickScheduler {
  private timerId: any = null;
  private metricsTimerId: any = null;
  private targetEventsPerSecond: number;
  private isRunning = false;
  private onTick: TickCallback;
  private onMetrics: MetricsCallback;

  // Interval in milliseconds between batch emissions (e.g. 50ms = 20 batches/sec)
  private readonly intervalMs = 50;

  constructor(
    targetEventsPerSecond: number,
    onTick: TickCallback,
    onMetrics: MetricsCallback
  ) {
    this.targetEventsPerSecond = targetEventsPerSecond;
    this.onTick = onTick;
    this.onMetrics = onMetrics;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Batches per second = 1000 / intervalMs = 20
    // Batch size = target / batches per second
    this.timerId = setInterval(() => {
      const batchesPerSec = 1000 / this.intervalMs;
      const baseBatch = Math.floor(this.targetEventsPerSecond / batchesPerSec);
      // Add slight jitter (+/- 2)
      const jitter = Math.floor((Math.random() - 0.5) * 4);
      const batchSize = Math.max(1, baseBatch + jitter);

      this.onTick(batchSize);
    }, this.intervalMs);

    // Metrics emitted once per second
    this.metricsTimerId = setInterval(() => {
      this.onMetrics();
    }, 1000);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.metricsTimerId) {
      clearInterval(this.metricsTimerId);
      this.metricsTimerId = null;
    }
  }

  public setRate(rate: number): void {
    this.targetEventsPerSecond = Math.max(10, Math.min(2000, rate));
  }

  public getRate(): number {
    return this.targetEventsPerSecond;
  }

  public active(): boolean {
    return this.isRunning;
  }
}
