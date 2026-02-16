import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  // 1. Schema path is now a top-level property
  schema: 'prisma/schema.prisma',

  // 2. Renamed from "migrate" to "migrations"
  migrations: {
    path: 'prisma/migrations',
  },

  // 3. Renamed from "db" to "datasource"
  datasource: {
    url: process.env.DATABASE_URL,
  },
});