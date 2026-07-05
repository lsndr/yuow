import { defineConfig } from 'prisma/config';

// eslint-disable-next-line import-x/no-default-export -- required by Prisma
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
