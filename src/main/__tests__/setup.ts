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
 * Test utilities for main thread testing
 */
export const TestUtils = {
  /**
   * Create a mock service context
   */
  createMockContext(sessionId: string = 'test-session', operation: string = 'test') {
    return {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      operation,
      metadata: { test: true }
    };
  },

  /**
   * Create a mock agent configuration
   */
  createMockAgentConfig(agentId: string = 'test-agent', type: string = 'concept-parser') {
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
  },

  /**
   * Create a mock AI provider
   */
  createMockAIProvider() {
    return {
      name: 'openai',
      config: {
        name: 'gpt-3.5-turbo',
        apiKey: 'test-key'
      },
      chat: async () => ({ content: 'Mock response' }),
      models: async () => [{ id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }]
    };
  },

  /**
   * Wait for async operation with timeout
   */
  async waitFor(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Create a mock tool execution request
   */
  createMockToolRequest(toolId: string = 'test-tool', operation: string = 'test') {
    return {
      toolId,
      operation,
      parameters: { test: true },
      context: this.createMockContext()
    };
  },

  /**
   * Get test database path
   */
  getTestDatabasePath(): string {
    return './test-database.sqlite';
  },

  /**
   * Clean up test database
   */
  async cleanupTestDatabase(): Promise<void> {
    const fs = require('fs/promises');
    try {
      await fs.unlink(this.getTestDatabasePath());
    } catch (error) {
      // Ignore file not found errors
    }
  }
};

// Export test utilities for use in test files
export { mockDatabase, mockElectron, mockFs };