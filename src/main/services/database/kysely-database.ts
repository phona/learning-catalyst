/**
 * Kysely Database Integration
 *
 * This module provides a Kysely-compatible database interface that integrates
 * with the existing Electron IPC handlers for SQLite operations.
 *
 * This implementation uses dependency injection for better testability and maintainability.
 */

import { DatabaseConnection, DatabaseIntrospector, Dialect, DialectAdapter, Driver, Kysely, QueryCompiler, SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler, TransactionSettings, CompiledQuery, Migration, MigrationResult } from 'kysely'
import { Database } from './kysely-schema'
import { setdbPath, executeQuery, fetchOne, fetchAll, fetchMany } from 'sqlite-electron'
import path from 'node:path'
import fs from 'node:fs'

// Import migration system
import { MigrationManager, loadAllMigrations } from './migrations/index'

/**
 * SQLite Database API
 *
 * Clean abstraction over sqlite-electron functions
 */
interface SQLiteDatabaseAPI {
  setPath(dbPath: string, isUri?: boolean, autocommit?: boolean): Promise<void>
  executeQuery(sql: string, params?: any[]): Promise<any>
  fetchOne(sql: string, params?: any[]): Promise<any>
  fetchAll(sql: string, params?: any[]): Promise<any[]>
  fetchMany(sql: string, limit: number, params?: any[]): Promise<any[]>
}

/**
 * SQLite Electron Implementation
 * Direct implementation using sqlite-electron library
 */
class SQLiteElectronDB implements SQLiteDatabaseAPI {
  async setPath(dbPath: string, isUri = false, autocommit = true): Promise<void> {
    await setdbPath(dbPath, isUri, autocommit)
  }

  async executeQuery(sql: string, params: any[] = []): Promise<any> {
    return await executeQuery(sql, params)
  }

  async fetchOne(sql: string, params: any[] = []): Promise<any> {
    return await fetchOne(sql, params)
  }

  async fetchAll(sql: string, params: any[] = []): Promise<any[]> {
    return await fetchAll(sql, params)
  }

  async fetchMany(sql: string, limit: number, params: any[] = []): Promise<any[]> {
    return await fetchMany(sql, limit, params)
  }
}

/**
 * Kysely QueryResult interface for type compatibility
 */
interface QueryResult<T> {
  readonly rows: T[];
  readonly numAffectedRows?: bigint;
  readonly numChangedRows?: bigint;
  readonly insertId?: bigint;
}


/**
 * SQLite Database Connection
 *
 * Implements Kysely's DatabaseConnection interface using SQLiteDatabaseAPI
 */
class SQLiteDatabaseConnection implements DatabaseConnection {
  constructor(private db: SQLiteDatabaseAPI) {}

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    try {
	  let result;
	  if (compiledQuery.query.kind === 'SelectQueryNode') {
		// Use fetchAll for SELECT queries
		result = await this.db.fetchAll(compiledQuery.sql, compiledQuery.parameters as any[])
	  } else {
		// Use executeQuery for INSERT, UPDATE, DELETE queries
		result = await this.db.executeQuery(compiledQuery.sql, compiledQuery.parameters as any[])
	  }

      // Transform the result to match Kysely's expected format
      const rows = Array.isArray(result) ? result as R[] :
                  (result?.rows ? result.rows as R[] :
                  (result && typeof result === 'object' && 'data' in result ? result.data as R[] : []))

      // Build query result with metadata if available
      const queryResult: QueryResult<R> = { rows }

      // Add metadata if available (using object spread to handle readonly properties)
      if (result && typeof result === 'object') {
        if ('changes' in result) {
          return {
            ...queryResult,
            numAffectedRows: BigInt(result.changes as number)
          }
        }
        if ('lastID' in result) {
          return {
            ...queryResult,
            insertId: BigInt(result.lastID as number)
          }
        }
      }

      return queryResult
    } catch (error) {
      throw new Error(`Failed to execute query: ${error}`)
    }
  }

  async *streamQuery<R>(_compiledQuery: CompiledQuery, _chunkSize?: number): AsyncIterableIterator<QueryResult<R>> {
    throw new Error('Stream queries are not supported in Electron IPC adapter')
  }
}

/**
 * SQLite Database Adapter
 *
 * Implements the Kysely Driver interface using SQLiteDatabaseAPI
 */
export class SQLiteDatabaseAdapter implements Driver {
  private connection: SQLiteDatabaseConnection
  private dbInitialized: boolean = false

  constructor(
    private db: SQLiteDatabaseAPI,
    private dbPath: string,
    private isuri?: boolean,
    private autocommit?: boolean,
  ) {
    this.connection = new SQLiteDatabaseConnection(this.db)
    this.initializeDatabase()
  }

