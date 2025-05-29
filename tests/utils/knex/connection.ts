import { buildMigrationSource, type Migration } from './migrations';
import { knex, type Knex } from 'knex';

export const createKnexConnection = async (
  ...migrations: Migration[]
): Promise<Knex> => {
  const client = knex({
    client: 'sqlite3',
    connection: ':memory:',
    useNullAsDefault: true,
    migrations: {
      migrationSource: buildMigrationSource(migrations),
    },
  });

  await client.migrate.latest();

  return client;
};
