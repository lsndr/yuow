import { buildMigrationSource, type Migration } from './migrations';
import { knex, type Knex } from 'knex';
import { mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';

export const createKnexConnection = async (
  ...migrations: Migration[]
): Promise<Knex> => {
  const dbPath = resolve(__dirname, `db/dev-${crypto.randomUUID()}.db`);

  await mkdir(dirname(dbPath), { recursive: true });

  const client = knex({
    client: 'sqlite3',
    connection: dbPath,
    useNullAsDefault: true,
    migrations: {
      migrationSource: buildMigrationSource(migrations),
    },
  });

  await client.migrate.latest();

  return client;
};
