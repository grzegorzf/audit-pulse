import { MockMetricsSnapshot } from '../../core/domain/model/MockMetricsSnapshot';
import { MockRepositoryPort } from '../../core/domain/port/MockRepositoryPort';
import { SlidingWindowMetricsCollector } from '../../infrastructure/metrics/SlidingWindowMetricsCollector';

export class CalculateMockMetricsUseCase {
  constructor(
    private dlqRepository: MockRepositoryPort,
    private metricsCollector: SlidingWindowMetricsCollector
  ) {}

  public execute(): MockMetricsSnapshot {
    const quarantinedCount = this.dlqRepository.countUnreconciled();
    return this.metricsCollector.getSnapshot(quarantinedCount);
  }
}
