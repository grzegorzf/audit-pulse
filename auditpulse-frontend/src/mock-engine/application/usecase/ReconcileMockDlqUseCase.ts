import { MockDeadLetter } from '../../core/domain/model/MockDeadLetter';
import { MockRepositoryPort } from '../../core/domain/port/MockRepositoryPort';

export class ReconcileMockDlqUseCase {
  constructor(private dlqRepository: MockRepositoryPort) {}

  /**
   * Marks a dead-letter item as reconciled by its unique ID.
   */
  public execute(id: string): MockDeadLetter | undefined {
    return this.dlqRepository.reconcile(id);
  }
}
