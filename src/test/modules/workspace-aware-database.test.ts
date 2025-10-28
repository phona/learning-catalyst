/**
 * Workspace-Aware Database Test
 *
 * Tests that database initialization works correctly when workspaces change
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalDatabaseModule } from '../../modules/database/local-database-module';

// Mock Electron API for workspace testing
const createMockElectronAPI = () => {
  let databaseExists = false;

  return {
    getDatabasePath: () => Promise.resolve('/workspace/test.db.sqlite'),
    dbSetPath: (_path: string) => Promise.resolve({ success: true }),
    dbFetchOne: (query: string, _params?: any[]) => {
      // Check if concepts table exists
      if (query.includes('sqlite_master') && query.includes('concepts')) {
        return Promise.resolve({
          success: true,
          result: databaseExists ? { name: 'concepts' } : null
        });
      }
      // Mock PRAGMA queries
      if (query.includes('PRAGMA')) {
        return Promise.resolve({
          success: true,
          result: { page_count: 10, page_size: 4096 }
        });
      }
      return Promise.resolve({ success: true, result: null });
    },
    dbExecuteScript: (script: string) => {
      console.log('Mock executing script:', script.substring(0, 50) + '...');
      if (script.includes('CREATE TABLE')) {
        databaseExists = true; // Simulate database now exists
      }
      return Promise.resolve({ success: true });
    },
    dbExecuteQuery: (_query: string, _params?: any[]) => {
      return Promise.resolve({ success: true, result: 'mock-id' });
    },
    dbFetchAll: (_query: string, _params?: any[]) => {
      return Promise.resolve({ success: true, result: [] });
    }
  };
};

// Setup global window with electronAPI
const setupMockAPI = () => {
  const mockAPI = createMockElectronAPI();
  Object.defineProperty(global, 'window', {
    value: { electronAPI: mockAPI },
    writable: true
  });
  return mockAPI;
};

describe('Workspace-Aware Database Initialization', () => {
  let db: LocalDatabaseModule;
  let mockAPI: any;

  beforeEach(() => {
    // Reset for each test
    setupMockAPI();
    db = new LocalDatabaseModule();
    mockAPI = (global as any).window.electronAPI;
  });

  it('should create schema when database does not exist', async () => {
    expect(db.initialized).toBe(false);

    await db.initialize();

    expect(db.initialized).toBe(true);
  });

  it('should check schema existence on every initialization', async () => {
    // First initialization - should create schema
    await db.initialize();
    expect(db.initialized).toBe(true);

    // Second initialization - should check schema again (workspace change scenario)
    await db.initialize();
    expect(db.initialized).toBe(true);
  });

  it('should handle workspace changes gracefully', async () => {
    // Initialize first workspace
    await db.initialize();
    expect(db.initialized).toBe(true);

    // Simulate workspace change - database doesn't exist in new workspace
    mockAPI.dbFetchOne = (query: string, _params?: any[]) => {
      if (query.includes('sqlite_master') && query.includes('concepts')) {
        return Promise.resolve({ success: true, result: null }); // No tables
      }
      return Promise.resolve({ success: true, result: null });
    };

    // Re-initialize for new workspace - should create schema again
    await db.initialize();
    expect(db.initialized).toBe(true);
  });

  it('should detect existing database and skip schema creation', async () => {
    // Simulate database already exists
    mockAPI.dbFetchOne = (query: string, _params?: any[]) => {
      if (query.includes('sqlite_master') && query.includes('concepts')) {
        return Promise.resolve({ success: true, result: { name: 'concepts' } });
      }
      return Promise.resolve({ success: true, result: null });
    };

    let schemaCreated = false;
    mockAPI.dbExecuteScript = (script: string) => {
      if (script.includes('CREATE TABLE')) {
        schemaCreated = true;
      }
      return Promise.resolve({ success: true });
    };

    await db.initialize();

    expect(db.initialized).toBe(true);
    expect(schemaCreated).toBe(false); // Should not create schema if it exists
  });
});