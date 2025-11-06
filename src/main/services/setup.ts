/**
 * Test setup utilities for main process services
 */

import { vi } from 'vitest';
import type { KyselyDatabase } from './database/kysely-database';
import type { LoggerFactory } from './logger';

// Mock database implementation
export const mockDatabase = {
  select: vi.fn(),
  selectFrom: vi.fn(() => ({
    selectAll: vi.fn(() => ({
      where: vi.fn(() => ({
        execute: vi.fn(() => Promise.resolve([])),
        executeTakeFirst: vi.fn(() => Promise.resolve(undefined))
      })),
      orderBy: vi.fn(() => ({
        execute: vi.fn(() => Promise.resolve([])),
        executeTakeFirst: vi.fn(() => Promise.resolve(undefined))
      })),
      limit: vi.fn(() => ({
        offset: vi.fn(() => ({
          execute: vi.fn(() => Promise.resolve([])),
          executeTakeFirst: vi.fn(() => Promise.resolve(undefined))
        }))
      })),
      execute: vi.fn(() => Promise.resolve([])),
      executeTakeFirst: vi.fn(() => Promise.resolve(undefined))
    })),
    where: vi.fn(() => ({
      selectAll: vi.fn(() => ({
        execute: vi.fn(() => Promise.resolve([])),
        executeTakeFirst: vi.fn(() => Promise.resolve(undefined))
      })),
      orderBy: vi.fn(() => ({
        execute: vi.fn(() => Promise.resolve([])),
        executeTakeFirst: vi.fn(() => Promise.resolve(undefined))
      })),
      execute: vi.fn(() => Promise.resolve([])),
      executeTakeFirst: vi.fn(() => Promise.resolve(undefined))
    }))
  })),
  insert: vi.fn(),
  insertInto: vi.fn(() => ({
    values: vi.fn(() => ({
      execute: vi.fn(() => Promise.resolve({ insertId: 1 })),
      executeTakeFirst: vi.fn(() => Promise.resolve({ insertId: 1 })),
      onConflict: vi.fn(() => ({
        column: vi.fn(() => ({
          doUpdateSet: vi.fn(() => ({
            execute: vi.fn(() => Promise.resolve({ insertId: 1 })),
            executeTakeFirst: vi.fn(() => Promise.resolve({ insertId: 1 }))
          }))
        }))
      })),
      returning: vi.fn(() => ({
        execute: vi.fn(() => Promise.resolve([])),
        executeTakeFirst: vi.fn(() => Promise.resolve(undefined))
      }))
    }))
  })),
  update: vi.fn(),
  updateTable: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        execute: vi.fn(() => Promise.resolve({ numUpdatedRows: 1 })),
        executeTakeFirst: vi.fn(() => Promise.resolve({ numUpdatedRows: 1 }))
      }))
    }))
  })),
  delete: vi.fn(),
  deleteFrom: vi.fn(() => ({
    where: vi.fn(() => ({
      execute: vi.fn(() => Promise.resolve({ numDeletedRows: 1 })),
      executeTakeFirst: vi.fn(() => Promise.resolve({ numDeletedRows: 1 }))
    }))
  })),
  execute: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn(),
  close: vi.fn(),
} as unknown as KyselyDatabase;

// Mock logger factory
export const mockLoggerFactory = {
  createContextAwareLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  })),
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  })),
} as LoggerFactory;

// Mock AsyncLocalStorage
export const mockAsyncLocalStorage = {
  getStore: vi.fn(),
  run: vi.fn((store, fn) => {
    // Execute the function with the mock context
    return fn();
  }),
  exit: vi.fn(),
  enterWith: vi.fn(),
};

// Common test utilities
export const TestUtils = {
  // Create mock service context
  createMockContext: (overrides = {}) => ({
    sessionId: 'test-session-id',
    userId: 'test-user',
    requestId: 'test-request-id',
    timestamp: new Date(),
    ...overrides,
  }),

  // Create mock agent configuration
  createMockAgentConfig: (overrides = {}) => ({
    id: 'test-agent',
    name: 'Test Agent',
    type: 'learning' as const,
    description: 'Test agent for unit tests',
    modelConfig: {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000,
    },
    tools: [],
    capabilities: ['text-generation'],
    metadata: {},
    ...overrides,
  }),

  // Create mock execution request
  createMockExecutionRequest: (overrides = {}) => ({
    agentId: 'test-agent',
    context: TestUtils.createMockContext(),
    input: {
      type: 'text',
      content: 'Test input',
    },
    options: {
      timeout: 30000,
      streamResponse: false,
    },
    ...overrides,
  }),

  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate test IDs
  generateId: () => `test-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
};

// Create mock logger
export const createMockLogger = () => ({
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  trace: vi.fn(),
});

// Create mock database
export const createMockDatabase = () => mockDatabase;

// Create mock AsyncLocalStorage
export const createMockAsyncLocalStorage = () => mockAsyncLocalStorage;

// Export common vi functions for convenience
export { vi };