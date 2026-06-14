import { MigrationConfig } from "drizzle-orm/migrator";

type APIConfig = {
  fileserverHits: number;
  db: DBConfig;
  PLATFORM: string;
};
type DBConfig = {
  url: string;
  migrationConfig: MigrationConfig;
};
process.loadEnvFile();
export const config: APIConfig = {
  fileserverHits: 0,
  db: {
    url:
      process.env.DB_URL ||
      "postgresql://postgres:postgres@localhost:5432/mydatabase?sslmode=disable",
    migrationConfig: {
      migrationsFolder: "./src/generated",
    },
  },
  PLATFORM: process.env.PLATFORM || "dev",
};
