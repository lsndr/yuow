import { TransactionState } from '../core';
import { PrismaEngine } from './prisma-engine';
import { PrismaTransaction } from './prisma-transaction';
import { type Prisma } from '../../tests/.config/prisma';
import {
  createPrismaConnection,
  type TestPrismaClient,
} from '../../tests/.config/prisma/connection';
import { beforeEach, describe, it, expect, afterEach } from 'vitest';

describe(PrismaEngine, () => {
  let client: TestPrismaClient;
  let engine: PrismaEngine<TestPrismaClient, Prisma.TransactionIsolationLevel>;

  beforeEach(async () => {
    client = await createPrismaConnection();
    engine = new PrismaEngine(client);
  });

  afterEach(() => client.teardown());

  describe('createTransaction', () => {
    it('should create a transaction', async () => {
      // act
      const transaction = await engine.createTransaction();

      // assert
      expect(transaction).toBeInstanceOf(PrismaTransaction);
      expect(transaction.state).toBe(TransactionState.INITIALIZED);
    });

    it('should create and begin a transaction if it is global', async () => {
      // act
      const transaction = await engine.createTransaction({ global: true });

      // assert
      expect(transaction).toBeInstanceOf(PrismaTransaction);
      expect(transaction.state).toBe(TransactionState.BEGUN);

      // cleanup
      await transaction.rollback();
    });
  });
});
