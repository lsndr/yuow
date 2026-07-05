import { PrismaClient } from './client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { execSync } from 'child_process';
import { rm } from 'fs/promises';
import { resolve } from 'path';

export class TestPrismaClient extends PrismaClient {
  public readonly dbPath: string;

  public constructor() {
    const dbPath = resolve(__dirname, `db/dev-${crypto.randomUUID()}.db`);

    super({
      adapter: new PrismaBetterSqlite3({
        url: `file:${dbPath}`,
      }),
    });

    this.dbPath = dbPath;
  }

  public migrate(): void {
    execSync(`npm run prisma:migrate:deploy`, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: `file:${this.dbPath}`,
      },
    });
  }

  public async teardown(): Promise<void> {
    await this.$disconnect();
    await rm(this.dbPath, { force: true });
  }
}

export const createPrismaConnection = async (): Promise<TestPrismaClient> => {
  const client = new TestPrismaClient();

  client.migrate();
  await client.$connect();

  return client;
};
