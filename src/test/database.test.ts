/**
 * Test Database Functionality
 *
 * This test file verifies that the database layer works correctly
 * by testing schema initialization and basic CRUD operations.
 */

import { LocalDatabaseModule } from '../modules/database/local-database-module';
import { vi } from 'vitest';

// Mock window.electronAPI for testing
if (typeof window === 'undefined') {
  (global as any).window = {
    electronAPI: {
      invoke: vi.fn(),
      dbSetPath: vi.fn(),
      dbExecuteScript: vi.fn(),
      dbExecuteQuery: vi.fn(),
      dbFetchOne: vi.fn(),
      dbFetchAll: vi.fn(),
    }
  };
}

describe('Database Layer Tests', () => {
  let databaseModule: LocalDatabaseModule;

  beforeEach(() => {
    databaseModule = new LocalDatabaseModule();
    vi.clearAllMocks();
  });

  describe('Database Initialization', () => {
    test('should initialize database with schema', async () => {
      // Mock the IPC calls
      (window.electronAPI.invoke as ReturnType<typeof vi.fn>).mockResolvedValue('/mock/user/data');
      (window.electronAPI.dbSetPath as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (window.electronAPI.dbExecuteScript as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      await databaseModule.initialize();

      expect(databaseModule.isInitialized).toBe(true);
      expect(window.electronAPI.dbSetPath).toHaveBeenCalled();
      expect(window.electronAPI.dbExecuteScript).toHaveBeenCalledTimes(2); // Schema + default data
    });

    test('should handle initialization failure', async () => {
      (window.electronAPI.invoke as ReturnType<typeof vi.fn>).mockResolvedValue('/mock/user/data');
      (window.electronAPI.dbSetPath as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: 'Database connection failed' });

      await expect(databaseModule.initialize()).rejects.toThrow('Database connection failed');
      expect(databaseModule.isInitialized).toBe(false);
    });
  });

  describe('Health Check', () => {
    beforeEach(async () => {
      // Initialize database for health check tests
      (window.electronAPI.invoke as ReturnType<typeof vi.fn>).mockResolvedValue('/mock/user/data');
      (window.electronAPI.dbSetPath as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (window.electronAPI.dbExecuteScript as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      await databaseModule.initialize();
    });

    test('should return healthy status when database is accessible', async () => {
      (window.electronAPI.dbFetchOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        result: { count: 10 }
      });

      const health = await databaseModule.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.metrics).toEqual({ tableCount: 10 });
    });

    test('should return degraded status when database query fails', async () => {
      (window.electronAPI.dbFetchOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Query failed'
      });

      const health = await databaseModule.healthCheck();

      expect(health.status).toBe('degraded');
    });
  });

  describe('Concept CRUD Operations', () => {
    beforeEach(async () => {
      // Initialize database for CRUD tests
      (window.electronAPI.invoke as ReturnType<typeof vi.fn>).mockResolvedValue('/mock/user/data');
      (window.electronAPI.dbSetPath as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (window.electronAPI.dbExecuteScript as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      await databaseModule.initialize();
    });

    test('should create a concept', async () => {
      const concept = {
        id: 'test-concept-1',
        name: 'Test Concept',
        description: 'A test concept',
        concept_type: 'topic',
        difficulty_level: 1,
        mastery_level: 0.0,
        tags: ['test', 'learning'],
        metadata: { source: 'test' }
      };

      (window.electronAPI.dbExecuteQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        result: 'last-insert-rowid'
      });

      const result = await databaseModule.createConcept(concept);

      expect(result).toBe('last-insert-rowid');
      expect(window.electronAPI.dbExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO concepts'),
        expect.arrayContaining([
          'test-concept-1',
          'Test Concept',
          'A test concept',
          'topic',
          1,
          0.0,
          '["test","learning"]',
          '{"source":"test"}',
          undefined,
          0,
          undefined
        ])
      );
    });

    test('should get a concept by ID', async () => {
      const mockConcept = {
        id: 'test-concept-1',
        name: 'Test Concept',
        description: 'A test concept',
        concept_type: 'topic',
        difficulty_level: 1,
        mastery_level: 0.0,
        tags: '["test","learning"]',
        metadata: '{"source":"test"}'
      };

      (window.electronAPI.dbFetchOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        result: mockConcept
      });

      const result = await databaseModule.getConcept('test-concept-1');

      expect(result).toEqual(mockConcept);
      expect(window.electronAPI.dbFetchOne).toHaveBeenCalledWith(
        'SELECT * FROM concepts WHERE id = ?',
        ['test-concept-1']
      );
    });

    test('should update a concept', async () => {
      const updates = {
        name: 'Updated Concept',
        mastery_level: 0.5
      };

      (window.electronAPI.dbExecuteQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true
      });

      const result = await databaseModule.updateConcept('test-concept-1', updates);

      expect(result).toBe(true);
      expect(window.electronAPI.dbExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE concepts SET'),
        expect.arrayContaining(['Updated Concept', 0.5, 'test-concept-1'])
      );
    });

    test('should delete a concept', async () => {
      (window.electronAPI.dbExecuteQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true
      });

      const result = await databaseModule.deleteConcept('test-concept-1');

      expect(result).toBe(true);
      expect(window.electronAPI.dbExecuteQuery).toHaveBeenCalledWith(
        'DELETE FROM concepts WHERE id = ?',
        ['test-concept-1']
      );
    });
  });

  describe('Generic Query Methods', () => {
    beforeEach(async () => {
      // Initialize database for query tests
      (window.electronAPI.invoke as ReturnType<typeof vi.fn>).mockResolvedValue('/mock/user/data');
      (window.electronAPI.dbSetPath as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (window.electronAPI.dbExecuteScript as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      await databaseModule.initialize();
    });

    test('should execute a query and return results', async () => {
      const mockResults = [
        { id: '1', name: 'Concept 1' },
        { id: '2', name: 'Concept 2' }
      ];

      (window.electronAPI.dbFetchAll as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        result: mockResults
      });

      const results = await databaseModule.query('SELECT * FROM concepts');

      expect(results).toEqual(mockResults);
      expect(window.electronAPI.dbFetchAll).toHaveBeenCalledWith('SELECT * FROM concepts', []);
    });

    test('should handle query failure', async () => {
      (window.electronAPI.dbFetchAll as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'SQL syntax error'
      });

      await expect(databaseModule.query('INVALID SQL')).rejects.toThrow('SQL syntax error');
    });

    test('should check if table exists', async () => {
      (window.electronAPI.dbFetchOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        result: { count: 1 }
      });

      const exists = await databaseModule.tableExists('concepts');

      expect(exists).toBe(true);
      expect(window.electronAPI.dbFetchOne).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM sqlite_master WHERE type = \'table\' AND name = ?',
        ['concepts']
      );
    });

    test('should get table schema', async () => {
      const mockSchema = [
        { cid: 0, name: 'id', type: 'TEXT', notnull: 1, dflt_value: null, pk: 1 },
        { cid: 1, name: 'name', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 }
      ];

      (window.electronAPI.dbFetchAll as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        result: mockSchema
      });

      const schema = await databaseModule.getTableSchema('concepts');

      expect(schema).toEqual(mockSchema);
      expect(window.electronAPI.dbFetchAll).toHaveBeenCalledWith('PRAGMA table_info(concepts)');
    });
  });

  describe('Resource Usage', () => {
    beforeEach(async () => {
      // Initialize database for resource tests
      (window.electronAPI.invoke as ReturnType<typeof vi.fn>).mockResolvedValue('/mock/user/data');
      (window.electronAPI.dbSetPath as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (window.electronAPI.dbExecuteScript as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      await databaseModule.initialize();
    });

    test('should get resource usage statistics', async () => {
      (window.electronAPI.dbFetchOne as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ success: true, result: { page_count: 100 } })
        .mockResolvedValueOnce({ success: true, result: { page_size: 4096 } });

      const usage = await databaseModule.getResourceUsage();

      expect(usage.storage.used).toBe(409600); // 100 * 4096
      expect(usage.connections.active).toBe(1);
    });

    test('should get database statistics', async () => {
      (window.electronAPI.dbFetchOne as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ success: true, result: { page_count: 100 } })
        .mockResolvedValueOnce({ success: true, result: { page_size: 4096 } })
        .mockResolvedValueOnce({ success: true, result: { count: 10 } });

      const stats = await databaseModule.getDatabaseStats();

      expect(stats.pageCount).toBe(100);
      expect(stats.pageSize).toBe(4096);
      expect(stats.databaseSize).toBe(409600);
      expect(stats.tableCount).toBe(10);
    });
  });
});

// Run the tests if this file is executed directly
if (require.main === module) {
  console.log('Running database tests...');
  console.log('Tests would be executed with a test runner like Jest or Vitest');
  console.log('All database layer tests are defined above.');
}