import fs from 'node:fs';
import path from 'node:path';
import { Kysely, SqliteDialect, Migrator } from 'kysely';
import Database from 'better-sqlite3';
import { Database as DatabaseType } from './kysely-schema';
import { loadAllMigrations } from './migrations';

export async function ensureDatabasePath(dbPath: string): Promise<void> {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function createDatabaseAtPath(dbPath: string): Promise<Kysely<DatabaseType>> {
  await ensureDatabasePath(dbPath);

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 30000');

  return new Kysely<DatabaseType>({
    dialect: new SqliteDialect({ database: db }),
  });
}

export async function runMigrationsAtPath(dbPath: string): Promise<void> {
  const db = await createDatabaseAtPath(dbPath);

  const migrator = new Migrator({
    db,
    provider: {
      getMigrations: loadAllMigrations,
    },
    migrationTableName: 'kysely_migration',
  });

  await migrator.migrateToLatest();
}

export type { DatabaseType as Database };
