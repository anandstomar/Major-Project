import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  // 1. Schema path is now a top-level property
  schema: 'prisma/schema.prisma',

  // 2. Renamed from "migrate" to "migrations"
  migrations: {
    path: 'prisma/migrations',
  },

  // 3. Renamed from "db" to "datasource"
  datasource: {
    url: "postgresql://indexer:indexerpwd@127.0.0.1:5432/indexer?schema=public",
  },
});