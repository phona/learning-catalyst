/**
 * Mock Database Services
 *
 * Comprehensive mock framework for database operations including
 * Kysely database, connection pooling, transactions, migrations,
 * and query execution. Enables testing of database-dependent services
 * without requiring actual database connections.
 */

import { vi } from 'vitest';

interface MockMigration {
  id: string;
  name: string;
  sql: string;
  applied: boolean;
  appliedAt: number | null;
}

// Mock Database Connection
export const mockDatabase = {
  connection: {
    filename: ':memory:',
    maxConnections: 5,
    connectionTimeout: 5000,
    queryTimeout: 10000,
  },

  // Mock connection status
  connected: true,
  closed: false,

  // Mock query execution
  fetchOne: vi.fn().mockImplementation(async (query: string, params?: any[]) => {
    // Simulate query delay
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Handle different query types
    if (query.includes('SELECT 1')) {
      return { test: 1 };
    }

    if (query.includes('sessions') && query.includes('WHERE id =')) {
      return {
        id: 1,
        title: 'Mock Session',
        messages: JSON.stringify([]),
        created_at: Date.now(),
        updated_at: Date.now(),
      };
    }

    if (query.includes('concepts') && query.includes('WHERE id =')) {
      return {
        id: 1,
        name: 'Mock Concept',
        description: 'Mock concept description',
        metadata: JSON.stringify({ difficulty: 'intermediate' }),
        created_at: Date.now(),
      };
    }

    if (query.includes('analytics') && query.includes('WHERE session_id =')) {
      return {
        session_id: 1,
        tokens_used: 150,
        response_time: 2500,
        model_used: 'gpt-3.5-turbo',
        timestamp: Date.now(),
      };
    }

    // Default mock response
    return null;
  }),

  fetchAll: vi.fn().mockImplementation(async (query: string, params?: any[]) => {
    await new Promise((resolve) => setTimeout(resolve, 15));

    if (query.includes('sessions') && !query.includes('WHERE')) {
      return [
        {
          id: 1,
          title: 'Mock Session 1',
          messages: JSON.stringify([]),
          created_at: Date.now() - 86400000,
          updated_at: Date.now() - 86400000,
        },
        {
          id: 2,
          title: 'Mock Session 2',
          messages: JSON.stringify([
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
          ]),
          created_at: Date.now() - 43200000,
          updated_at: Date.now() - 43200000,
        },
      ];
    }

    if (query.includes('concepts')) {
      return [
        {
          id: 1,
          name: 'JavaScript',
          description: 'Programming language for web development',
          metadata: JSON.stringify({ difficulty: 'intermediate', category: 'programming' }),
          created_at: Date.now(),
        },
        {
          id: 2,
          name: 'React',
          description: 'JavaScript library for building user interfaces',
          metadata: JSON.stringify({ difficulty: 'intermediate', category: 'framework' }),
          created_at: Date.now(),
        },
      ];
    }

    if (query.includes('analytics') && query.includes('WHERE session_id =')) {
      return [
        {
          session_id: 1,
          tokens_used: 150,
          response_time: 2500,
          model_used: 'gpt-3.5-turbo',
          timestamp: Date.now() - 3600000,
        },
        {
          session_id: 1,
          tokens_used: 200,
          response_time: 3200,
          model_used: 'gpt-3.5-turbo',
          timestamp: Date.now() - 1800000,
        },
      ];
    }

    return [];
  }),

  executeQuery: vi.fn().mockImplementation(async (query: string, params?: any[]) => {
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Handle INSERT operations
    if (query.includes('INSERT INTO sessions')) {
      return {
        insertId: Math.floor(Math.random() * 1000) + 100,
        affectedRows: 1,
        lastID: Math.floor(Math.random() * 1000) + 100,
      };
    }

    // Handle UPDATE operations
    if (query.includes('UPDATE sessions')) {
      return {
        affectedRows: 1,
        changes: 1,
      };
    }

    // Handle DELETE operations
    if (query.includes('DELETE FROM')) {
      return {
        affectedRows: 1,
        changes: 1,
      };
    }

    // Handle CREATE TABLE
    if (query.includes('CREATE TABLE')) {
      return { success: true };
    }

    // Handle ALTER TABLE
    if (query.includes('ALTER TABLE')) {
      return { success: true };
    }

    return { success: true };
  }),

  // Mock transaction support
  transaction: vi.fn().mockImplementation(async (fn: any) => {
    const mockTx = {
      executeQuery: mockDatabase.executeQuery,
      fetchOne: mockDatabase.fetchOne,
      fetchAll: mockDatabase.fetchAll,
      rollback: vi.fn(),
      commit: vi.fn(),
    };

    try {
      const result = await fn(mockTx);
      mockTx.commit();
      return result;
    } catch (error) {
      mockTx.rollback();
      throw error;
    }
  }),

  // Mock connection management
  close: vi.fn().mockImplementation(async function () {
    mockDatabase.connected = false;
    mockDatabase.closed = true;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }),

  // Mock database health check
  ping: vi.fn().mockImplementation(async () => {
    await mockDatabase.fetchOne('SELECT 1');
    return true;
  }),

  // Mock connection pool
  getConnectionStats: vi.fn().mockReturnValue({
    active: 2,
    idle: 3,
    total: 5,
    maxConnections: 5,
    waiting: 0,
  }),

  // Test helper methods
  _resetMocks: function () {
    mockDatabase.fetchOne.mockClear();
    mockDatabase.fetchAll.mockClear();
    mockDatabase.executeQuery.mockClear();
    mockDatabase.transaction.mockClear();
    mockDatabase.connected = true;
    mockDatabase.closed = false;
  },

  _simulateConnectionFailure: function () {
    mockDatabase.connected = false;
    mockDatabase.fetchOne.mockRejectedValue(new Error('Database connection failed'));
    mockDatabase.fetchAll.mockRejectedValue(new Error('Database connection failed'));
    mockDatabase.executeQuery.mockRejectedValue(new Error('Database connection failed'));
  },

  _restoreConnection: function () {
    mockDatabase.connected = true;
    mockDatabase._resetMocks();
  },
};

