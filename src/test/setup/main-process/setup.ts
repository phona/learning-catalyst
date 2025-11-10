/**
 * Consolidated Main Process Test Setup
 *
 * Consolidates and centralizes all main process testing utilities including:
 * - Mock services (database, logger, async storage)
 * - Mock Electron APIs
 * - Test environment configuration
 * - Common test utilities and helpers
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import type { Kysely, Database } from 'kysely';
import type { AsyncLocalStorage } from 'async_hooks';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.VITEST = 'true';

// Mock Electron APIs for main process testing
const mockElectron = {
  app: {
    getPath: (name: string) => {
      switch (name) {
        case 'userData':
          return './test-data';
        default:
          return '.';
      }
    }
  },
  ipcMain: {
    handle: () => {},
    removeHandler: () => {},
    on: () => {},
    removeAllListeners: () => {}
  },
  MessageChannelMain: class MockMessageChannelMain {
    port1 = { postMessage: () => {}, close: () => {}, closed: false };
    port2 = { postMessage: () => {}, close: () => {}, closed: false };
  }
};

// Mock Node.js modules
const mockFs = {
  readFile: async () => 'mock file content',
  writeFile: async () => {},
  exists: async () => true
};

/**
 * Main process test environment setup
 */
beforeAll(async () => {
  // Set up test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LC_LOG_LEVEL = 'debug';
  process.env.LC_DB_MAX_CONNECTIONS = '5';
  process.env.LC_AGENTS_MAX_CONCURRENT = '2';

  // Mock global objects
  (global as any).require = (moduleName: string) => {
    switch (moduleName) {
      case 'electron':
        return mockElectron;
      case 'fs/promises':
        return mockFs;
      default:
        return {};
    }
  };

  console.log('🧪 Main process test environment initialized');
});

/**
 * Global cleanup after all tests
 */
afterAll(async () => {
  console.log('✅ Main process test environment cleaned up');
});

/**
 * Mock console methods to reduce noise in tests
 */
Object.defineProperty(console, 'log', {
  value: vi.fn(() => {}),
  writable: true
});

Object.defineProperty(console, 'warn', {
  value: vi.fn(() => {}),
  writable: true
});

Object.defineProperty(console, 'error', {
  value: vi.fn(() => {}),
  writable: true
});

// Global cleanup
afterEach(() => {
  vi.clearAllMocks();
});

// ==================== MOCK IMPLEMENTATIONS ====================

/**
 * Create comprehensive Kysely database mock
 * Optimized mock implementation that supports both transaction patterns:
 * - transaction(fn)
 * - transaction().execute(fn)
 */
export function createMockDatabase(): Kysely<Database> {
  const createQueryBuilder = () => ({
    select: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    selectFrom: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    whereRef: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    orderByDesc: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    having: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
    executeTakeFirst: vi.fn().mockResolvedValue(null),
    executeTakeFirstOrThrow: vi.fn().mockResolvedValue(null),
    returning: vi.fn().mockReturnThis(),
    returningAll: vi.fn().mockReturnThis()
  });

  const mockQueryBuilder = createQueryBuilder();

  const mockDb = {
    selectFrom: vi.fn().mockReturnValue(mockQueryBuilder),
    select: vi.fn().mockReturnValue(mockQueryBuilder),
    insertInto: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue({ insertId: 1 }),
        executeTakeFirst: vi.fn().mockResolvedValue({ insertId: 1 }),
        executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ insertId: 1 }),
        returning: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([]),
          executeTakeFirst: vi.fn().mockResolvedValue(null),
          executeTakeFirstOrThrow: vi.fn().mockResolvedValue(null)
        }),
        returningAll: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([]),
          executeTakeFirst: vi.fn().mockResolvedValue(null),
          executeTakeFirstOrThrow: vi.fn().mockResolvedValue(null)
        }),
        onConflict: vi.fn().mockReturnValue({
          column: vi.fn().mockReturnValue({
            doUpdateSet: vi.fn().mockReturnValue({
              execute: vi.fn().mockResolvedValue({ insertId: 1 }),
              executeTakeFirst: vi.fn().mockResolvedValue({ insertId: 1 }),
              executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ insertId: 1 })
            })
          })
        })
      })
    }),
    updateTable: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue(mockQueryBuilder)
    }),
    deleteFrom: vi.fn().mockReturnValue(mockQueryBuilder),
    // Enhanced transaction support - supports both patterns
    transaction: vi.fn().mockImplementation((fn?: any) => {
      if (!fn) {
        // Return object with execute method for transaction().execute(fn) pattern
        return {
          execute: vi.fn().mockImplementation(async (executeFn: any) => {
            const tx = createQueryBuilder();
            try {
              return await executeFn(tx);
            } catch (error) {
              throw error;
            }
          })
        };
      }
      // Support transaction(fn) pattern
      const tx = createQueryBuilder();
      try {
        return fn(tx);
      } catch (error) {
        throw error;
      }
    }),
    close: vi.fn().mockResolvedValue(undefined),
    connected: true,
    _simulateConnectionFailure: () => {
      mockDb.connected = false;
      mockQueryBuilder.execute.mockRejectedValue(new Error('Database connection failed'));
    },
    _resetMocks: () => {
      Object.values(mockDb).forEach(value => {
        if (typeof value === 'function') {
          value.mockReset?.();
        }
      });
      Object.values(mockQueryBuilder).forEach(value => {
        if (typeof value === 'function') {
          value.mockReset?.();
        }
      });
      mockDb.connected = true;
      mockQueryBuilder.execute.mockResolvedValue([]);
      mockQueryBuilder.executeTakeFirst.mockResolvedValue(null);
      mockQueryBuilder.executeTakeFirstOrThrow.mockResolvedValue(null);
    }
  } as any;

  return mockDb;
}

