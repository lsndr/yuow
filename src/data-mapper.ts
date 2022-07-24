import { Knex } from 'knex';

export type DataMapperConstructor<
  E extends object,
  M extends DataMapper<E>,
> = new (knex: Knex) => M;

const versionMap = new WeakMap<object, number>();

export abstract class DataMapper<E extends object> {
  constructor(protected readonly knex: Knex) {}

  abstract insert(entity: E): Promise<boolean>;

  abstract update(entity: E): Promise<boolean>;

  abstract delete(entity: E): Promise<boolean>;

  protected setVersion(entity: E, version: number) {
    const currentVersion = this.getVersion(entity);

    if (version < currentVersion) {
      throw new Error('Version cannot be decreased');
    }

    versionMap.set(entity, version);
  }

  protected increaseVersion(entity: E): number {
    const currentVersion = versionMap.get(entity) || 0;
    const version = currentVersion + 1;

    versionMap.set(entity, version);

    return version;
  }

  protected getVersion(entity: E) {
    return versionMap.get(entity) || 1;
  }
}