  private async initializeDatabase(): Promise<void> {
    if (!this.dbInitialized) {
      console.log(`[SQLiteDatabaseAdapter] Initializing database at: ${this.dbPath}`)
      await this.db.setPath(this.dbPath, this.isuri || false, this.autocommit !== false)
      this.dbInitialized = true
      console.log('[SQLiteDatabaseAdapter] Database initialized successfully')
    }
  }

  async init(): Promise<void> {
    console.log('[SQLiteDatabaseAdapter] initialized')
    return
  }

  async acquireConnection(): Promise<DatabaseConnection> {
    return this.connection
  }

  async beginTransaction(connection: DatabaseConnection, settings: TransactionSettings): Promise<void> {
    // SQLite doesn't support true transactions through the IPC interface
    // We'll use BEGIN/COMMIT/ROLLBACK statements instead
    try {
      const compiledQuery = {
        sql: 'BEGIN TRANSACTION',
        parameters: [],
        query: {} as any,
        queryId: 'begin-transaction' as any
      }
      await connection.executeQuery(compiledQuery)
    } catch (error) {
      throw new Error(`Failed to begin transaction: ${error}`)
    }
  }

  async commitTransaction(connection: DatabaseConnection): Promise<void> {
    try {
      const compiledQuery = {
        sql: 'COMMIT',
        parameters: [],
        query: {} as any,
        queryId: 'commit-transaction' as any
      }
      await connection.executeQuery(compiledQuery)
    } catch (error) {
      throw new Error(`Failed to commit transaction: ${error}`)
    }
  }

  async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
    try {
      const compiledQuery = {
        sql: 'ROLLBACK',
        parameters: [],
        query: {} as any,
        queryId: 'rollback-transaction' as any
      }
      await connection.executeQuery(compiledQuery)
    } catch (error) {
      throw new Error(`Failed to rollback transaction: ${error}`)
    }
  }

  async savepoint(connection: DatabaseConnection, savepointName: string): Promise<void> {
    try {
      const compiledQuery = {
        sql: `SAVEPOINT ${savepointName}`,
        parameters: [],
        query: {} as any,
        queryId: `savepoint-${savepointName}` as any
      }
      await connection.executeQuery(compiledQuery)
    } catch (error) {
      throw new Error(`Failed to create savepoint: ${error}`)
    }
  }

  async rollbackToSavepoint(connection: DatabaseConnection, savepointName: string): Promise<void> {
    try {
      const compiledQuery = {
        sql: `ROLLBACK TO SAVEPOINT ${savepointName}`,
        parameters: [],
        query: {} as any,
        queryId: `rollback-to-savepoint-${savepointName}` as any
      }
      await connection.executeQuery(compiledQuery)
    } catch (error) {
      throw new Error(`Failed to rollback to savepoint: ${error}`)
    }
  }

  async releaseSavepoint(connection: DatabaseConnection, savepointName: string): Promise<void> {
    try {
      const compiledQuery = {
        sql: `RELEASE SAVEPOINT ${savepointName}`,
        parameters: [],
        query: {} as any,
        queryId: `release-savepoint-${savepointName}` as any
      }
      await connection.executeQuery(compiledQuery)
    } catch (error) {
      throw new Error(`Failed to release savepoint: ${error}`)
    }
  }

  async releaseConnection(connection: DatabaseConnection): Promise<void> {
    // No connection pooling needed for Electron IPC
    // The connection is just a wrapper around the API
  }

  async destroy(): Promise<void> {
    console.log('[SQLiteDatabaseAdapter] Destroyed')
  }
}

/**
 * Simple Kysely-style Database
 *
 * Provides a Kysely-like query building interface with dependency injection
 */
export class SimpleKyselyDB implements Dialect {
  private driver: Driver

  constructor(driver: Driver) {
    this.driver = driver
  }

  createDriver(): Driver {
    return this.driver
  }

  createQueryCompiler(): QueryCompiler {
    return new SqliteQueryCompiler()
  }

  createAdapter(): DialectAdapter {
    return new SqliteAdapter()
  }

  createIntrospector(db: Kysely<any>): DatabaseIntrospector {
    return new SqliteIntrospector(db)
  }
}

/**
 * Database Factory
 *
 * Creates database instances with appropriate adapters
 */
export class DatabaseFactory {
  /**
   * Create a database instance with Electron IPC adapter (for production)
   */
  static createSQLiteDB(
    dbPath: string,
    isuri?: boolean,
    autocommit?: boolean,
): SimpleKyselyDB {
    const sqliteDB = new SQLiteElectronDB()
    const adapter = new SQLiteDatabaseAdapter(sqliteDB, dbPath, isuri, autocommit)
    return new SimpleKyselyDB(adapter)
  }

