import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Kysely } from 'kysely';
import type { Database } from '@/main/services/core/database/kysely-schema';
import {
  createDatabase,
  createSqliteDriverFactory,
  runMigrations,
} from '@/main/services/core/database/kysely-database';

export interface KyselyTestDb {
  db: Kysely<Database>;
  cleanup: () => Promise<void>;
  path: string;
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 50,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}

async function safeFileCleanup(tempDir: string): Promise<void> {
  // Wait a bit for any file handles to be released
  await new Promise((resolve) => setTimeout(resolve, 10));

  await retryOperation(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });
}

export async function createKyselyTestDb(): Promise<KyselyTestDb> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lc-db-'));
  const dbPath = path.join(tempDir, 'learning_catalyst.db');

  const driverFactory = await createSqliteDriverFactory(dbPath);
  await runMigrations(driverFactory);
  const db = createDatabase(driverFactory);

  return {
    db,
    path: dbPath,
    cleanup: async () => {
      // Destroy database connection first to release file handles
      await db.destroy();

      // Small delay to ensure all connections are closed
      await new Promise((resolve) => setTimeout(resolve, 25));

      // Clean up with retries for EBUSY errors
      try {
        await safeFileCleanup(tempDir);
      } catch (cleanupError) {
        console.warn(
          'Unable to remove temporary SQLite directory immediately (it may still be locked).',
          tempDir,
          cleanupError,
        );
      }
    },
  };
}