// Mock Kysely Database Interface
export const mockKyselyDatabase = {
  // Mock schema introspection
  schema: {
    concepts: {
      id: {
        dataType: 'integer',
        isAutoIncrementing: true,
        isNullable: false,
      },
      name: {
        dataType: 'text',
        isAutoIncrementing: false,
        isNullable: false,
      },
      description: {
        dataType: 'text',
        isAutoIncrementing: false,
        isNullable: true,
      },
      metadata: {
        dataType: 'text',
        isAutoIncrementing: false,
        isNullable: true,
      },
      created_at: {
        dataType: 'integer',
        isAutoIncrementing: false,
        isNullable: false,
      },
    },
    sessions: {
      id: {
        dataType: 'integer',
        isAutoIncrementing: true,
        isNullable: false,
      },
      title: {
        dataType: 'text',
        isAutoIncrementing: false,
        isNullable: false,
      },
      messages: {
        dataType: 'text',
        isAutoIncrementing: false,
        isNullable: true,
      },
      created_at: {
        dataType: 'integer',
        isAutoIncrementing: false,
        isNullable: false,
      },
      updated_at: {
        dataType: 'integer',
        isAutoIncrementing: false,
        isNullable: false,
      },
    },
    analytics: {
      id: {
        dataType: 'integer',
        isAutoIncrementing: true,
        isNullable: false,
      },
      session_id: {
        dataType: 'integer',
        isAutoIncrementing: false,
        isNullable: false,
      },
      tokens_used: {
        dataType: 'integer',
        isAutoIncrementing: false,
        isNullable: false,
      },
      response_time: {
        dataType: 'integer',
        isAutoIncrementing: false,
        isNullable: false,
      },
      model_used: {
        dataType: 'text',
        isAutoIncrementing: false,
        isNullable: false,
      },
      timestamp: {
        dataType: 'integer',
        isAutoIncrementing: false,
        isNullable: false,
      },
    },
  },

  // Mock query builder for concepts
  selectFrom: vi.fn().mockImplementation((table: string) => ({
    where: vi.fn().mockImplementation((condition: any) => ({
      execute: vi.fn().mockImplementation(async () => {
        if (table === 'concepts' && typeof condition === 'function') {
          return mockDatabase.fetchAll(`SELECT * FROM ${table}`);
        }
        return [];
      }),
      executeTakeFirst: vi.fn().mockImplementation(async () => {
        if (table === 'concepts') {
          return mockDatabase.fetchOne(`SELECT * FROM ${table} WHERE id = 1`);
        }
        return null;
      }),
    })),
    selectAll: vi.fn().mockImplementation(() => ({
      execute: vi.fn().mockImplementation(async () => {
        return mockDatabase.fetchAll(`SELECT * FROM ${table}`);
      }),
    })),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
  })),

  // Mock insert operations
  insertInto: vi.fn().mockImplementation((table: string) => ({
    values: vi.fn().mockImplementation((data: any) => ({
      execute: vi.fn().mockImplementation(async () => {
        return mockDatabase.executeQuery(`INSERT INTO ${table} ...`, data);
      }),
      returning: vi.fn().mockReturnThis(),
    })),
  })),

  // Mock update operations
  updateTable: vi.fn().mockImplementation((table: string) => ({
    set: vi.fn().mockImplementation((data: any) => ({
      where: vi.fn().mockImplementation((condition: any) => ({
        execute: vi.fn().mockImplementation(async () => {
          return mockDatabase.executeQuery(`UPDATE ${table} SET ...`, data);
        }),
      })),
    })),
  })),

  // Mock delete operations
  deleteFrom: vi.fn().mockImplementation((table: string) => ({
    where: vi.fn().mockImplementation((condition: any) => ({
      execute: vi.fn().mockImplementation(async () => {
        return mockDatabase.executeQuery(`DELETE FROM ${table} WHERE ...`);
      }),
    })),
  })),

  // Mock transaction support - supports both patterns:
  // - transaction(fn)
  // - transaction().execute(fn)
  transaction: vi.fn().mockImplementation((fn?: any) => {
    // If no function provided, return object with execute method
    if (!fn) {
      return {
        execute: vi.fn().mockImplementation(async (executeFn: any) => {
          const tx = mockKyselyDatabase; // Use same mock interface
          try {
            return await executeFn(tx);
          } catch (error) {
            throw error;
          }
        }),
      };
    }

    // If function provided, use old pattern
    const tx = mockKyselyDatabase; // Use same mock interface
    try {
      return fn(tx);
    } catch (error) {
      throw error;
    }
  }),

  // Mock connection methods
  destroy: vi.fn().mockImplementation(async () => {
    await mockDatabase.close();
  }),

  // Test helpers
  _clearMocks: function () {
    mockKyselyDatabase.selectFrom.mockClear();
    mockKyselyDatabase.insertInto.mockClear();
    mockKyselyDatabase.updateTable.mockClear();
    mockKyselyDatabase.deleteFrom.mockClear();
    mockKyselyDatabase.transaction.mockClear();
  },
};

