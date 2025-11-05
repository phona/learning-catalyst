/**
 * Mock Local Database Module
 *
 * A mock implementation of the LocalDatabaseModule for integration testing.
 * This simulates the database operations that would normally be handled
 * by the Electron main process.
 */

import { vi } from 'vitest';

export class LocalDatabaseModule {
  public isInitialized = false;
  public databasePath = '';
  private mockConnected = true;

  constructor() {
    this.isInitialized = false;
  }

  async initialize(): Promise<void> {
    // Simulate database initialization
    await new Promise(resolve => setTimeout(resolve, 50));

    // Get database path from electronAPI
    if (window.electronAPI?.invoke) {
      this.databasePath = await window.electronAPI.invoke('getDbPath');
    }

    // Simulate setting database path
    if (window.electronAPI?.dbSetPath) {
      const result = await window.electronAPI.dbSetPath(this.databasePath);
      if (!result.success) {
        throw new Error(result.error || 'Failed to set database path');
      }
    }

    // Simulate executing schema scripts
    if (window.electronAPI?.dbExecuteScript) {
      await window.electronAPI.dbExecuteScript('schema.sql');
      await window.electronAPI.dbExecuteScript('default-data.sql');
    }

    this.isInitialized = true;
  }

  async createConcept(conceptData: any): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    if (window.electronAPI?.dbExecuteQuery) {
      const result = await window.electronAPI.dbExecuteQuery(
        expect.stringContaining('INSERT INTO concepts'),
        expect.arrayContaining([
          conceptData.id,
          conceptData.name,
          expect.any(String),
          conceptData.concept_type,
          conceptData.difficulty_level,
          conceptData.mastery_level,
          expect.stringContaining(conceptData.tags),
          expect.any(String),
          expect.any(String),
          expect.any(Number),
          expect.any(String)
        ])
      );

      if (!result.success) {
        throw new Error('Failed to create concept');
      }
    }

    return conceptData;
  }

  async getConcept(conceptId: string): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    if (window.electronAPI?.dbFetchOne) {
      const result = await window.electronAPI.dbFetchOne(
        'SELECT * FROM concepts WHERE id = ?',
        [conceptId]
      );

      if (!result.success) {
        throw new Error('Failed to get concept');
      }

      return result.result;
    }

    return null;
  }

  async updateConcept(conceptId: string, updates: any): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    if (window.electronAPI?.dbExecuteQuery) {
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);

      const result = await window.electronAPI.dbExecuteQuery(
        expect.stringContaining('UPDATE concepts SET'),
        expect.arrayContaining([...values, conceptId])
      );

      if (!result.success) {
        throw new Error('Failed to update concept');
      }
    }
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    if (window.electronAPI?.dbFetchAll) {
      const result = await window.electronAPI.dbFetchAll(sql, params);

      if (!result.success) {
        throw new Error('Failed to execute query');
      }

      return result.result;
    }

    return [];
  }

  async close(): Promise<void> {
    this.isInitialized = false;
    this.mockConnected = false;
  }

  // Test helper methods
  _setInitialized(status: boolean): void {
    this.isInitialized = status;
  }

  _simulateConnectionFailure(): void {
    this.mockConnected = false;
  }

  _restoreConnection(): void {
    this.mockConnected = true;
  }
}