/**
 * Integration Test Setup
 *
 * Global setup for integration tests including environment configuration,
 * service initialization, and test infrastructure preparation.
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { ElectronMainMocks } from '../utils/mocks/mock-electron-main';
import { LangChainMocks } from '../utils/mocks/mock-langchain';
import { DatabaseMocks } from '../utils/mocks/mock-database';
import { TestDatabaseFactory } from '../utils/factories/test-database-factory';
import { mockDatabaseService, mockErrorRecoveryManager, mockSystemHealthMonitor } from '../utils/mocks/mock-services';

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
 * Setup IPC integration test environment
 */
export async function setupIPCIntegrationTest() {
  // Create mock main and renderer processes
  const mockMainProcess = new EventEmitter();
  const mockRendererProcess = new EventEmitter();
  const messageChannel = ElectronMainMocks.MessageChannelMain();
  const ipcHandlers = new Map<string, Function>();

  // Set up mock invoke method for renderer
  mockRendererProcess.invoke = vi.fn().mockImplementation(async (channel: string, data: any) => {
    const handler = ipcHandlers.get(channel);
    if (handler) {
      try {
        const result = await handler({ sender: mockRendererProcess }, data);
        return result;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'IPC_ERROR',
          timestamp: Date.now()
        };
      }
    }
    return {
      success: false,
      error: `No handler for channel: ${channel}`,
      errorCode: 'NO_HANDLER',
      timestamp: Date.now()
    };
  });

  mockRendererProcess.invokeWithTimeout = vi.fn().mockImplementation(async (channel: string, data: any, timeout: number) => {
    const handler = ipcHandlers.get(channel);
    if (handler) {
      try {
        return await Promise.race([
          handler({ sender: mockRendererProcess }, data),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timeout')), timeout))
        ]);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'TIMEOUT',
          timestamp: Date.now()
        };
      }
    }
    return {
      success: false,
      error: `No handler for channel: ${channel}`,
      errorCode: 'NO_HANDLER',
      timestamp: Date.now()
    };
  });

  // Mock postMessage method for IPC communication
  mockRendererProcess.postMessage = vi.fn().mockImplementation((channel: string, data: any, transfer?: any[]) => {
    // Emit the message so tests can listen for it
    // The event should be the first parameter, data the second
    console.log(`📤 postMessage called: channel=${channel}, data=${JSON.stringify(data)}`);
    mockRendererProcess.emit(channel, { sender: mockRendererProcess }, data);
  });
  mockRendererProcess.disconnect = vi.fn();

  return {
    mainProcess: mockMainProcess,
    rendererProcess: mockRendererProcess,
    messageChannel,
    ipcHandlers
  };
}

/**
 * Cleanup IPC integration test environment
 */
export async function cleanupIPCIntegrationTest() {
  // Clean up event listeners and handlers
  // In a real implementation, you'd clean up any resources
  console.log('🧹 IPC integration test environment cleaned up');
}

/**
 * Setup integration test environment (comprehensive)
 */
export async function setupIntegrationTest() {
  // Initialize test environment with all required services
  const testEnvironment = await setupIPCIntegrationTest();

  // Add mock services to the environment
  const { mockCatalystService, mockLangChainService, mockElectronIPC } = await import('../utils/mocks/mock-services');

  return {
    ...testEnvironment,
    catalystService: mockCatalystService(),
    langChainService: mockLangChainService,
    databaseService: mockDatabaseService,
    errorRecoveryManager: mockErrorRecoveryManager,
    healthMonitor: mockSystemHealthMonitor,
    ipc: mockElectronIPC
  };
}

/**
 * Cleanup integration test environment (comprehensive)
 */
export async function cleanupIntegrationTest() {
  await cleanupIPCIntegrationTest();
  console.log('🧹 Comprehensive integration test environment cleaned up');
}

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