import { TransactionState, Uow } from '../core';
import { PrismaEngine } from './prisma-engine';
import { PrismaTransaction } from './prisma-transaction';
import {
  createPrismaConnection,
  type TestPrismaClient,
  type PrismaClient,
  type Prisma,
} from '../../tests/.config/prisma';
import { faker } from '@faker-js/faker';
import { beforeEach, describe, it, expect, afterEach } from 'vitest';

describe(PrismaTransaction, () => {
  let client: TestPrismaClient;
  let transaction: PrismaTransaction<
    PrismaClient,
    Prisma.TransactionIsolationLevel
  >;

  beforeEach(async () => {
    client = await createPrismaConnection();
    transaction = new PrismaTransaction(client);
  });

  afterEach(() => client.teardown());

  describe('constructor', () => {
    it('should initialize with the base client', () => {
      expect(transaction.prisma).toBe(client);
    });
  });

  describe('begin', () => {
    it('should transition to BEGUN state and expose the transaction client', async () => {
      // act
      await transaction.begin();

      // assert
      expect(transaction.state).toBe(TransactionState.BEGUN);
      expect(transaction.prisma).not.toBe(client);

      // cleanup
      await transaction.rollback();
    });
  });

  describe('commit', () => {
    it('should commit writes made inside the transaction', async () => {
      // arrange
      const id = faker.string.uuid();
      const name = faker.person.fullName();

      await transaction.begin();
      await transaction.prisma.entity.create({ data: { id, name } });

      // act
      await transaction.commit();

      // assert
      const result = await client.entity.findUnique({
        where: { id },
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe(id);
      expect(result?.name).toBe(name);
    });
  });

  describe('rollback', () => {
    it('should discard writes made inside the transaction', async () => {
      // arrange
      const id = faker.string.uuid();
      const name = faker.person.fullName();

      await transaction.begin();
      await transaction.prisma.entity.create({ data: { id, name } });

      // act
      await transaction.rollback();

      // assert
      const result = await client.entity.findUnique({
        where: { id },
      });
      expect(result).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// End-to-end smoke test: PrismaEngine + core Uow
// The unit begins the transaction explicitly so that Uow's commit/rollback
// guards fire correctly (Uow only auto-begins when a Repository flushes).
// ---------------------------------------------------------------------------

describe('PrismaEngine + Uow (integration)', () => {
  let client: TestPrismaClient;

  beforeEach(async () => {
    client = await createPrismaConnection();
  });

  afterEach(() => client.teardown());

  it('should commit writes when the unit completes normally', async () => {
    // arrange
    const uow = new Uow(new PrismaEngine(client));
    const id = faker.string.uuid();
    const name = faker.person.fullName();

    // act
    await uow.run(async (ctx) => {
      await ctx.transaction.begin();
      await ctx.transaction.prisma.entity.create({ data: { id, name } });
    });

    // assert
    const result = await client.entity.findUnique({ where: { id } });
    expect(result?.id).toBe(id);
    expect(result?.name).toBe(name);
  });

  it('should rollback writes when the unit throws', async () => {
    // arrange
    const uow = new Uow(new PrismaEngine(client));
    const id = faker.string.uuid();
    const name = faker.person.fullName();

    // act
    await expect(
      uow.run(async (ctx) => {
        await ctx.transaction.begin();
        await ctx.transaction.prisma.entity.create({ data: { id, name } });
        throw new Error('oops');
      }),
    ).rejects.toThrow('oops');

    // assert
    const result = await client.entity.findUnique({ where: { id } });
    expect(result).toBeNull();
  });
});
