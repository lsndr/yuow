import type { Engine } from '../../../src/core';
import type { TransactionMock } from './transaction.mock';

export class EngineMock implements Engine<TransactionMock, never> {
  public constructor(public readonly transaction: TransactionMock) {}

  public async createTransaction(): Promise<TransactionMock> {
    return Promise.resolve(this.transaction);
  }
}
