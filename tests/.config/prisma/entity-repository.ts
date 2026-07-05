import type { PrismaClient, Prisma } from './client';
import {
  EntityState,
  Repository,
  WeakVersionTracker,
  type RepositoryConstructor,
} from '../../../src/core';
import { type PrismaTransaction } from '../../../src/prisma';
import { Entity } from '../entities/entity';

export interface EntityRepository extends Repository<
  Entity,
  PrismaTransaction<PrismaClient, Prisma.TransactionIsolationLevel>
> {
  find(id: string): Promise<Entity | undefined>;
}

export type EntityRepositoryConstructor = RepositoryConstructor<
  EntityRepository,
  PrismaTransaction<PrismaClient, Prisma.TransactionIsolationLevel>
>;

export function createEntityRepository(): EntityRepositoryConstructor {
  return class extends Repository<
    Entity,
    PrismaTransaction<PrismaClient, Prisma.TransactionIsolationLevel>
  > {
    private readonly versionTracker = new WeakVersionTracker<Entity>();

    public async find(id: string): Promise<Entity | undefined> {
      const record = await this.transaction.prisma.entity.findUnique({
        where: { id },
      });

      if (!record) {
        return;
      }

      const entity = new Entity({
        id: record.id,
        name: record.name,
        cards: JSON.parse(record.cards) as string[],
      });

      this.versionTracker.setVersion(entity, record.version);

      return this.changeTracker.getTrackedOrTrack(entity, EntityState.LOADED);
    }

    protected override extractIdentity(entity: Entity): unknown {
      return JSON.stringify([entity.id]);
    }

    protected async flushInsert(entity: Entity): Promise<boolean> {
      const version = this.versionTracker.getVersion(entity);

      await this.transaction.prisma.entity.create({
        data: {
          id: entity.id,
          name: entity.name,
          cards: JSON.stringify(entity.cards),
          version,
        },
      });

      return true;
    }

    protected async flushUpdate(entity: Entity): Promise<boolean> {
      const version = this.versionTracker.increaseVersion(entity);

      const result = await this.transaction.prisma.entity.updateMany({
        where: { id: entity.id, version: version - 1 },
        data: {
          name: entity.name,
          cards: JSON.stringify(entity.cards),
          version,
        },
      });

      return result.count > 0;
    }

    protected async flushDelete(entity: Entity): Promise<boolean> {
      const version = this.versionTracker.getVersion(entity);

      const result = await this.transaction.prisma.entity.deleteMany({
        where: { id: entity.id, version },
      });

      return result.count > 0;
    }
  };
}
