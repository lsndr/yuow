import { Transaction } from '../../src/core';

export class TransactionMock extends Transaction {
  public readonly doBegin = jest.fn();
  public readonly doCommit = jest.fn();
  public readonly doRollback = jest.fn();
}
