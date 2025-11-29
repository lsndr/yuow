import { Transaction, TransactionState } from './transaction';
import { faker } from '@faker-js/faker';
import { beforeEach, describe, it, expect, vi } from 'vitest';

export class TestTransaction extends Transaction {
  public readonly doBegin = vi.fn();
  public readonly doCommit = vi.fn();
  public readonly doRollback = vi.fn();

  public async emitTestEvent(eventName: string): Promise<void> {
    await this.emit(eventName);
  }
}

describe(Transaction, () => {
  let transaction: TestTransaction;

  beforeEach(() => {
    transaction = new TestTransaction();
  });

  describe('constructor', () => {
    it(`should initialize transaction in ${TransactionState.INITIALIZED} state`, () => {
      expect(transaction.state).toBe(TransactionState.INITIALIZED);
    });
  });

  describe('begin', () => {
    it('should begin transaction', async () => {
      // arrange
      const beforeBegin = vi.fn();
      const afterBegin = vi.fn();
      transaction.on('beforeBegin', beforeBegin);
      transaction.on('afterBegin', afterBegin);

      // act
      await transaction.begin();

      // assert
      expect(transaction.doBegin).toHaveBeenCalledTimes(1);
      expect(transaction.state).toBe(TransactionState.BEGUN);
      expect(beforeBegin).toHaveBeenCalledTimes(1);
      expect(afterBegin).toHaveBeenCalledTimes(1);
      expect(beforeBegin).toHaveBeenCalledBefore(afterBegin);
    });
  });

  describe('commit', () => {
    it('should commit transaction', async () => {
      // arrange
      await transaction.begin();
      const beforeCommit = vi.fn();
      const afterCommit = vi.fn();
      transaction.on('beforeCommit', beforeCommit);
      transaction.on('afterCommit', afterCommit);

      // act
      await transaction.commit();

      // assert
      expect(transaction.doCommit).toHaveBeenCalledTimes(1);
      expect(transaction.state).toBe(TransactionState.COMMITTED);
      expect(beforeCommit).toHaveBeenCalledTimes(1);
      expect(afterCommit).toHaveBeenCalledTimes(1);
      expect(beforeCommit).toHaveBeenCalledBefore(afterCommit);
    });
  });

  describe('rollback', () => {
    it('should rollback transaction', async () => {
      // arrange
      await transaction.begin();
      const beforeRollback = vi.fn();
      const afterRollback = vi.fn();
      transaction.on('beforeRollback', beforeRollback);
      transaction.on('afterRollback', afterRollback);

      // act
      await transaction.rollback();

      // assert
      expect(transaction.doRollback).toHaveBeenCalledTimes(1);
      expect(transaction.state).toBe(TransactionState.ROLLED_BACK);
      expect(beforeRollback).toHaveBeenCalledTimes(1);
      expect(afterRollback).toHaveBeenCalledTimes(1);
      expect(beforeRollback).toHaveBeenCalledBefore(afterRollback);
    });
  });

  describe('emit', () => {
    it('should emit custom events', async () => {
      // arrange
      const eventName = faker.word.verb();
      const eventHandler = vi.fn();
      transaction.on(eventName, eventHandler);

      // act
      await transaction.emitTestEvent(eventName);

      // assert
      expect(eventHandler).toHaveBeenCalledTimes(1);
    });
  });
});
