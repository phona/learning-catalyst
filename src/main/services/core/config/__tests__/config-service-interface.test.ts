import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createConfigService } from '../config-service';
import type { ConfigStorage } from '../storage';
import type { LoggerService } from '../../logger/logger-service';

describe('Config Service - Interface Tests', () => {
  let mockStore: ConfigStorage;
  let mockLogger: LoggerService;
  let configService: ReturnType<typeof createConfigService>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock ConfigStorage
    mockStore = {
      loadConfig: vi.fn().mockResolvedValue({ ai: { providers: {}, modelTypes: {} } }),
      saveConfig: vi.fn().mockResolvedValue(undefined),
      getConfigPath: vi.fn().mockResolvedValue('/test/path'),
    } as ConfigStorage;

    // Mock LoggerService
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    };

    configService = createConfigService({ storage: mockStore, logger: mockLogger });
  });

  describe('Service Creation', () => {
    it('should create config service with required methods', () => {
      expect(configService).toHaveProperty('getConfig');
      expect(configService).toHaveProperty('setConfig');
      expect(configService).toHaveProperty('getProviderConfig');
      expect(configService).toHaveProperty('setProviderConfig');
      expect(configService).toHaveProperty('onConfigChanged');

      expect(typeof configService.getConfig).toBe('function');
      expect(typeof configService.setConfig).toBe('function');
      expect(typeof configService.getProviderConfig).toBe('function');
      expect(typeof configService.setProviderConfig).toBe('function');
      expect(typeof configService.onConfigChanged).toBe('function');
    });
  });

  describe('Configuration Management', () => {
    it('should get config from store', async () => {
      const mockConfig = {
        ai: {
          providers: {},
          modelTypes: {
            chat: {
              provider: 'openai',
              model: 'gpt-3.5-turbo',
              temperature: 0.7,
              maxTokens: 10240,
              stream: true,
              enableThinking: false,
              topP: 1,
            },
            embedding: {
              provider: 'openai',
              model: 'text-embedding-ada-002',
              dimensions: 1536,
            },
            rerank: {
              provider: 'openai',
              model: 'text-embedding-ada-002',
            },
          },
          embeddingDimensions: 1536,
          metadata: { modelTests: [] },
        },
        parsing: {
          chatTimeoutSeconds: 60,
          maxConcurrentSegments: 3,
          maxSegmentChars: 1200,
          minSegmentChars: 80,
          vectorize: true,
        },
        ui: {
          theme: 'light' as const,
          showTokenUsage: true,
          displayFormat: 'detailed' as const,
          sessionDuration: 25,
          fontSize: 'medium' as const,
          sidebarWidth: 280,
          autoSave: true,
          autoScroll: true,
          showLineNumbers: false,
          enableMarkdown: true,
          enableSyntaxHighlighting: true,
          compactMode: false,
        },
        learning: {
          autoSave: true,
          sessionTimeoutMinutes: 60,
          difficulty: 'intermediate' as const,
          learningStyle: 'visual' as const,
          personalizationEnabled: true,
          checkpointInterval: 15,
          maxSessionHistory: 100,
          enableAnalytics: false,
          preferredExplanationLength: 'detailed' as const,
        },
        privacy: {
          storeConversations: true,
          retentionDays: 30,
          anonymousAnalytics: false,
          crashReporting: true,
          encryptLocalStorage: false,
          autoCleanup: true,
          exportFormat: 'json' as const,
        },
        performance: {
          cacheSizeMb: 64,
          enableCaching: true,
          maxConcurrentRequests: 3,
          requestTimeout: 30,
          memoryLimitMb: 512,
          gpuAcceleration: false,
          backgroundProcessing: true,
          preloadModels: false,
        },
      };
      vi.mocked(mockStore.loadConfig).mockResolvedValue(mockConfig);

      const config = await configService.getConfig();

      expect(mockStore.loadConfig).toHaveBeenCalled();
      expect(config).toEqual(mockConfig);
    });

    it('should set config to store', async () => {
      const newConfig = {
        ai: {
          providers: { openai: { providerType: 'openai' as const, apiKey: 'test' } },
          modelTypes: {},
        },
        ui: {
          theme: 'light' as const,
          showTokenUsage: true,
          displayFormat: 'detailed' as const,
          sessionDuration: 25,
          fontSize: 'medium' as const,
          sidebarWidth: 280,
          autoSave: true,
          autoScroll: true,
          showLineNumbers: false,
          enableMarkdown: true,
          enableSyntaxHighlighting: true,
          compactMode: false,
        },
        learning: {
          autoSave: true,
          sessionTimeoutMinutes: 60,
          difficulty: 'intermediate' as const,
          learningStyle: 'visual' as const,
          personalizationEnabled: true,
          checkpointInterval: 15,
          maxSessionHistory: 100,
          enableAnalytics: false,
          preferredExplanationLength: 'detailed' as const,
        },
        privacy: {
          storeConversations: true,
          retentionDays: 30,
          anonymousAnalytics: false,
          crashReporting: true,
          encryptLocalStorage: false,
          autoCleanup: true,
          exportFormat: 'json' as const,
        },
        performance: {
          cacheSizeMb: 64,
          enableCaching: true,
          maxConcurrentRequests: 3,
          requestTimeout: 30,
          memoryLimitMb: 512,
          gpuAcceleration: false,
          backgroundProcessing: true,
          preloadModels: false,
        },
      };

      await configService.setConfig(newConfig);

      expect(mockStore.saveConfig).toHaveBeenCalled();
      const savedConfig = vi.mocked(mockStore.saveConfig).mock.calls[0][0];
      expect(savedConfig).toHaveProperty('ai');
      expect(savedConfig.ai).toHaveProperty('providers');
      expect(savedConfig.ai.providers).toHaveProperty('openai');
      expect(savedConfig.ai.providers.openai).toEqual({ providerType: 'openai', apiKey: 'test' });
    });

    it('should get provider config', async () => {
      const mockConfig = {
        ai: {
          providers: {
            openai: { providerType: 'openai' as const, apiKey: 'test-key' },
          },
          modelTypes: {},
        },
        ui: {
          theme: 'light' as const,
          showTokenUsage: true,
          displayFormat: 'detailed' as const,
          sessionDuration: 25,
          fontSize: 'medium' as const,
          sidebarWidth: 280,
          autoSave: true,
          autoScroll: true,
          showLineNumbers: false,
          enableMarkdown: true,
          enableSyntaxHighlighting: true,
          compactMode: false,
        },
        learning: {
          autoSave: true,
          sessionTimeoutMinutes: 60,
          difficulty: 'intermediate' as const,
          learningStyle: 'visual' as const,
          personalizationEnabled: true,
          checkpointInterval: 15,
          maxSessionHistory: 100,
          enableAnalytics: false,
          preferredExplanationLength: 'detailed' as const,
        },
        privacy: {
          storeConversations: true,
          retentionDays: 30,
          anonymousAnalytics: false,
          crashReporting: true,
          encryptLocalStorage: false,
          autoCleanup: true,
          exportFormat: 'json' as const,
        },
        performance: {
          cacheSizeMb: 64,
          enableCaching: true,
          maxConcurrentRequests: 3,
          requestTimeout: 30,
          memoryLimitMb: 512,
          gpuAcceleration: false,
          backgroundProcessing: true,
          preloadModels: false,
        },
      };
      vi.mocked(mockStore.loadConfig).mockResolvedValue(mockConfig);

      const providerConfig = await configService.getProviderConfig('openai');

      expect(providerConfig).toEqual({ providerType: 'openai', apiKey: 'test-key' });
    });

    it('should return undefined for non-existent provider', async () => {
      const mockConfig = {
        ai: { providers: {}, modelTypes: {} },
        ui: {
          theme: 'light' as const,
          showTokenUsage: true,
          displayFormat: 'detailed' as const,
          sessionDuration: 25,
          fontSize: 'medium' as const,
          sidebarWidth: 280,
          autoSave: true,
          autoScroll: true,
          showLineNumbers: false,
          enableMarkdown: true,
          enableSyntaxHighlighting: true,
          compactMode: false,
        },
        learning: {
          autoSave: true,
          sessionTimeoutMinutes: 60,
          difficulty: 'intermediate' as const,
          learningStyle: 'visual' as const,
          personalizationEnabled: true,
          checkpointInterval: 15,
          maxSessionHistory: 100,
          enableAnalytics: false,
          preferredExplanationLength: 'detailed' as const,
        },
        privacy: {
          storeConversations: true,
          retentionDays: 30,
          anonymousAnalytics: false,
          crashReporting: true,
          encryptLocalStorage: false,
          autoCleanup: true,
          exportFormat: 'json' as const,
        },
        performance: {
          cacheSizeMb: 64,
          enableCaching: true,
          maxConcurrentRequests: 3,
          requestTimeout: 30,
          memoryLimitMb: 512,
          gpuAcceleration: false,
          backgroundProcessing: true,
          preloadModels: false,
        },
      };
      vi.mocked(mockStore.loadConfig).mockResolvedValue(mockConfig);

      const providerConfig = await configService.getProviderConfig('nonexistent');

      expect(providerConfig).toBeUndefined();
    });

    it('should set provider config', async () => {
      const providerConfig = { providerType: 'openai' as const, apiKey: 'new-key' };
      const mockConfig = {
        ai: { providers: {}, modelTypes: {} },
        ui: {
          theme: 'light' as const,
          showTokenUsage: true,
          displayFormat: 'detailed' as const,
          sessionDuration: 25,
          fontSize: 'medium' as const,
          sidebarWidth: 280,
          autoSave: true,
          autoScroll: true,
          showLineNumbers: false,
          enableMarkdown: true,
          enableSyntaxHighlighting: true,
          compactMode: false,
        },
        learning: {
          autoSave: true,
          sessionTimeoutMinutes: 60,
          difficulty: 'intermediate' as const,
          learningStyle: 'visual' as const,
          personalizationEnabled: true,
          checkpointInterval: 15,
          maxSessionHistory: 100,
          enableAnalytics: false,
          preferredExplanationLength: 'detailed' as const,
        },
        privacy: {
          storeConversations: true,
          retentionDays: 30,
          anonymousAnalytics: false,
          crashReporting: true,
          encryptLocalStorage: false,
          autoCleanup: true,
          exportFormat: 'json' as const,
        },
        performance: {
          cacheSizeMb: 64,
          enableCaching: true,
          maxConcurrentRequests: 3,
          requestTimeout: 30,
          memoryLimitMb: 512,
          gpuAcceleration: false,
          backgroundProcessing: true,
          preloadModels: false,
        },
      };
      vi.mocked(mockStore.loadConfig).mockResolvedValue(mockConfig);

      await configService.setProviderConfig('openai', providerConfig);

      expect(mockStore.saveConfig).toHaveBeenCalled();
    });
  });

  describe('Configuration Change Events', () => {
    it('should allow subscribing to config changes', async () => {
      const callback = vi.fn();

      const unsubscribe = await configService.onConfigChanged(callback);

      // Should not throw and callback should be registered
      expect(typeof callback).toBe('function');
      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle null callbacks gracefully', async () => {
      const unsubscribe = await configService.onConfigChanged(null as any);
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should propagate store get errors', async () => {
      vi.mocked(mockStore.loadConfig).mockImplementation(() => {
        throw new Error('Store read error');
      });

      // Should throw the error
      await expect(configService.getConfig()).rejects.toThrow('Store read error');
    });

    it('should propagate store set errors', async () => {
      const mockSaveConfig = vi.mocked(mockStore.saveConfig);
      mockSaveConfig.mockImplementation(() => {
        throw new Error('Store write error');
      });

      // Should throw
      await expect(
        configService.setConfig({
          ai: { providers: {}, modelTypes: {} },
          ui: {
            theme: 'light' as const,
            showTokenUsage: true,
            displayFormat: 'detailed' as const,
            sessionDuration: 25,
            fontSize: 'medium' as const,
            sidebarWidth: 280,
            autoSave: true,
            autoScroll: true,
            showLineNumbers: false,
            enableMarkdown: true,
            enableSyntaxHighlighting: true,
            compactMode: false,
          },
          learning: {
            autoSave: true,
            sessionTimeoutMinutes: 60,
            difficulty: 'intermediate' as const,
            learningStyle: 'visual' as const,
            personalizationEnabled: true,
            checkpointInterval: 15,
            maxSessionHistory: 100,
            enableAnalytics: false,
            preferredExplanationLength: 'detailed' as const,
          },
          privacy: {
            storeConversations: true,
            retentionDays: 30,
            anonymousAnalytics: false,
            crashReporting: true,
            encryptLocalStorage: false,
            autoCleanup: true,
            exportFormat: 'json' as const,
          },
          performance: {
            cacheSizeMb: 64,
            enableCaching: true,
            maxConcurrentRequests: 3,
            requestTimeout: 30,
            memoryLimitMb: 512,
            gpuAcceleration: false,
            backgroundProcessing: true,
            preloadModels: false,
          },
        }),
      ).rejects.toThrow('Store write error');
    });
  });
});
