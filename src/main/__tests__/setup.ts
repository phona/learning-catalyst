/**
 * Main Thread Test Setup
 *
 * Test configuration for main thread services with proper mocking
 * and environment setup for Vitest testing.
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { initializeCatalystService, disposeCatalystService } from '../services/catalyst/catalyst-service';
import { ServiceConfigManager } from '../services/config';
import { LoggerFactory } from '../services/logger';
import { MainThreadServiceRegistry } from '../services/registry';

// Mock Electron APIs for main thread testing
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

// Mock Node.js fs module
const mockFs = {
  readFile: async () => 'mock file content',
  writeFile: async () => {},
  exists: async () => true
};

// Mock database
const mockDatabase = {
  fetchAll: async () => [],
  fetchOne: async () => null,
  executeQuery: async () => ({}),
  close: async () => {}
};

/**
 * Setup main thread test environment
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

  console.log('🧪 Main thread test environment initialized');
});

/**
 * Cleanup after all tests
 */
afterAll(async () => {
  try {
    await disposeCatalystService();
    console.log('✅ Main thread test environment cleaned up');
  } catch (error) {
    console.error('❌ Error cleaning up main thread test environment:', error);
  }
});

/**
 * Setup before each test
 */
beforeEach(async () => {
  // Reset service registry for each test
  const registry = new MainThreadServiceRegistry();

  // Initialize test configuration
  const config = ServiceConfigManager.getInstance({
    database: {
      maxConnections: 5,
      connectionTimeout: 5000,
      queryTimeout: 10000
    },
    agents: {
      maxConcurrent: 2,
      defaultTimeout: 30000,
      maxIterations: 10
    },
    tools: {
      defaultTimeout: 5000,
      enableSandbox: false // Disable sandbox for testing
    },
    logging: {
      level: 'debug',
      maxLogSize: 1000,
      enableConsole: true
    }
  });

  // Initialize logger factory
  const loggerFactory = LoggerFactory.getInstance();
  const logger = loggerFactory.createContextAwareLogger();

  console.log('🔧 Test setup completed for individual test');
});

/**
 * Cleanup after each test
 */
afterEach(() => {
  // Clean up any remaining services
  const registry = new MainThreadServiceRegistry();
  registry.dispose().catch(console.error);
});

/**
 * Create a mock service context
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
 * Create a mock agent configuration
 */
export function createMockAgentConfig(agentId: string = 'test-agent', type: string = 'concept-parser') {
  return {
    id: agentId,
    name: `Test ${type} Agent`,
    type: type as any,
    modelConfig: {
      provider: {
        name: 'openai',
        config: {
          name: 'gpt-3.5-turbo',
          apiKey: 'test-key'
        }
      },
      modelId: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000,
      timeout: 30000
    },
    tools: ['database-query', 'file-read'],
    systemPrompt: 'You are a test assistant.',
    capabilities: ['text-generation', 'analysis'],
    enabled: true
  };
}

/**
 * Create a mock AI provider
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
 * Wait for async operation with timeout
 */
export async function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a mock tool execution request
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
 * Get test database path
 */
export function getTestDatabasePath(): string {
  return './test-database.sqlite';
}

/**
 * Clean up test database
 */
export async function cleanupTestDatabase(): Promise<void> {
  const fs = require('fs/promises');
  try {
    await fs.unlink(getTestDatabasePath());
  } catch (error) {
    // Ignore file not found errors
  }
}

/**
 * Test utilities for main thread testing
 */
export const TestUtils = {
  createMockContext,
  createMockAgentConfig,
  createMockAIProvider,
  waitFor,
  createMockToolRequest,
  createMockKyselyType() {
    const mockDb = createMockKyselyDatabase();
    return mockDb as any; // Cast to any to bypass strict typing
  },
  getTestDatabasePath,
  cleanupTestDatabase
};

/**
 * Create mock logger for testing
 */
export function createMockLogger() {
  return {
    info: vi.fn().mockReturnValue(undefined),
    warn: vi.fn().mockReturnValue(undefined),
    error: vi.fn().mockReturnValue(undefined),
    debug: vi.fn().mockReturnValue(undefined),
    verbose: vi.fn().mockReturnValue(undefined),
    child: vi.fn().mockReturnValue({}),
    createContextAwareLogger: vi.fn().mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn()
    })
  };
}

/**
 * Create mock AsyncLocalStorage for testing
 */
export function createMockAsyncLocalStorage() {
  return {
    run: vi.fn().mockImplementation((store, fn) => {
      return fn();
    }),
    getStore: vi.fn().mockReturnValue(new Map()),
    enterWith: vi.fn()
  };
}

/**
 * Create mock Kysely database for testing
 */
export function createMockKyselyDatabase() {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
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
    executeTakeFirstOrThrow: vi.fn().mockRejectedValue(new Error('No rows found'))
  };

  return {
    selectFrom: vi.fn().mockReturnValue(mockQueryBuilder),
    insertInto: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue({ insertId: 1 }),
        executeTakeFirst: vi.fn().mockResolvedValue({ insertId: 1 })
      })
    }),
    updateTable: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue(mockQueryBuilder)
    }),
    deleteFrom: vi.fn().mockReturnValue(mockQueryBuilder),
    transaction: vi.fn().mockImplementation(async (fn) => {
      return fn(createMockKyselyDatabase());
    }),
    close: vi.fn().mockResolvedValue(undefined)
  };
}

// Export type aliases for easier use in tests
export type MockDatabaseType = ReturnType<typeof createMockKyselyDatabase>;
export type MockKyselyDatabaseType = ReturnType<typeof createMockKyselyDatabase>;

// Export test utilities for use in test files
export { mockDatabase, mockElectron, mockFs };