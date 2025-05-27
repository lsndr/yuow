import { Transaction, TransactionState } from './transaction';
import 'jest-extended';

export class TestTransaction extends Transaction {
  public readonly doBegin = jest.fn();
  public readonly doCommit = jest.fn();
  public readonly doRollback = jest.fn();
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
      const beforeBegin = jest.fn();
      const afterBegin = jest.fn();
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
      const beforeCommit = jest.fn();
      const afterCommit = jest.fn();
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
      const beforeRollback = jest.fn();
      const afterRollback = jest.fn();
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
});
