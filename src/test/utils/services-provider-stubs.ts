import { vi } from 'vitest';
import type { AppConfig, ProviderConfig } from '@/shared/types/config';
import type { ConfigurationService } from '@/renderer/services/configuration/configuration-service';

// ==================== ERROR TESTING UTILITIES ====================

export interface IPCErrorShape {
  type: string;
  code: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * Creates a realistic IPC error object that mimics production errors
 */
export function createIPCErrorMock(overrides: Partial<IPCErrorShape> = {}): IPCErrorShape {
  return {
    type: 'IPC_ERROR',
    code: 'NO_HANDLER',
    message: 'No handler registered for channel',
    details: { channel: 'test-channel' },
    ...overrides,
  };
}

/**
 * Creates a specific "No handler registered" error for deprecated catalyst methods
 */
export function createNoHandlerError(channel: string): IPCErrorShape {
  return createIPCErrorMock({
    code: 'NO_HANDLER',
    message: `No handler registered for '${channel}'`,
    details: {
      channel,
      suggestion: 'This method may be deprecated or not yet implemented'
    }
  });
}

/**
 * Creates error objects that would cause React rendering errors if not handled properly
 */
export function createProblematicDataObjects() {
  return {
    // This object would cause "Objects are not valid as a React child" error
    apiResponseObject: {
      success: true,
      data: 'test',
      timestamp: Date.now()
    },

    // Error response object that might be accidentally rendered
    errorResponseObject: {
      success: false,
      error: {
        type: 'IPC_ERROR',
        code: 'VALIDATION_ERROR',
        message: 'Invalid input'
      },
      timestamp: Date.now()
    },

    // Array containing objects - also dangerous for React rendering
    mixedArray: ['string', 42, { id: 1, name: 'object' }],

    // Date object - would cause React error if rendered directly
    dateObject: new Date(),

    // Nested error structure
    nestedError: {
      level1: {
        level2: {
          error: {
            code: 'NESTED_ERROR',
            message: 'This would break React if rendered'
          }
        }
      }
    }
  };
}

/**
 * Mock data that specifically tests React render safety constraints
 */
export function createRenderSafetyTestCases() {
  return {
    // Safe values that React can render
    safeValues: [
      'string value',
      42,
      0,
      '',
      null,
      undefined,
      true,
      false
    ],

    // Unsafe values that would cause React errors
    unsafeValues: [
      { object: 'value' },
      [1, 2, { nested: 'object' }],
      new Date(),
      () => 'function',
      Symbol('test')
    ],

    // Problematic API responses that might accidentally be rendered
    problematicResponses: {
      successObject: { success: true, data: 'test', timestamp: Date.now() },
      errorObject: { success: false, error: { code: 'ERROR', message: 'Failed' } },
      mixedObject: { valid: 'string', invalid: { nested: 'object' } }
    }
  };
}

type FileServiceStub = {
  showOpenDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  readFile: () => Promise<{
    success: true;
    data: { content: string; fileName: string };
  }>;
  writeFile: () => Promise<{ success: true }>;
  existsFile: () => Promise<{ success: true; data: boolean }>;
  showSaveDialog: () => Promise<{ success: true; data: { canceled: boolean; filePath: string } }>;
  readDirectory: () => Promise<{ success: true; data: unknown[] }>;
  getWorkspacePath: () => Promise<{ success: true; data: string }>;
};

type ConfigurationServiceStub = ConfigurationService;

type ElectronAPIClientStub = {
  onIPCError: (callback: (payload: unknown) => void) => () => void;
};

export const createMockFileService = (): FileServiceStub => ({
  showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
  readFile: vi.fn().mockResolvedValue({
    success: true,
    data: {
      content: '',
      fileName: 'mock.txt',
    },
  }),
  writeFile: vi.fn().mockResolvedValue({ success: true }),
  existsFile: vi.fn().mockResolvedValue({ success: true, data: true }),
  showSaveDialog: vi
    .fn()
    .mockResolvedValue({ success: true, data: { canceled: true, filePath: '' } }),
  readDirectory: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getWorkspacePath: vi.fn().mockResolvedValue({ success: true, data: '/mock/workspace' }),
});

/**
 * Creates a file service mock that can produce realistic error responses
 */
export function createFileServiceWithErrors() {
  return {
    // Success case
    getWorkspacePath: vi.fn().mockResolvedValue({
      success: true,
      data: '/workspace'
    }),

    // Error cases
    readDirectory: vi.fn().mockImplementation((path: string) => {
      if (path === '/nonexistent') {
        return Promise.resolve({
          success: false,
          error: {
            code: 'DIRECTORY_NOT_FOUND',
            message: `Directory not found: ${path}`,
            details: { path, error: 'ENOENT' }
          }
        });
      }

      if (path === '/permission-denied') {
        return Promise.resolve({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: `Permission denied: ${path}`,
            details: { path, error: 'EACCES' }
          }
        });
      }

      // Success case
      return Promise.resolve({
        success: true,
        data: [
          { name: 'file1.md', type: 'file', path: '/workspace/file1.md' },
          { name: 'file2.ts', type: 'file', path: '/workspace/file2.ts' }
        ]
      });
    }),

    readFile: vi.fn().mockImplementation((path: string) => {
      if (path === '/workspace/error.json') {
        // Return an object that would cause "Objects are not valid as a React child" error
        return Promise.resolve({
          success: true,
          data: { success: true, timestamp: Date.now(), data: 'invalid' }
        });
      }

      return Promise.resolve({
        success: true,
        data: {
          content: '# File content',
          fileName: path.split('/').pop() || 'unknown.txt'
        }
      });
    })
  };
}

