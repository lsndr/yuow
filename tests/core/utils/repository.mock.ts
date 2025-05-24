import { Repository, type EntityState } from '../../../src/core';
import { type TransactionMock } from './transaction.mock';

export class RepositoryMock extends Repository<object, TransactionMock> {
  public static readonly doInsert = jest.fn();
  public static readonly doUpdate = jest.fn();
  public static readonly doDelete = jest.fn();
  public static readonly extractIdentity = jest.fn();

  public readonly doInsert = RepositoryMock.doInsert;
  public readonly doUpdate = RepositoryMock.doUpdate;
  public readonly doDelete = RepositoryMock.doDelete;
  public readonly extractIdentity = RepositoryMock.extractIdentity;

  public constructor(transaction: TransactionMock) {
    super(transaction);
  }

  public static restore(): void {
    this.doInsert.mockRestore();
    this.doUpdate.mockRestore();
    this.doDelete.mockRestore();
    this.extractIdentity.mockRestore();

    init();
  }

  public track(entity: object, state: EntityState): void {
    this.changeTracker.track(entity, state);
  }
}

function init() {
  RepositoryMock.extractIdentity.mockImplementation((entity) =>
    JSON.stringify(entity),
  );
}

init();
