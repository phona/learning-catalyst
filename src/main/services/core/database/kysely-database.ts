import fs from 'node:fs';
import path from 'node:path';
import type { Driver, CompiledQuery, DatabaseConnection } from 'kysely';
import {
  Kysely,
  SqliteAdapter as KyselySqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  QueryResult,
} from 'kysely';
import { setdbPath, executeQuery as sqliteExecuteQuery, fetchAll } from 'sqlite-electron';
import { Database } from './kysely-schema';
import { MigrationManager, loadAllMigrations } from './migrations';

const DATABASE_DIR = '.catalyst';
const DATABASE_FILE = 'learning_catalyst.db';

async function ensureDatabasePath(dbPath: string): Promise<void> {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  await setdbPath(dbPath);
}

export async function createSqliteDriverFactory(dbPath: string): Promise<() => Driver> {
  await ensureDatabasePath(dbPath);

  const driver: Driver = {
    init: async () => {},
    acquireConnection: async (): Promise<DatabaseConnection> => ({
      async executeQuery<R>(compiledQuery: CompiledQuery<any>): Promise<QueryResult<R>> {
        const sql = compiledQuery.sql;
        const params = (compiledQuery.parameters ?? []) as (string | number | Buffer | null)[];
        const normalized = sql.trim().toLowerCase();
        const isSelectLike = normalized.startsWith('select') || normalized.startsWith('with');

        console.log('[Driver] SQL:', sql);
        console.log('[Driver] Params:', params);
        console.log('[Driver] isSelectLike:', isSelectLike);

        if (isSelectLike) {
          console.log('[Driver] Calling fetchAll...');
          const fetchResult = await fetchAll(sql, params);
          console.log('[Driver] fetchAll result:', fetchResult);
          console.log('[Driver] fetchAll type:', typeof fetchResult);
          const rows = fetchResult as R[];
          console.log('[Driver] rows:', rows);
          return { rows };
        }

        await sqliteExecuteQuery(sql, params);
        return { rows: [] as R[] };
      },
      async *streamQuery<R>(): AsyncGenerator<QueryResult<R>, never, unknown> {
        throw new Error('Streaming queries are not supported in this adapter');
      },
    }),
    beginTransaction: async () => {
      await sqliteExecuteQuery('BEGIN TRANSACTION', []);
    },
    commitTransaction: async () => {
      await sqliteExecuteQuery('COMMIT', []);
    },
    rollbackTransaction: async () => {
      await sqliteExecuteQuery('ROLLBACK', []);
    },
    releaseConnection: async () => {},
    destroy: async () => {
      // Close any active connections and flush any pending writes
      await sqliteExecuteQuery('PRAGMA optimize', []);
    },
  };

  return () => driver;
}

export function createDatabase(driverFactory: () => Driver): Kysely<Database> {
  const dialect = {
    createDriver: driverFactory,
    createQueryCompiler: () => new SqliteQueryCompiler(),
    createAdapter: () => new KyselySqliteAdapter(),
    createIntrospector: (db: Kysely<Database>) => new SqliteIntrospector(db),
  };

  return new Kysely<Database>({ dialect });
}

export async function createDatabaseAtPath(dbPath: string): Promise<Kysely<Database>> {
  const driverFactory = await createSqliteDriverFactory(dbPath);
  return createDatabase(driverFactory);
}

export async function runMigrations(driverFactory: () => Driver): Promise<void> {
  const db = createDatabase(driverFactory);
  const migrations = await loadAllMigrations();
  const migrator = new MigrationManager(db, migrations);
  await migrator.migrateToLatest();
}

export async function runMigrationsAtPath(dbPath: string): Promise<void> {
  const driverFactory = await createSqliteDriverFactory(dbPath);
  await runMigrations(driverFactory);
}

export type { Database };
