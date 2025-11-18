/**
 * Kysely Database Integration
 *
 * This module provides a Kysely-compatible database interface that integrates
 * with the SQLite operations interface for better testability.
 */

import { Kysely } from 'kysely';
import { Database } from './kysely-schema';
import { ISqliteOperations } from './sqlite-interface';
import { SqliteAdapter } from './sqlite-adapter';
import path from 'node:path';
import fs from 'node:fs';

// Import migration system
import { MigrationManager, loadAllMigrations } from './migrations/index';

/**
 * Generate database path for main process
 * Creates appropriate database path based on environment
 */
function generateDatabasePath(): string {
  // Create .catalyst directory if it doesn't exist
  const catalystDir = path.join(process.cwd(), '.catalyst');

  try {
    if (!fs.existsSync(catalystDir)) {
      fs.mkdirSync(catalystDir, { recursive: true });
    }
  } catch (error) {
    console.warn('Could not create .catalyst directory:', error);
  }

  // Return path within .catalyst directory
  return path.join(catalystDir, 'learning_catalyst.db');
}

/**
 * Factory function to create a Kysely database instance
 * Uses the simpler SqliteAdapter for cleaner architecture
 */
export async function createDatabase(): Promise<Kysely<Database>> {
  const dbPath = generateDatabasePath();
  const sqliteOps: ISqliteOperations = new SqliteAdapter();
  await sqliteOps.setPath(dbPath);

  // Create a simple driver that uses the sqlite operations interface
  const driver = {
    init: async () => {},
    acquireConnection: async () => ({
      async executeQuery(compiledQuery: any) {
        try {
          const result = await sqliteOps.fetchAll(compiledQuery.sql, compiledQuery.parameters);
          return { rows: result };
        } catch (error) {
          console.error('Database query error:', error);
          throw error;
        }
      },
      async *streamQuery() { 
        throw new Error('Streaming queries are not supported in this adapter'); 
      }
    }),
    beginTransaction: async (connection: any) => {
      await connection.executeQuery({ 
        sql: 'BEGIN TRANSACTION', 
        parameters: [], 
        query: {} as any,
        queryId: 'begin' as any 
      });
    },
    commitTransaction: async (connection: any) => {
      await connection.executeQuery({ 
        sql: 'COMMIT', 
        parameters: [], 
        query: {} as any,
        queryId: 'commit' as any 
      });
    },
    rollbackTransaction: async (connection: any) => {
      await connection.executeQuery({ 
        sql: 'ROLLBACK', 
        parameters: [], 
        query: {} as any,
        queryId: 'rollback' as any 
      });
    },
    releaseConnection: async () => {},
    destroy: async () => {}
  };

  const dialect = {
    createDriver: () => driver,
    createQueryCompiler: () => new (Kysely as any).SqliteQueryCompiler(),
    createAdapter: () => new (Kysely as any).SqliteAdapter(),
    createIntrospector: (db: any) => new (Kysely as any).SqliteIntrospector(db)
  };

  return new Kysely<Database>({
    dialect,
    plugins: []
  });
}

/**
 * Convenience function to run migrations
 */
export async function runMigrations(): Promise<any[]> {
  const db = await createDatabase();
  const migrations = await loadAllMigrations();
  const migrator = new MigrationManager(db, migrations);
  return await migrator.migrateToLatest();
}

import { Kysely } from 'kysely';

// Export types
export type { Database };
export type KyselyDatabase = Kysely<Database>;