// Mock Migration System
export const mockMigrations = {
  migrations: [
    {
      id: '20251029_create_sessions',
      name: 'Create sessions table',
      sql: 'CREATE TABLE sessions...',
      applied: true,
      appliedAt: Date.now(),
    },
    {
      id: '20251029_create_concepts',
      name: 'Create concepts table',
      sql: 'CREATE TABLE concepts...',
      applied: true,
      appliedAt: Date.now(),
    },
    {
      id: '20251029_create_analytics',
      name: 'Create analytics table',
      sql: 'CREATE TABLE analytics...',
      applied: false,
      appliedAt: null,
    },
  ] as MockMigration[],

  // Mock migration execution
  runMigrations: vi.fn().mockImplementation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Mark pending migrations as applied
    mockMigrations.migrations = mockMigrations.migrations.map((mig) => ({
      ...mig,
      applied: true,
      appliedAt: Date.now(),
    }));

    return {
      applied: mockMigrations.migrations.length,
      skipped: 0,
      failed: 0,
    };
  }),

  // Mock migration status
  getPendingMigrations: vi.fn().mockImplementation(async () => {
    return mockMigrations.migrations.filter((mig) => !mig.applied);
  }),

  getAppliedMigrations: vi.fn().mockImplementation(async () => {
    return mockMigrations.migrations.filter((mig) => mig.applied);
  }),

  // Mock rollback
  rollbackMigration: vi.fn().mockImplementation(async (migrationId: string) => {
    const migration = mockMigrations.migrations.find((mig) => mig.id === migrationId);
    if (migration?.applied) {
      migration.applied = false;
      migration.appliedAt = null;
      return true;
    }
    return false;
  }),

  // Test helpers
  _addPendingMigration: function (migration: any) {
    mockMigrations.migrations.push({ ...migration, applied: false, appliedAt: null });
  },

  _reset: function () {
    mockMigrations.migrations = mockMigrations.migrations.map((mig, index) => ({
      ...mig,
      applied: index < 2, // First two are applied
      appliedAt: index < 2 ? Date.now() : null,
    }));
    mockMigrations.runMigrations.mockClear();
  },
};

