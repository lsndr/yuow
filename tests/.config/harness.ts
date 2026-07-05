import type { Entity } from './entities/entity';
import { createEntitySchema } from './entities/entity.schema';
import { createKnexConnection } from './knex/connection';
import {
  type Prisma,
  type TestPrismaClient,
  createPrismaConnection,
  createEntityRepository as createPrismaEntityRepository,
} from './prisma';
import { type Engine, Uow } from '../../src/core';
import { KnexEngine } from '../../src/knex';
import { PrismaEngine } from '../../src/prisma';
import type { Knex } from 'knex';

export interface EntityRecord {
  readonly id: string;
  readonly name: string;
  readonly cards: string;
  readonly version: number;
}

export interface HarnessRepository {
  add(entity: Entity): void;
  delete(entity: Entity): void;
  find(...args: any[]): Promise<Entity | undefined>;
}

export interface RepositorySource {
  getRepository(constructor: any): any;
}

export interface Harness<E extends Engine<any, any, any>> {
  readonly uow: Uow<E>;

  getRepository(source: RepositorySource): HarnessRepository;
  find(repository: HarnessRepository, id: string): Promise<Entity | undefined>;
  bumpVersion(id: string): Promise<void>;
  readRecord(id: string): Promise<EntityRecord | undefined>;
  teardown(): Promise<void>;
}

export async function createKnexHarness(): Promise<Harness<KnexEngine>> {
  const entity = createEntitySchema();
  const db: Knex = await createKnexConnection(entity.migration);
  const uow = new Uow(new KnexEngine(db));
  const EntityRepository = entity.schema.createRepository();
  const table = entity.schema.options.table;

  return {
    uow,
    getRepository: (source) => source.getRepository(EntityRepository),
    find: (repository, id) =>
      repository.find((qb: Knex.QueryBuilder) => qb.where('id', id)),
    async bumpVersion(id): Promise<void> {
      await db.raw(`UPDATE "${table}" SET version = version + 1 WHERE id = ?`, [
        id,
      ]);
    },
    async readRecord(id): Promise<EntityRecord | undefined> {
      return db.select('*').from(table).where('id', id).first();
    },
    teardown: () => db.destroy(),
  };
}

export async function createPrismaHarness(): Promise<
  Harness<PrismaEngine<TestPrismaClient, Prisma.TransactionIsolationLevel>>
> {
  const client = await createPrismaConnection();
  const uow = new Uow(
    new PrismaEngine<TestPrismaClient, Prisma.TransactionIsolationLevel>(
      client,
    ),
  );
  const EntityRepository = createPrismaEntityRepository();

  return {
    uow,
    getRepository: (source) => source.getRepository(EntityRepository),
    find: (repository, id) => repository.find(id),
    async bumpVersion(id): Promise<void> {
      await client.entity.update({
        where: { id },
        data: { version: { increment: 1 } },
      });
    },
    async readRecord(id): Promise<EntityRecord | undefined> {
      const record = await client.entity.findUnique({
        where: { id },
      });

      return record ?? undefined;
    },
    teardown: () => client.teardown(),
  };
}
