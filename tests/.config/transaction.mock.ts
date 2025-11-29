import { Transaction } from '../../src/core';
import { vi } from 'vitest';

export class TransactionMock extends Transaction {
  public readonly doBegin = vi.fn();
  public readonly doCommit = vi.fn();
  public readonly doRollback = vi.fn();
}
