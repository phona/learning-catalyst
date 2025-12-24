import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupConceptParsingHandlers } from '../concept-parsing-handlers';

// Mock electron module
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

const mockIpcMain = {
  handle: vi.fn(),
};

describe('concept parsing handlers - error propagation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should propagate errors when concept parsing fails', async () => {
    const mockErrorLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    };

    const mockConceptParsingService = {
      parseMaterials: vi.fn().mockRejectedValue(new Error('providerName is undefined')),
      clearJobCache: vi.fn().mockResolvedValue({ removed: 0 }),
      rebuild: vi.fn().mockResolvedValue(undefined),
    };

    const mockLoggerService = {
      child: vi.fn().mockReturnValue(mockErrorLogger),
    };

    const mockConfigService = {
      get: vi.fn(),
      getConfig: vi.fn().mockResolvedValue({
        ai: {
          modelTypes: {
            chat: { provider: 'openai' },
          },
        },
      }),
      setConfig: vi.fn(),
      getProviderConfig: vi.fn(),
      setProviderConfig: vi.fn(),
      onConfigChanged: vi.fn(),
      isSetupComplete: vi.fn(),
    };

    // Setup handlers
    setupConceptParsingHandlers(mockIpcMain as any, {
      conceptParsingService: mockConceptParsingService,
      loggerService: mockLoggerService,
      configService: mockConfigService,
    });

    // Invoke the handler
    const listeners = (mockIpcMain.handle as any).mock.calls;
    const handlerFn = listeners.find((call: any[]) => call[0] === 'knowledge:parse-concepts')?.[1];

    // Should throw error (proxy will wrap it)
    await expect(handlerFn(
      null,
      {
        files: [
          {
            fileName: 'test.md',
            content: '# Test\n\nSome content',
          },
        ],
      },
    )).rejects.toThrow('providerName is undefined');
  });

  it('should propagate errors without stack traces gracefully', async () => {
    const mockConceptParsingService = {
      parseMaterials: vi.fn().mockRejectedValue(new Error('String error')),
      clearJobCache: vi.fn().mockResolvedValue({ removed: 0 }),
      rebuild: vi.fn().mockResolvedValue(undefined),
    };

    const mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    };

    const mockLoggerService = {
      child: vi.fn().mockReturnValue(mockLogger),
    };

    const mockConfigService = {
      get: vi.fn(),
      getConfig: vi.fn().mockResolvedValue({}),
      setConfig: vi.fn(),
      getProviderConfig: vi.fn(),
      setProviderConfig: vi.fn(),
      onConfigChanged: vi.fn(),
      isSetupComplete: vi.fn(),
    };

    setupConceptParsingHandlers(mockIpcMain as any, {
      conceptParsingService: mockConceptParsingService,
      loggerService: mockLoggerService,
      configService: mockConfigService,
    });

    const listeners = (mockIpcMain.handle as any).mock.calls;
    const handlerFn = listeners.find((call: any[]) => call[0] === 'knowledge:parse-concepts')?.[1];

    await expect(handlerFn(null, {
      files: [],
    })).rejects.toThrow('String error');
  });

  it('should propagate errors when clearJobCache fails', async () => {
    const mockConceptParsingService = {
      parseMaterials: vi.fn().mockResolvedValue({
        success: true,
        concepts: [],
        relationships: [],
        statistics: {} as any,
        errors: [],
        metadata: {} as any,
      }),
      clearJobCache: vi.fn().mockRejectedValue(new Error('Permission denied')),
      rebuild: vi.fn().mockResolvedValue(undefined),
    };

    const mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    };

    const mockLoggerService = {
      child: vi.fn().mockReturnValue(mockLogger),
    };

    const mockConfigService = {
      get: vi.fn(),
      getConfig: vi.fn().mockResolvedValue({}),
      setConfig: vi.fn(),
      getProviderConfig: vi.fn(),
      setProviderConfig: vi.fn(),
      onConfigChanged: vi.fn(),
      isSetupComplete: vi.fn(),
    };

    setupConceptParsingHandlers(mockIpcMain as any, {
      conceptParsingService: mockConceptParsingService,
      loggerService: mockLoggerService,
      configService: mockConfigService,
    });

    const listeners = (mockIpcMain.handle as any).mock.calls;
    const handlerFn = listeners.find((call: any[]) => call[0] === 'knowledge:clear-parsing-jobs')?.[1];

    await expect(handlerFn(null)).rejects.toThrow('Permission denied');
  });
});
