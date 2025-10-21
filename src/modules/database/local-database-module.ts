/**
 * Local Database Module
 *
 * Provides database functionality using the existing IPC handlers.
 * This service acts as a bridge between the renderer process and the main process database handlers.
 */

import { IDatabase, DatabaseHealthStatus, ResourceUsage } from './database-factory';
import { JSONUtils, DATABASE_SCHEMA, DEFAULT_DATA } from './database-schema';
import { Module, ModuleStatus } from '../index';

export class LocalDatabaseModule implements IDatabase, Module {
  public readonly name = 'LocalDatabaseModule';
  public readonly version = '1.0.0';
  private _isInitialized = false;
  private healthStatus: DatabaseHealthStatus = {
    status: 'initializing',
    lastCheck: new Date(),
  };

  constructor() {}

  get initialized(): boolean {
    return this._isInitialized;
  }

  getStatus(): ModuleStatus {
    return {
      initialized: this._isInitialized,
      healthy: this.healthStatus.status === 'healthy',
      error: this.healthStatus.status === 'failed' ? this.healthStatus.message : undefined,
      lastCheck: this.healthStatus.lastCheck
    };
  }

  async init(): Promise<void> {
    // Initialize the module (Module interface)
    await this.initialize();
  }

  async initialize(): Promise<void> {
    try {
      // Check if Electron API is available
      if (!window.electronAPI) {
        throw new Error('Electron API not available. Make sure the application is running in Electron environment.');
      }

      // Set database path first - use a default path if not provided
      const userDataPath = await window.electronAPI.getUserDataPath();
      const dbPath = userDataPath || './data';
      const fullPath = `${dbPath}/learning-catalyst.db`;

      const setResult = await window.electronAPI.dbSetPath(fullPath);
      if (!setResult?.success) {
        throw new Error(`Failed to set database path: ${setResult?.error}`);
      }

      // Initialize schema by executing the schema SQL using executeQuery
      const schemaResult = await window.electronAPI.dbExecuteQuery(DATABASE_SCHEMA);
      if (!schemaResult?.success) {
        throw new Error(`Failed to initialize database schema: ${schemaResult?.error}`);
      }

      // Insert default data
      const defaultDataResult = await window.electronAPI.dbExecuteQuery(DEFAULT_DATA);
      if (!defaultDataResult?.success) {
        console.warn('Warning: Failed to insert default data:', defaultDataResult?.error);
      }

      this._isInitialized = true;
      this.healthStatus = {
        status: 'healthy',
        lastCheck: new Date(),
        message: 'Local database initialized successfully',
      };
      console.log('Local Database module initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Local Database module:', error);
      this.healthStatus = {
        status: 'failed',
        lastCheck: new Date(),
        message: `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Database must be initialized before starting');
    }

    try {
      // Perform health check
      await this.healthCheck();
      console.log('Local Database module started successfully');
    } catch (error) {
      console.error('Failed to start Local Database module:', error);
      this.healthStatus = {
        status: 'failed',
        lastCheck: new Date(),
        message: `Start failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      console.log('Local Database module stopped successfully');
    } catch (error) {
      console.error('Failed to stop Local Database module:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      this._isInitialized = false;
      console.log('Local Database module cleaned up successfully');
    } catch (error) {
      console.error('Failed to cleanup Local Database module:', error);
      throw error;
    }
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async healthCheck(): Promise<DatabaseHealthStatus> {
    try {
      // Check database health by querying a basic table
      const result = await window.electronAPI?.dbFetchOne('SELECT COUNT(*) as count FROM sqlite_master WHERE type = "table"');

      if (result?.success && result.result) {
        this.healthStatus = {
          status: 'healthy',
          lastCheck: new Date(),
          message: 'Database is healthy',
          metrics: { tableCount: result.result.count },
        };
      } else {
        this.healthStatus = {
          status: 'degraded',
          lastCheck: new Date(),
          message: 'Unable to retrieve database stats',
        };
      }

      return this.healthStatus;
    } catch (error) {
      this.healthStatus = {
        status: 'failed',
        lastCheck: new Date(),
        message: `Health check failed: ${(error as Error).message}`,
      };
      return this.healthStatus;
    }
  }

  async getResourceUsage(): Promise<ResourceUsage> {
    try {
      // Get page count and page size to estimate database size
      const result = await window.electronAPI?.dbFetchOne('PRAGMA page_count');
      const pageSizeResult = await window.electronAPI?.dbFetchOne('PRAGMA page_size');

      const pageCount = result?.success ? result.result?.page_count || 0 : 0;
      const pageSize = pageSizeResult?.success ? pageSizeResult.result?.page_size || 4096 : 4096;
      const databaseSize = pageCount * pageSize;

      return {
        memory: { used: 0, allocated: 0, peak: 0 },
        cpu: { usage: 0, time: 0 },
        connections: { active: 1, total: 1 },
        storage: {
          used: databaseSize,
          allocated: databaseSize
        },
      };
    } catch (error) {
      return {
        memory: { used: 0, allocated: 0, peak: 0 },
        cpu: { usage: 0, time: 0 },
        connections: { active: 0, total: 0 },
        storage: { used: 0, allocated: 0 },
      };
    }
  }

  // Concept CRUD operations using existing IPC handlers
  async createConcept(concept: any): Promise<string> {
    const query = `
      INSERT INTO concepts (id, name, description, concept_type, difficulty_level, mastery_level, tags, metadata, last_reviewed, review_count, parent_concept_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await window.electronAPI?.dbExecuteQuery(query, [
      concept.id,
      concept.name,
      concept.description,
      concept.concept_type,
      concept.difficulty_level,
      concept.mastery_level,
      JSONUtils.stringifyArray(concept.tags || []),
      JSONUtils.stringifyObject(concept.metadata || {}),
      concept.last_reviewed,
      concept.review_count || 0,
      concept.parent_concept_id
    ]);

    if (!result?.success) {
      throw new Error(`Failed to create concept: ${result?.error}`);
    }

    return result.result || '';
  }

  async getConcept(id: string): Promise<any | null> {
    const query = 'SELECT * FROM concepts WHERE id = ?';
    const result = await window.electronAPI?.dbFetchOne(query, [id]);

    if (!result?.success) {
      throw new Error(`Failed to get concept: ${result?.error}`);
    }

    return result.result || null;
  }

  async updateConcept(id: string, updates: any): Promise<boolean> {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    if (fields.length === 0) return false;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => {
      if (field === 'tags') return JSONUtils.stringifyArray(updates[field]);
      if (field === 'metadata') return JSONUtils.stringifyObject(updates[field]);
      return updates[field];
    });
    values.push(id);

    const query = `UPDATE concepts SET ${setClause} WHERE id = ?`;
    const result = await window.electronAPI?.dbExecuteQuery(query, values);

    return result?.success || false;
  }

  async deleteConcept(id: string): Promise<boolean> {
    const query = 'DELETE FROM concepts WHERE id = ?';
    const result = await window.electronAPI?.dbExecuteQuery(query, [id]);

    return result?.success || false;
  }

  // Generic query methods
  async query(sql: string, params: any[] = []): Promise<any[]> {
    const result = await window.electronAPI?.dbFetchAll(sql, params);

    if (!result?.success) {
      throw new Error(`Query failed: ${result?.error}`);
    }

    return result.result || [];
  }

  async runCommand(sql: string, params: any[] = []): Promise<any> {
    const result = await window.electronAPI?.dbExecuteQuery(sql, params);

    if (!result?.success) {
      throw new Error(`Command failed: ${result?.error}`);
    }

    return result.result;
  }

  // Additional interface methods
  prepare<T = any>(sql: string): any {
    return {
      bind: (...params: any[]) => this.run(sql, params),
      run: (...params: any[]) => this.run(sql, params),
      get: (...params: any[]) => this.get(sql, params),
      all: (...params: any[]) => this.all(sql, params),
      iterate: (...params: any[]) => this.query(sql, params)
    };
  }

  all<T = any>(sql: string, params: any[] = []): T[] {
    // Synchronous version not available in IPC, use async query instead
    console.warn('Synchronous all() not available with IPC database. Use query() instead.');
    return [];
  }

  get<T = any>(sql: string, params: any[] = []): T | undefined {
    // Synchronous version not available in IPC, use async query instead
    console.warn('Synchronous get() not available with IPC database. Use query() instead.');
    return undefined;
  }

  run(sql: string, params: any[] = []): any {
    // Synchronous version not available in IPC, use async runCommand instead
    console.warn('Synchronous run() not available with IPC database. Use runCommand() instead.');
    return { changes: 0, lastInsertRowid: 0 };
  }

  transaction<T>(fn: () => T): T {
    // Transactions not available with current IPC implementation
    console.warn('Transactions not available with IPC database.');
    return fn();
  }

  // Table utility methods
  async tableExists(tableName: string): Promise<boolean> {
    const query = "SELECT COUNT(*) as count FROM sqlite_master WHERE type = 'table' AND name = ?";
    const result = await window.electronAPI?.dbFetchOne(query, [tableName]);

    return result?.success && result.result?.count > 0;
  }

  async getTableSchema(tableName: string): Promise<any[]> {
    const query = `PRAGMA table_info(${tableName})`;
    const result = await window.electronAPI?.dbFetchAll(query);

    if (!result?.success) {
      throw new Error(`Failed to get table schema: ${result?.error}`);
    }

    return result.result || [];
  }

  // Database statistics
  async getDatabaseStats(): Promise<any> {
    try {
      const pageCountResult = await window.electronAPI?.dbFetchOne('PRAGMA page_count');
      const pageSizeResult = await window.electronAPI?.dbFetchOne('PRAGMA page_size');
      const tableCountResult = await window.electronAPI?.dbFetchOne('SELECT COUNT(*) as count FROM sqlite_master WHERE type = "table"');

      const pageCount = pageCountResult?.success ? pageCountResult.result?.page_count || 0 : 0;
      const pageSize = pageSizeResult?.success ? pageSizeResult.result?.page_size || 4096 : 4096;
      const tableCount = tableCountResult?.success ? tableCountResult.result?.count || 0 : 0;

      return {
        pageCount,
        pageSize,
        databaseSize: pageCount * pageSize,
        tableCount
      };
    } catch (error) {
      return {
        pageCount: 0,
        pageSize: 4096,
        databaseSize: 0,
        tableCount: 0
      };
    }
  }
}