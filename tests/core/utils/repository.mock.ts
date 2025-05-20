import { Repository } from '../../../src/core';
import { type TransactionMock } from './transaction.mock';

export class RepositoryMock extends Repository<object, TransactionMock> {
  public doInsert = jest.fn();
  public doUpdate = jest.fn();
  public doDelete = jest.fn();
  public extractIdentity = jest.fn();

  public constructor(transaction: TransactionMock) {
    super(transaction);
  }
}
