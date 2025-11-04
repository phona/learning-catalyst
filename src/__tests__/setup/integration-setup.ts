/**
 * Integration Test Setup
 *
 * Global setup for integration tests including environment configuration,
 * service initialization, and test infrastructure preparation.
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { ElectronMainMocks } from '../utils/mocks/mock-electron-main';
import { LangChainMocks } from '../utils/mocks/mock-langchain';
import { DatabaseMocks } from '../utils/mocks/mock-database';
import { TestDatabaseFactory } from '../utils/factories/test-database-factory';

/**
 * Setup integration test environment
 */
beforeAll(async () => {
  // Set up test environment variables
  process.env.NODE_ENV = 'test';
  process.env.INTEGRATION_TEST = 'true';

  // Mock Electron APIs
  global.require = vi.fn().mockImplementation((moduleName: string) => {
    switch (moduleName) {
      case 'electron':
        return ElectronMainMocks;
      case 'langchain':
        return LangChainMocks;
      default:
        return {};
    }
  });

  // Mock Node.js modules
  vi.mock('fs/promises', () => ({
    readFile: vi.fn().mockResolvedValue('mock file content'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(true)
  }));

  // Initialize test database
  await TestDatabaseFactory.createTestDatabase({
    name: 'integration-test-db',
    withData: true
  });

  console.log('🧪 Integration test environment initialized');
});

/**
 * Cleanup after all integration tests
 */
afterAll(async () => {
  // Clean up test databases
  await TestDatabaseFactory.dropAllTestDatabases();

  // Clear all mocks
  vi.clearAllMocks();

  console.log('✅ Integration test environment cleaned up');
});

/**
 * Setup before each integration test
 */
beforeEach(async () => {
  // Reset mock call counts
  vi.clearAllMocks();

  // Reset database to known state
  const testDb = TestDatabaseFactory.getTestDatabase('integration-test-db');
  if (testDb) {
    await TestDatabaseFactory.resetTestDatabase('integration-test-db');
    await TestDatabaseFactory.populateTestData('integration-test-db', {
      sessions: 2,
      concepts: 3,
      analytics: 5,
      checkpoints: 1
    });
  }
});

/**
 * Cleanup after each integration test
 */
afterEach(() => {
  // Clean up any test-specific state
  vi.restoreAllMocks();
});

/**
 * Integration test utilities
 */
export const IntegrationTestUtils = {
  /**
   * Create a mock Electron window
   */
  createMockWindow() {
    return ElectronMainMocks.BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
  },

  /**
   * Create mock MessageChannel for IPC testing
   */
  createMockMessageChannel() {
    return ElectronMainMocks.MessageChannelMain();
  },

  /**
   * Get test database instance
   */
  getTestDatabase() {
    return TestDatabaseFactory.getTestDatabase('integration-test-db');
  },

  /**
   * Wait for async operations
   */
  async waitFor(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Create mock user session
   */
  createMockSession(overrides?: any) {
    return {
      id: `integration-session-${Date.now()}`,
      title: 'Integration Test Session',
      messages: [
        { role: 'user', content: 'Hello', timestamp: Date.now() },
        { role: 'assistant', content: 'Hi there!', timestamp: Date.now() }
      ],
      created_at: Date.now(),
      updated_at: Date.now(),
      ...overrides
    };
  }
};