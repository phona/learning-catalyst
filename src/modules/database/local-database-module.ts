/**
 * Local Database Module
 *
 * Provides database functionality using the existing IPC handlers.
 * This service acts as a bridge between the renderer process and the main process database handlers.
 */

import { IDatabase, ResourceUsage } from './database-factory';
import { JSONUtils, DATABASE_SCHEMA, DEFAULT_DATA } from './database-schema';

export class LocalDatabaseModule implements IDatabase {
  public readonly name = 'LocalDatabaseModule';
  public readonly version = '1.0.0';
  private _isInitialized = false;

  constructor() {}

  get initialized(): boolean {
    return this._isInitialized;
  }

  async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this._isInitialized) {
      console.log('[LocalDB] Database already initialized');
      return;
    }

    await this._doInitialization();
  }

  private async _doInitialization(): Promise<void> {
    try {
      // Check if Electron API is available
      if (!window.electronAPI) {
        throw new Error('Electron API not available. Make sure the application is running in Electron environment.');
      }

      console.log('[LocalDB] INSTANCE:', this.constructor.name, 'Starting database initialization, _isInitialized =', this._isInitialized);

      // Get database path from main process (could change with workspace)
      const fullPath = await window.electronAPI.getDatabasePath();
      console.log('[LocalDB] Database path:', fullPath);

      // Set database path only if not already set for this workspace
      console.log('[LocalDB] Setting database path...');
      await window.electronAPI.dbSetPath(fullPath);
      console.log('[LocalDB] Database path set successfully');

      // Always check if the database schema exists for workspace changes
      // even if _isInitialized is true (might be different workspace)
      await this.ensureInitialized();

      this._isInitialized = true;
      console.log('[LocalDB] ✅ Database module initialized successfully');
    } catch (error) {
      console.error('[LocalDB] ❌ Failed to initialize Local Database module:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Database must be initialized before starting');
    }

    try {
      // Database is initialized and ready
      console.log('Local Database module started successfully');
    } catch (error) {
      console.error('Failed to start Local Database module:', error);
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

  /**
   * Ensure database is initialized before any operation
   */
  private async ensureInitializedForOperation(): Promise<void> {
    if (!this._isInitialized) {
      console.log('[LocalDB] Database not initialized, initializing now...');
      await this.initialize();
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

  /**
   * Check if database is properly initialized by testing for key tables
   */
  async isDatabaseInitialized(): Promise<boolean> {
    try {
      if (!this._isInitialized || !window.electronAPI) {
        return false;
      }

      // Check for essential tables
      const conceptsCheck = await this.tableExists('concepts');
      const sessionsCheck = await this.tableExists('learning_sessions');
      const messagesCheck = await this.tableExists('messages');

      return conceptsCheck && sessionsCheck && messagesCheck;
    } catch (error) {
      console.error('[LocalDB] Error checking database initialization:', error);
      return false;
    }
  }

  /**
   * Ensure database is initialized, creates schema if needed
   * Always checks schema regardless of _isInitialized flag to handle workspace changes
   */
  async ensureInitialized(): Promise<void> {
    // Always check if schema exists, even if _isInitialized is true
    // This handles workspace changes where database file might be different
    const isInitialized = await this.isDatabaseInitialized();
    if (!isInitialized) {
      console.log('[LocalDB] Database schema not found, creating schema...');

      // Create schema
      await window.electronAPI.dbExecuteScript(DATABASE_SCHEMA);
      console.log('[LocalDB] Database schema created successfully');

      // Insert default data
      console.log('[LocalDB] Inserting default data...');
      await window.electronAPI.dbExecuteScript(DEFAULT_DATA);
    } else {
      console.log('[LocalDB] Database schema already exists and is valid');
    }
  }
}