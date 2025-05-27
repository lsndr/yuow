import {
  Repository,
  type RepositoryConstructor,
  type EntityState,
} from '../../src/core';
import { type TransactionMock } from './transaction.mock';

export type RepositoryMock = Repository<object, TransactionMock>;
export type RepositoryMockConstructor = RepositoryConstructor<
  RepositoryMock,
  TransactionMock
> & {
  doInsert: jest.Mock;
  doUpdate: jest.Mock;
  doDelete: jest.Mock;
  extractIdentity: jest.Mock;
};

export function createRepositoryMock(): RepositoryMockConstructor {
  const doInsert = jest.fn();
  const doUpdate = jest.fn();
  const doDelete = jest.fn();
  const extractIdentity = jest.fn();

  const repository = class extends Repository<object, TransactionMock> {
    public static readonly doInsert = doInsert;
    public static readonly doUpdate = doUpdate;
    public static readonly doDelete = doDelete;
    public static readonly extractIdentity = extractIdentity;

    public readonly doInsert = doInsert;
    public readonly doUpdate = doUpdate;
    public readonly doDelete = doDelete;
    public readonly extractIdentity = extractIdentity;

    public constructor(transaction: TransactionMock) {
      super(transaction);
    }

    public static restore(): void {
      this.doInsert.mockRestore();
      this.doUpdate.mockRestore();
      this.doDelete.mockRestore();
      this.extractIdentity.mockRestore();

      extractIdentity.mockImplementation((entity) => JSON.stringify(entity));
    }

    public track(entity: object, state: EntityState): void {
      this.changeTracker.track(entity, state);
    }
  };

  repository.restore();

  return repository;
}
