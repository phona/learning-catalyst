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
import type { DatabaseAPI, ElectronAPI } from '../../types/electron-api'

// Import migration system
import { MigrationManager, loadAllMigrations } from './migrations/index'

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
 * Electron IPC Database Connection
 *
 * Implements Kysely's DatabaseConnection interface using Electron IPC
 */
class ElectronIPCConnection implements DatabaseConnection {
  constructor(private api: DatabaseAPI) {}

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    try {
      const result = await this.api.dbExecuteQuery(compiledQuery.sql, compiledQuery.parameters as any[])

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
 * Electron IPC Database Adapter
 *
 * Implements the Kysely Driver interface using Electron IPC handlers
 */
export class ElectronIPCAdapter implements Driver {
  private connection: ElectronIPCConnection

  constructor(
    private api: DatabaseAPI,
    private dbPath: string,
    private isuri?: boolean,
    private autocommit?: boolean,
  ) {
    this.connection = new ElectronIPCConnection(this.api)
    this.api.dbSetPath(this.dbPath, this.isuri, this.autocommit)
  }

  async init(): Promise<void> {
    console.log('[ElectronIPCAdapter] initialized')
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
    console.log('[ElectronIPCAdapter] Destroyed')
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
  static createElectronDB(
    api: DatabaseAPI,
    dbPath: string,
    isuri?: boolean,
    autocommit?: boolean,
): SimpleKyselyDB {
    // Use provided API or get from window object
    const electronAPI = api || (typeof window !== 'undefined' ? window.electronAPI : null)
    if (!electronAPI) {
      throw new Error('ElectronAPI not available. Make sure this code is running in Electron renderer process.')
    }
    const adapter = new ElectronIPCAdapter(api, dbPath, isuri, autocommit)
    return new SimpleKyselyDB(adapter)
  }

  /**
   * Create a database instance with custom adapter (for testing)
   */
  static createCustomDB(adapter: Driver): SimpleKyselyDB {
    return new SimpleKyselyDB(adapter)
  }
}

/**
 * Factory function to create a Kysely database instance
 * This replaces the global singleton pattern with proper dependency injection
 */
export async function createDatabase(api?: ElectronAPI): Promise<Kysely<Database>> {
  // Use provided API or get from window object
  const electronAPI = api || (typeof window !== 'undefined' ? window.electronAPI : null)
  if (!electronAPI) {
    throw new Error('ElectronAPI not available. Make sure this code is running in Electron renderer process.')
  }

  const dbPath = await electronAPI.getDatabasePath()
  const dialect = DatabaseFactory.createElectronDB(electronAPI, dbPath, false, true)

  return new Kysely<Database>({
    dialect,
    plugins: []
  })
}


/**
 * Convenience function to run migrations
 */
export async function runMigrations(api?: ElectronAPI, migrationFiles?: Record<string, Migration>): Promise<MigrationResult[]> {
  const db = await createDatabase(api)

  // If no migration files provided, load all migrations
  const migrations = migrationFiles || await loadAllMigrations()
  const migrator = new MigrationManager(db, migrations)
  return await migrator.migrateToLatest()
}

/**
 * Convenience function to get migration status
 */
export async function getMigrationStatus(api?: ElectronAPI, migrationFiles?: Record<string, Migration>): Promise<{
  executed: string[]
  pending: string[]
  total: number
}> {
  const db = await createDatabase(api)

  // If no migration files provided, load all migrations
  const migrations = migrationFiles || await loadAllMigrations()
  const migrator = new MigrationManager(db, migrations)
  return await migrator.getMigrationStatus()
}

/**
 * Convenience function to rollback migrations
 */
export async function rollbackMigrations(api?: ElectronAPI, targetVersion?: string, migrationFiles?: Record<string, Migration>): Promise<MigrationResult[]> {
  const db = await createDatabase(api)

  // If no migration files provided, load all migrations
  const migrations = migrationFiles || await loadAllMigrations()
  const migrator = new MigrationManager(db, migrations)
  return await migrator.migrateDown(targetVersion)
}

// Export types
export type { Database }