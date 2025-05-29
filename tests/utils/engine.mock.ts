import type { TransactionMock } from './transaction.mock';
import { type Engine } from '../../src/core';

export class EngineMock implements Engine<TransactionMock, never> {
  public constructor(public readonly transaction: TransactionMock) {}

  public async createTransaction(): Promise<TransactionMock> {
    return Promise.resolve(this.transaction);
  }
}