// Mock Database Factory
export const mockDatabaseFactory = {
  instances: new Map(),

  create: vi.fn().mockImplementation(async (config: any) => {
    const instanceId = config.filename || 'default';

    if (mockDatabaseFactory.instances.has(instanceId)) {
      return mockDatabaseFactory.instances.get(instanceId);
    }

    const db = { ...mockDatabase };
    db.connection = { ...db.connection, ...config };

    mockDatabaseFactory.instances.set(instanceId, db);
    return db;
  }),

  getInstance: vi.fn().mockImplementation((instanceId = 'default') => {
    return mockDatabaseFactory.instances.get(instanceId) || null;
  }),

  closeInstance: vi.fn().mockImplementation(async (instanceId = 'default') => {
    const instance = mockDatabaseFactory.instances.get(instanceId);
    if (instance) {
      await instance.close();
      mockDatabaseFactory.instances.delete(instanceId);
    }
  }),

  closeAll: vi.fn().mockImplementation(async () => {
    const closePromises = Array.from(mockDatabaseFactory.instances.values()).map((instance) =>
      instance.close(),
    );
    await Promise.all(closePromises);
    mockDatabaseFactory.instances.clear();
  }),

  // Test helpers
  _reset: function () {
    mockDatabaseFactory.instances.clear();
    mockDatabaseFactory.create.mockClear();
  },
};

// Mock Database Health Monitor
export const mockDatabaseHealthMonitor = (() => {
  const healthStatus = {
    status: 'healthy',
    lastCheck: Date.now(),
    metrics: {
      connected: true,
      queryTime: 25,
      connectionPool: {
        active: 2,
        idle: 3,
        total: 5,
      },
    },
  };

  const checkHealth = vi.fn().mockImplementation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
    healthStatus.lastCheck = Date.now();
    healthStatus.metrics.connectionPool = mockDatabase.getConnectionStats();
    return { ...healthStatus };
  });

  const startMonitoring = vi.fn().mockImplementation((intervalMs = 30000) => {
    return setInterval(() => {
      checkHealth();
    }, intervalMs);
  });

  const stopMonitoring = vi.fn().mockImplementation((intervalId: any) => {
    clearInterval(intervalId);
  });

  const api = {
    healthStatus,
    checkHealth,
    startMonitoring,
    stopMonitoring,
    _simulateUnhealthy: function () {
      healthStatus.status = 'unhealthy';
      healthStatus.metrics.connected = false;
      healthStatus.metrics.queryTime = 5000;
    },
    _simulateDegraded: function () {
      healthStatus.status = 'degraded';
      healthStatus.metrics.queryTime = 500;
    },
    _restoreHealthy: function () {
      healthStatus.status = 'healthy';
      healthStatus.metrics.connected = true;
      healthStatus.metrics.queryTime = 25;
    },
  };

  return api;
})();

// Export comprehensive mock collection
export const DatabaseMocks = {
  // Core database
  Database: mockDatabase,
  KyselyDatabase: mockKyselyDatabase,
  DatabaseFactory: mockDatabaseFactory,

  // Migrations
  Migrations: mockMigrations,

  // Health monitoring
  HealthMonitor: mockDatabaseHealthMonitor,
};

// Export default mock collection
export default DatabaseMocks;