/**
 * Creates a catalyst service mock that includes deprecated methods
 * These deprecated methods would cause "No handler registered" errors in production
 */
export function createCatalystServiceWithDeprecatedMethods() {
  return {
    // Valid methods with proper implementations
    executeAgent: vi.fn().mockResolvedValue({ success: true, data: {} }),
    executeAgentStream: vi.fn(),
    cancelExecution: vi.fn().mockResolvedValue({ success: true }),
    sendChat: vi.fn().mockResolvedValue({
      success: true,
      data: {
        messageId: 'test-message-id',
        response: 'Test response',
      },
    }),
    sendChatStream: vi.fn().mockImplementation(async (message, options, onChunk) => {
      onChunk({ type: 'thinking', content: 'Thinking...', timestamp: Date.now() });
      onChunk({ type: 'content', content: 'Response content', timestamp: Date.now() });
      onChunk({ type: 'complete', content: '', timestamp: Date.now() });
      return { success: true, data: { messageId: 'test-stream-id' } };
    }),
    getSession: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'test-session', title: 'Test Session' },
    }),

    // Deprecated methods - these would cause IPC errors in production
    listAgents: vi.fn().mockImplementation(async () => {
      // Simulate "No handler registered" error
      const error = createNoHandlerError('catalyst:list-agents');
      throw error;
    }),

    getActiveExecutions: vi.fn().mockImplementation(async () => {
      // Simulate "No handler registered" error
      const error = createNoHandlerError('catalyst:get-active-executions');
      throw error;
    }),
  };
}

export const createMockConfigurationService = (
  config: AppConfig | null = null,
): ConfigurationServiceStub => ({
  getAvailableProviders: vi
    .fn()
    .mockResolvedValue({ success: true, providers: [], summary: { total: 0, connected: 0, configured: 0 } }),
  configureProvider: vi
    .fn()
    .mockResolvedValue({ providerId: 'mock', status: 'configured' }),
  validateProvider: vi.fn().mockResolvedValue({ success: true }),
  getProviderStatus: vi.fn().mockResolvedValue({
    status: 'not-configured',
    message: 'No AI Provider Configured',
    details: 'Test stub',
    providerInfo: null,
  }),
  getProviderModels: vi.fn().mockResolvedValue([]),
  getConfig: vi.fn().mockResolvedValue(config),
  setConfig: vi.fn().mockResolvedValue(undefined),
  saveConfig: vi.fn().mockResolvedValue(undefined),
});

export const createMockElectronAPIClient = (): ElectronAPIClientStub => ({
  onIPCError: vi.fn(() => () => undefined),
});
