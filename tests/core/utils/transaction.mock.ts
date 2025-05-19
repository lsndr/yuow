import { Transaction } from '../../../src/core';

export class TransactionMock extends Transaction {
  public doBegin = jest.fn();
  public doCommit = jest.fn();
  public doRollback = jest.fn();
}
