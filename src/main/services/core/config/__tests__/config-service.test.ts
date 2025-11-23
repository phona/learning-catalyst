/**
 * Config Service Tests
 *
 * Comprehensive tests for the configuration service including:
 * - Null safety fixes
 * - Recursive merging functionality
 * - Provider configuration management
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createConfigService } from '../config-service';
import type {
  AppConfig,
  ModelCapabilities,
  ProviderConfig,
  UIConfig,
  PerformanceConfig,
  SelectedChatModel,
} from '@/shared/types/config';

// Mock dependencies
vi.mock('../storage', () => {
  return {
    createConfigStorage: vi.fn().mockReturnValue({
      loadConfig: vi.fn(),
      saveConfig: vi.fn(),
      getConfigPath: vi.fn().mockResolvedValue('/test/path/config.json'),
    }),
  };
});

vi.mock('../../logger/logger-service', () => {
  return {
    LoggerService: vi.fn().mockImplementation(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  };
});

describe('ConfigService Tests', () => {
  let configService: ReturnType<typeof createConfigService>;
  let mockStorage: any;
  let mockLogger: any;

  const defaultChatCapabilities: ModelCapabilities = {
    streaming: true,
    thinking: true,
    functionCalling: false,
    vision: false,
    maxInputTokens: 4096,
    maxOutputTokens: 2048,
  };

  const defaultChatModel: SelectedChatModel = {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1,
    enableThinking: true,
    stream: true,
    defaultProvider: 'openai',
    defaultModel: 'gpt-4',
    capabilities: defaultChatCapabilities,
  };

  const baseAIConfig: AppConfig['ai'] = {
    providers: {
      openai: {
        providerType: 'openai',
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
        models: ['gpt-4', 'gpt-3.5-turbo'],
        streaming: true,
      },
    },
    modelTypes: {
      chat: defaultChatModel,
    },
    metadata: {
      modelTests: [],
    },
    defaultProvider: 'openai',
    defaultModel: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2048,
    streaming: true,
    enableThinking: true,
    contextWindowSize: 4096,
  };

  const baseUIConfig: AppConfig['ui'] = {
    theme: 'light',
    showTokenUsage: false,
    displayFormat: 'detailed',
    sessionDuration: 25,
    fontSize: 'medium',
    sidebarWidth: 300,
    autoSave: true,
    autoScroll: true,
    showLineNumbers: false,
    enableMarkdown: true,
    enableSyntaxHighlighting: true,
    compactMode: false,
  };

  const baseLearningConfig: AppConfig['learning'] = {
    autoSave: true,
    sessionTimeoutMinutes: 60,
    difficulty: 'intermediate',
    learningStyle: 'visual',
    personalizationEnabled: true,
    checkpointInterval: 15,
    maxSessionHistory: 100,
    enableAnalytics: false,
    preferredExplanationLength: 'detailed',
  };

  const basePrivacyConfig: AppConfig['privacy'] = {
    storeConversations: true,
    retentionDays: 90,
    anonymousAnalytics: false,
    crashReporting: true,
    encryptLocalStorage: false,
    autoCleanup: true,
    exportFormat: 'json',
  };

  const basePerformanceConfig: AppConfig['performance'] = {
    cacheSizeMb: 100,
    enableCaching: true,
    maxConcurrentRequests: 5,
    requestTimeout: 30,
    memoryLimitMb: 512,
    gpuAcceleration: false,
    backgroundProcessing: true,
    preloadModels: false,
  };

  const mergeProviders = (
    original: Record<string, ProviderConfig>,
    overrides?: Record<string, ProviderConfig>,
  ): Record<string, ProviderConfig> => ({
    ...original,
    ...(overrides ?? {}),
  });

  const mergeModelTypes = (
    original: AppConfig['ai']['modelTypes'] = {},
    overrides?: AppConfig['ai']['modelTypes'],
  ) => ({
    ...(original ?? {}),
    ...(overrides ?? {}),
  });

  const createMockConfig = (overrides: Partial<AppConfig> = {}): AppConfig => {
    const aiOverrides = overrides.ai as Partial<AppConfig['ai']> | undefined;
    const hasAiOverride = Object.prototype.hasOwnProperty.call(overrides, 'ai');

    const config: Partial<AppConfig> = {
      ui: {
        ...baseUIConfig,
        ...(overrides.ui ?? {}),
      },
      learning: {
        ...baseLearningConfig,
        ...(overrides.learning ?? {}),
      },
      privacy: {
        ...basePrivacyConfig,
        ...(overrides.privacy ?? {}),
      },
      performance: {
        ...basePerformanceConfig,
        ...(overrides.performance ?? {}),
      },
    };

    if (hasAiOverride && aiOverrides === undefined) {
      (config as any).ai = undefined;
    } else {
      config.ai = {
        ...baseAIConfig,
        ...(aiOverrides ?? {}),
        providers: mergeProviders(baseAIConfig.providers, aiOverrides?.providers),
        modelTypes: mergeModelTypes(baseAIConfig.modelTypes, aiOverrides?.modelTypes),
      };

      if (
        aiOverrides &&
        Object.prototype.hasOwnProperty.call(aiOverrides, 'providers') &&
        aiOverrides.providers === undefined
      ) {
        delete (config.ai as any).providers;
      }
    }

    return config as AppConfig;
  };

  const createMockProviderConfig = (overrides: Partial<ProviderConfig> = {}): ProviderConfig => ({
    providerType: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'test-key',
    models: ['gpt-4', 'gpt-3.5-turbo'],
    ...overrides,
  });

  // Helper function for creating partial UI updates
  const createPartialUIUpdate = (updates: Partial<UIConfig>): Partial<AppConfig> => ({
    ui: {
      theme: 'light',
      showTokenUsage: false,
      displayFormat: 'detailed',
      sessionDuration: 25,
      fontSize: 'medium',
      sidebarWidth: 300,
      autoSave: true,
      autoScroll: true,
      showLineNumbers: false,
      enableMarkdown: true,
      enableSyntaxHighlighting: true,
      compactMode: false,
      ...updates,
    },
  });

  // Helper function for creating partial performance updates
  const createPartialPerformanceUpdate = (
    updates: Partial<PerformanceConfig>,
  ): Partial<AppConfig> => ({
    performance: {
      cacheSizeMb: 100,
      enableCaching: true,
      maxConcurrentRequests: 5,
      requestTimeout: 30,
      memoryLimitMb: 512,
      gpuAcceleration: false,
      backgroundProcessing: true,
      preloadModels: false,
      ...updates,
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mock instances
    mockStorage = {
      loadConfig: vi.fn(),
      saveConfig: vi.fn(),
      getConfigPath: vi.fn().mockResolvedValue('/test/path/config.json'),
    };

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    // Create config service instance
    configService = createConfigService({
      storage: mockStorage,
      logger: mockLogger as any,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Service Initialization and Basic Operations', () => {
    it('should initialize with mocked dependencies', () => {
      expect(configService).toBeDefined();
      expect(typeof configService.getConfig).toBe('function');
      expect(typeof configService.setConfig).toBe('function');
      expect(typeof configService.getProviderConfig).toBe('function');
      expect(typeof configService.setProviderConfig).toBe('function');
      expect(typeof configService.onConfigChanged).toBe('function');
    });

    it('should load and return configuration successfully', async () => {
      const expectedConfig = createMockConfig();
      mockStorage.loadConfig.mockResolvedValue(expectedConfig);

      const result = await configService.getConfig();

      expect(mockStorage.loadConfig).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedConfig);
    });

    it('should handle null configuration gracefully', async () => {
      mockStorage.loadConfig.mockResolvedValue(null);

      const result = await configService.getConfig();

      expect(result).toBeNull();
    });
  });

  describe('setConfig Method - Recursive Merging', () => {
    it('should handle null current config and save new config directly', async () => {
      const newConfig = createMockConfig(createPartialUIUpdate({ theme: 'dark' }));
      mockStorage.loadConfig.mockResolvedValue(null);

      await configService.setConfig(newConfig);

      expect(mockStorage.saveConfig).toHaveBeenCalledWith(newConfig);
      expect(mockStorage.saveConfig).toHaveBeenCalledTimes(1);
    });

    it('should perform recursive merging of configurations', async () => {
      const currentConfig = createMockConfig({
        ai: {
          providers: {
            openai: {
              providerType: 'openai',
              apiKey: 'old-key',
              baseUrl: 'https://api.openai.com/v1',
              models: ['gpt-3.5-turbo'],
            },
          },
          modelTypes: {
            chat: {
              provider: 'openai',
              model: 'gpt-3.5-turbo',
              temperature: 0.7,
            },
          },
        },
        ui: {
          theme: 'light',
          showTokenUsage: false,
          displayFormat: 'detailed',
          sessionDuration: 25,
          fontSize: 'medium',
          sidebarWidth: 300,
          autoSave: true,
          autoScroll: true,
          showLineNumbers: false,
          enableMarkdown: true,
          enableSyntaxHighlighting: true,
          compactMode: false,
        },
      });

      const updates: Partial<AppConfig> = {
        ai: {
          providers: {
            openai: {
              providerType: 'openai',
              apiKey: 'new-key',
              models: ['gpt-4'],
            },
            chatglm: {
              providerType: 'chatglm',
              apiKey: 'chatglm-key',
              baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
            },
          },
          modelTypes: {
            chat: {
              provider: 'openai',
              model: 'gpt-3.5-turbo',
              temperature: 0.7,
            },
          },
        },
        ui: createPartialUIUpdate({ theme: 'dark' }).ui,
      };

      mockStorage.loadConfig.mockResolvedValue(currentConfig);

      await configService.setConfig(updates as any);

      expect(mockStorage.saveConfig).toHaveBeenCalledTimes(1);

      const savedConfig = mockStorage.saveConfig.mock.calls[0][0];

      // Verify existing provider was updated
      expect(savedConfig.ai.providers.openai.apiKey).toBe('new-key');
      expect(savedConfig.ai.providers.openai.providerType).toBe('openai');
      expect(savedConfig.ai.providers.openai.baseUrl).toBe('https://api.openai.com/v1');

      // Verify new provider was added
      expect(savedConfig.ai.providers.chatglm).toBeDefined();
      expect(savedConfig.ai.providers.chatglm.providerType).toBe('chatglm');
      expect(savedConfig.ai.providers.chatglm.apiKey).toBe('chatglm-key');

      // Verify nested objects are preserved
      expect(savedConfig.ui.theme).toBe('dark');
      expect(savedConfig.ui.showTokenUsage).toBe(false);
      expect(savedConfig.learning).toBeDefined();
    });

    it('should handle partial configuration updates correctly', async () => {
      const currentConfig = createMockConfig();
      const partialUpdate = createPartialPerformanceUpdate({
        cacheSizeMb: 256,
        memoryLimitMb: 1024,
      });

      mockStorage.loadConfig.mockResolvedValue(currentConfig);

      await configService.setConfig(partialUpdate);

      const savedConfig = mockStorage.saveConfig.mock.calls[0][0];

      // Verify performance settings were updated
      expect(savedConfig.performance.cacheSizeMb).toBe(256);
      expect(savedConfig.performance.memoryLimitMb).toBe(1024);

      // Verify other sections were preserved
      expect(savedConfig.ai).toBeDefined();
      expect(savedConfig.ui).toBeDefined();
      expect(savedConfig.learning).toBeDefined();
      expect(savedConfig.privacy).toBeDefined();

      // Verify existing performance properties were preserved
      expect(savedConfig.performance.enableCaching).toBe(true);
      expect(savedConfig.performance.maxConcurrentRequests).toBe(5);
    });
  });

  describe('getProviderConfig Method', () => {
    it('should return provider config when exists', async () => {
      const currentConfig = createMockConfig();
      mockStorage.loadConfig.mockResolvedValue(currentConfig);

      const result = await configService.getProviderConfig('openai');

      expect(result).toEqual({
        providerType: 'openai',
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
        models: ['gpt-4', 'gpt-3.5-turbo'],
        streaming: true,
      });
    });

    it('should return undefined when provider does not exist', async () => {
      const currentConfig = createMockConfig();
      mockStorage.loadConfig.mockResolvedValue(currentConfig);

      const result = await configService.getProviderConfig('nonexistent');

      expect(result).toBeUndefined();
    });

    it('should return undefined when config is null', async () => {
      mockStorage.loadConfig.mockResolvedValue(null);

      const result = await configService.getProviderConfig('openai');

      expect(result).toBeUndefined();
    });

    it('should return undefined when ai config is missing', async () => {
      const configWithoutAI = createMockConfig({ ai: undefined as any });
      mockStorage.loadConfig.mockResolvedValue(configWithoutAI);

      const result = await configService.getProviderConfig('openai');

      expect(result).toBeUndefined();
    });

    it('should return undefined when providers object is missing', async () => {
      const configWithoutProviders = createMockConfig({
        ai: {
          providers: undefined as any,
          modelTypes: {},
        },
      });
      mockStorage.loadConfig.mockResolvedValue(configWithoutProviders);

      const result = await configService.getProviderConfig('openai');

      expect(result).toBeUndefined();
    });
  });

  describe('setProviderConfig Method', () => {
    it('should handle null current config gracefully', async () => {
      const providerConfig = createMockProviderConfig({ apiKey: 'new-key' });
      mockStorage.loadConfig.mockResolvedValue(null);

      await configService.setProviderConfig('openai', providerConfig);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Current config is null, cannot set provider config',
      );
      expect(mockStorage.saveConfig).not.toHaveBeenCalled();
    });

    it('should create AI config structure when missing', async () => {
      const configWithoutAI = createMockConfig({ ai: undefined as any });
      const providerConfig = createMockProviderConfig({ apiKey: 'new-key' });

      mockStorage.loadConfig.mockResolvedValue(configWithoutAI);

      await configService.setProviderConfig('openai', providerConfig);

      expect(mockStorage.saveConfig).toHaveBeenCalledTimes(1);

      const savedConfig = mockStorage.saveConfig.mock.calls[0][0];
      expect(savedConfig.ai).toBeDefined();
      expect(savedConfig.ai.providers).toBeDefined();
      expect(savedConfig.ai.providers.openai).toBeDefined();
      expect(savedConfig.ai.providers.openai.apiKey).toBe('new-key');
    });

    it('should merge provider config with existing provider', async () => {
      const currentConfig = createMockConfig();
      const update = { apiKey: 'updated-key', temperature: 0.8 };

      mockStorage.loadConfig.mockResolvedValue(currentConfig);

      await configService.setProviderConfig('openai', update as any);

      expect(mockStorage.saveConfig).toHaveBeenCalledTimes(1);

      const savedConfig = mockStorage.saveConfig.mock.calls[0][0];
      expect(savedConfig.ai.providers.openai.apiKey).toBe('updated-key');
      expect(savedConfig.ai.providers.openai.temperature).toBe(0.8);
      expect(savedConfig.ai.providers.openai.providerType).toBe('openai');
      expect(savedConfig.ai.providers.openai.baseUrl).toBe('https://api.openai.com/v1');
    });

    it('should add new provider when provider does not exist', async () => {
      const currentConfig = createMockConfig();
      const newProvider = createMockProviderConfig({
        providerType: 'chatglm',
        apiKey: 'chatglm-key',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      });

      mockStorage.loadConfig.mockResolvedValue(currentConfig);

      await configService.setProviderConfig('chatglm', newProvider);

      expect(mockStorage.saveConfig).toHaveBeenCalledTimes(1);

      const savedConfig = mockStorage.saveConfig.mock.calls[0][0];
      expect(savedConfig.ai.providers.chatglm).toBeDefined();
      expect(savedConfig.ai.providers.chatglm.providerType).toBe('chatglm');
      expect(savedConfig.ai.providers.chatglm.apiKey).toBe('chatglm-key');
      expect(savedConfig.ai.providers.openai).toBeDefined(); // Original provider preserved
    });

    it('should ensure providers object exists', async () => {
      const configWithoutProviders = createMockConfig({
        ai: {
          providers: undefined as any,
          modelTypes: {},
        },
      });
      const providerConfig = createMockProviderConfig();

      mockStorage.loadConfig.mockResolvedValue(configWithoutProviders);

      await configService.setProviderConfig('openai', providerConfig);

      expect(mockStorage.saveConfig).toHaveBeenCalledTimes(1);

      const savedConfig = mockStorage.saveConfig.mock.calls[0][0];
      expect(savedConfig.ai.providers).toBeDefined();
      expect(savedConfig.ai.providers.openai).toBeDefined();
    });

    it('should log configuration changes', async () => {
      const currentConfig = createMockConfig();
      const providerConfig = createMockProviderConfig({ apiKey: 'new-key' });

      mockStorage.loadConfig.mockResolvedValue(currentConfig);

      await configService.setProviderConfig('openai', providerConfig);

      expect(mockLogger.info).toHaveBeenCalledWith('Setting provider config for: openai', {
        config: providerConfig,
      });
    });
  });

  describe('onConfigChanged Method', () => {
    it('should register and return unregister function', () => {
      const listener = vi.fn();
      const unregister = configService.onConfigChanged(listener);

      expect(typeof unregister).toBe('function');
      unregister();
      // Note: We can't easily test the actual event emission without more complex setup
    });

    it('should allow multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unregister1 = configService.onConfigChanged(listener1);
      const unregister2 = configService.onConfigChanged(listener2);

      expect(typeof unregister1).toBe('function');
      expect(typeof unregister2).toBe('function');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle storage load errors gracefully', async () => {
      const loadError = new Error('Storage access denied');
      mockStorage.loadConfig.mockRejectedValue(loadError);

      await expect(configService.getConfig()).rejects.toThrow('Storage access denied');
    });

    it('should handle storage save errors gracefully', async () => {
      const saveError = new Error('Save failed');
      mockStorage.loadConfig.mockResolvedValue(createMockConfig());
      mockStorage.saveConfig.mockRejectedValue(saveError);

      await expect(
        configService.setConfig(createPartialUIUpdate({ theme: 'dark' })),
      ).rejects.toThrow('Save failed');
    });

    it('should handle malformed config data', async () => {
      const malformedConfig = { invalid: 'structure' };
      mockStorage.loadConfig.mockResolvedValue(malformedConfig);

      const result = await configService.getConfig();
      expect(result).toEqual(malformedConfig);
    });

    it('should handle very large configuration objects', async () => {
      // Create a large config with many providers
      const largeConfig = createMockConfig();
      largeConfig.ai.providers = {};
      for (let i = 0; i < 100; i++) {
        largeConfig.ai.providers[`provider${i}`] = createMockProviderConfig({
          providerType: `provider${i}` as any,
          apiKey: `key${i}`,
        });
      }

      mockStorage.loadConfig.mockResolvedValue(largeConfig);

      const result = await configService.getConfig();
      expect(result).toEqual(largeConfig);
      expect(Object.keys(result!.ai.providers).length).toBe(100);
    });

    it('should handle concurrent configuration updates', async () => {
      const config1 = createPartialUIUpdate({ theme: 'dark' });
      const config2 = createPartialPerformanceUpdate({ cacheSizeMb: 512 });

      mockStorage.loadConfig.mockResolvedValue(createMockConfig());

      const promises = [configService.setConfig(config1), configService.setConfig(config2)];

      await Promise.all(promises);

      expect(mockStorage.saveConfig).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Tests', () => {
    it('should complete configuration operations within reasonable time', async () => {
      const config = createMockConfig();
      mockStorage.loadConfig.mockResolvedValue(config);

      const startTime = performance.now();
      await configService.getConfig();
      const getDuration = performance.now() - startTime;

      expect(getDuration).toBeLessThan(100); // 100ms threshold

      const updateStartTime = performance.now();
      await configService.setConfig(createPartialUIUpdate({ theme: 'dark' }));
      const setDuration = performance.now() - updateStartTime;

      expect(setDuration).toBeLessThan(200); // 200ms threshold
    });

    it('should handle configuration updates efficiently', async () => {
      const currentConfig = createMockConfig();
      const smallUpdate = createPartialUIUpdate({ theme: 'dark' });

      mockStorage.loadConfig.mockResolvedValue(currentConfig);

      const iterations = 50;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        await configService.setConfig(smallUpdate);
      }

      const totalDuration = performance.now() - startTime;
      const averageDuration = totalDuration / iterations;

      expect(averageDuration).toBeLessThan(50); // 50ms average per operation
    });
  });

  describe('Integration with Storage Layer', () => {
    it('should properly interact with storage load method', async () => {
      const expectedConfig = createMockConfig();
      mockStorage.loadConfig.mockResolvedValue(expectedConfig);

      const result = await configService.getConfig();

      expect(mockStorage.loadConfig).toHaveBeenCalledTimes(1);
      expect(result).toBe(expectedConfig);
    });

    it('should properly interact with storage save method', async () => {
      const testConfig = createMockConfig(createPartialUIUpdate({ theme: 'dark' }));
      mockStorage.loadConfig.mockResolvedValue(createMockConfig());

      await configService.setConfig(testConfig);

      expect(mockStorage.saveConfig).toHaveBeenCalledTimes(1);
      expect(mockStorage.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          ui: expect.objectContaining({ theme: 'dark' }),
        }),
      );
    });

    it('should handle storage path retrieval', async () => {
      const expectedPath = '/custom/path/config.json';
      mockStorage.getConfigPath.mockResolvedValue(expectedPath);

      // Note: getConfigPath is not directly exposed in the config service
      // This test verifies the storage layer integration
      const result = await configService.getConfig();

      // Storage path retrieval happens during service initialization/storage setup
      // The test verifies that the storage mock is properly configured
      expect(mockStorage.getConfigPath).toHaveBeenCalledTimes(0); // Not called directly by service methods
    });
  });
});
