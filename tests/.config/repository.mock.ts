import { type TransactionMock } from './transaction.mock';
import {
  Repository,
  type RepositoryConstructor,
  type EntityState,
} from '../../src/core';
import { vi, type Mock } from 'vitest';

export type RepositoryMock = Repository<object, TransactionMock>;
export type RepositoryMockConstructor = RepositoryConstructor<
  RepositoryMock,
  TransactionMock
> & {
  flushInsert: Mock;
  flushUpdate: Mock;
  flushDelete: Mock;
  extractIdentity: Mock;
};

export function createRepositoryMock(): RepositoryMockConstructor {
  const flushInsert = vi.fn();
  const flushUpdate = vi.fn();
  const flushDelete = vi.fn();
  const extractIdentity = vi.fn();

  const repository = class extends Repository<object, TransactionMock> {
    public static readonly flushInsert = flushInsert;
    public static readonly flushUpdate = flushUpdate;
    public static readonly flushDelete = flushDelete;
    public static readonly extractIdentity = extractIdentity;

    public readonly flushInsert = flushInsert;
    public readonly flushUpdate = flushUpdate;
    public readonly flushDelete = flushDelete;
    public readonly extractIdentity = extractIdentity;

    public constructor(transaction: TransactionMock) {
      super(transaction);
    }

    public static restore(): void {
      this.flushInsert.mockRestore();
      this.flushUpdate.mockRestore();
      this.flushDelete.mockRestore();
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
