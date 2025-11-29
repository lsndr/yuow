import { type Knex } from 'knex';

export interface Migration {
  name: string;
  up: (knex: Knex) => Promise<void>;
  down: (knex: Knex) => Promise<void>;
}

export function buildMigrationSource(
  migrations: Migration[],
): Knex.MigrationSource<Migration> {
  return {
    getMigrations: (): Promise<Migration[]> => Promise.resolve(migrations),
    getMigrationName: (migration): string => migration.name,
    getMigration: (migration) => {
      return Promise.resolve({
        up: migration.up,
        down: migration.down,
      });
    },
  };
}