  /**
   * Create a database instance with custom adapter (for testing)
   */
  static createCustomDB(adapter: Driver): SimpleKyselyDB {
    return new SimpleKyselyDB(adapter)
  }

  /**
   * Create a database instance with Electron IPC adapter (for integration tests)
   * This method provides compatibility with existing test code
   */
  static createElectronDB(
    ipc: any,
    dbPath: string,
    isuri?: boolean,
    autocommit?: boolean,
  ): any {
    // For integration tests, return a mock database that uses the IPC interface
    return {
      init: async () => {
        if (ipc.dbSetPath) {
          await ipc.dbSetPath(dbPath);
        }
        if (ipc.dbExecuteScript) {
          await ipc.dbExecuteScript('CREATE TABLE IF NOT EXISTS concepts (id TEXT PRIMARY KEY, name TEXT)');
        }
      },
      createConcept: async (conceptData: any) => {
        if (ipc.dbExecuteQuery) {
          return await ipc.dbExecuteQuery(
            'INSERT INTO concepts (id, name, concept_type, difficulty_level, mastery_level, tags, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              conceptData.id,
              conceptData.name,
              conceptData.concept_type,
              conceptData.difficulty_level,
              conceptData.mastery_level,
              conceptData.tags,
              conceptData.metadata,
              Date.now(),
              Date.now()
            ]
          );
        }
      },
      getConcept: async (id: string) => {
        if (ipc.dbFetchOne) {
          return await ipc.dbFetchOne('SELECT * FROM concepts WHERE id = ?', [id]);
        }
        return null;
      },
      updateConcept: async (id: string, updates: any) => {
        const fields = Object.keys(updates);
        const values = Object.values(updates);
        const setClause = fields.map(field => `${field} = ?`).join(', ');

        if (ipc.dbExecuteQuery) {
          return await ipc.dbExecuteQuery(
            `UPDATE concepts SET ${setClause}, updated_at = ? WHERE id = ?`,
            [...values, Date.now(), id]
          );
        }
      },
      query: async (sql: string, params: any[] = []) => {
        if (ipc.dbFetchAll) {
          return await ipc.dbFetchAll(sql, params);
        }
        return [];
      },
      initialize: async () => {
        return this.init();
      }
    };
  }
}

/**
 * Generate database path for main process
 * Creates appropriate database path based on environment
 */
function generateDatabasePath(): string {
  // Create .catalyst directory if it doesn't exist
  const catalystDir = path.join(process.cwd(), '.catalyst')

  try {
    if (!fs.existsSync(catalystDir)) {
      fs.mkdirSync(catalystDir, { recursive: true })
    }
  } catch (error) {
    console.warn('Could not create .catalyst directory:', error)
  }

  // Return path within .catalyst directory
  return path.join(catalystDir, 'learning_catalyst.db')
}

/**
 * Factory function to create a Kysely database instance
 * This replaces the global singleton pattern with proper dependency injection
 */
export async function createDatabase(): Promise<Kysely<Database>> {
  // Generate database path directly for main process
  const dbPath = generateDatabasePath()
  const dialect = DatabaseFactory.createSQLiteDB(dbPath, false, true)

  return new Kysely<Database>({
    dialect,
    plugins: []
  })
}


/**
 * Convenience function to run migrations
 */
export async function runMigrations(migrationFiles?: Record<string, Migration>): Promise<MigrationResult[]> {
  const db = await createDatabase()

  // If no migration files provided, load all migrations
  const migrations = migrationFiles || await loadAllMigrations()
  const migrator = new MigrationManager(db, migrations)
  return await migrator.migrateToLatest()
}

/**
 * Convenience function to get migration status
 */
export async function getMigrationStatus(migrationFiles?: Record<string, Migration>): Promise<{
  executed: string[]
  pending: string[]
  total: number
}> {
  const db = await createDatabase()

  // If no migration files provided, load all migrations
  const migrations = migrationFiles || await loadAllMigrations()
  const migrator = new MigrationManager(db, migrations)
  return await migrator.getMigrationStatus()
}

/**
 * Convenience function to rollback migrations
 */
export async function rollbackMigrations(targetVersion?: string, migrationFiles?: Record<string, Migration>): Promise<MigrationResult[]> {
  const db = await createDatabase()

  // If no migration files provided, load all migrations
  const migrations = migrationFiles || await loadAllMigrations()
  const migrator = new MigrationManager(db, migrations)
  return await migrator.migrateDown(targetVersion)
}

// Export types
export type { Database }