/**
 * Create comprehensive logger mock
 */
export function createMockLogger() {
  const logger = {
    info: vi.fn().mockReturnValue(undefined),
    error: vi.fn().mockReturnValue(undefined),
    warn: vi.fn().mockReturnValue(undefined),
    debug: vi.fn().mockReturnValue(undefined),
    trace: vi.fn().mockReturnValue(undefined),
    child: vi.fn().mockReturnThis(),
    getLogEntries: () => ({
      info: logger.info.mock.calls,
      error: logger.error.mock.calls,
      warn: logger.warn.mock.calls,
      debug: logger.debug.mock.calls,
      trace: logger.trace.mock.calls
    }),
    reset: () => {
      Object.values(logger).forEach(value => {
        if (typeof value === 'function') {
          value.mockReset?.()
        }
      })
    }
  }
  return logger;
}

// AsyncLocalStorage is a native Node.js API - no need to mock it
// It should be tested through its behavior, not implementation

// ==================== TEST UTILITIES ====================

/**
 * Create mock service context
 */
export function createMockContext(sessionId: string = 'test-session', operation: string = 'test') {
  return {
    id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId,
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    operation,
    metadata: { test: true }
  };
}

/**
 * Create mock agent configuration
 */
export function createMockAgentConfig(agentId: string = 'test-agent', type: string = 'learning') {
  return {
    id: agentId,
    name: `Test ${type} Agent`,
    type: type as any,
    description: 'Test agent for unit tests',
    modelConfig: {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000,
      timeout: 30000
    },
    tools: ['database-query', 'file-read'],
    systemPrompt: 'You are a test assistant.',
    capabilities: ['text-generation', 'analysis'],
    enabled: true,
    metadata: {
      version: '1.0.0',
      author: 'test-suite'
    }
  };
}

/**
 * Create mock AI provider
 */
export function createMockAIProvider() {
  return {
    name: 'openai',
    config: {
      name: 'gpt-3.5-turbo',
      apiKey: 'test-key'
    },
    chat: async () => ({ content: 'Mock response' }),
    models: async () => [{ id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }]
  };
}

/**
 * Create mock tool execution request
 */
export function createMockToolRequest(toolId: string = 'test-tool', operation: string = 'test') {
  return {
    toolId,
    operation,
    parameters: { test: true },
    context: createMockContext()
  };
}

/**
 * Wait for async operation with timeout
 */
export async function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate test IDs
 */
export function generateId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// ==================== CONSOLIDATED EXPORTS ====================

export const TestUtils = {
  createMockContext,
  createMockAgentConfig,
  createMockAIProvider,
  waitFor,
  createMockToolRequest,
  generateId
};

// Export mock implementations
export { mockElectron, mockFs };

// Export type aliases
export type MockDatabaseType = ReturnType<typeof createMockDatabase>;
export type MockLoggerType = ReturnType<typeof createMockLogger>;
export type MockAsyncStorageType = ReturnType<typeof createMockAsyncLocalStorage>;