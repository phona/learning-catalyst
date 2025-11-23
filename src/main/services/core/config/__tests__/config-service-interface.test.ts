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
      loadConfig: vi.fn().mockResolvedValue({ ai: { providers: {}, model_types: {} } }),
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
        ai: { providers: {}, model_types: {} },
        ui: {
          theme: 'light' as const,
          show_token_usage: true,
          display_format: 'detailed' as const,
          session_duration: 25,
          font_size: 'medium' as const,
          sidebar_width: 280,
          auto_save: true,
          auto_scroll: true,
          show_line_numbers: false,
          enable_markdown: true,
          enable_syntax_highlighting: true,
          compact_mode: false,
        },
        learning: {
          auto_save: true,
          session_timeout_minutes: 60,
          difficulty: 'intermediate' as const,
          learning_style: 'visual' as const,
          personalization_enabled: true,
          checkpoint_interval: 15,
          max_session_history: 100,
          enable_analytics: false,
          preferred_explanation_length: 'detailed' as const,
        },
        privacy: {
          store_conversations: true,
          retention_days: 30,
          anonymous_analytics: false,
          crash_reporting: true,
          encrypt_local_storage: false,
          auto_cleanup: true,
          export_format: 'json' as const,
        },
        performance: {
          cache_size_mb: 64,
          enable_caching: true,
          max_concurrent_requests: 3,
          request_timeout: 30,
          memory_limit_mb: 512,
          gpu_acceleration: false,
          background_processing: true,
          preload_models: false,
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
          providers: { openai: { provider_type: 'openai' as const, api_key: 'test' } },
          model_types: {},
        },
        ui: {
          theme: 'light' as const,
          show_token_usage: true,
          display_format: 'detailed' as const,
          session_duration: 25,
          font_size: 'medium' as const,
          sidebar_width: 280,
          auto_save: true,
          auto_scroll: true,
          show_line_numbers: false,
          enable_markdown: true,
          enable_syntax_highlighting: true,
          compact_mode: false,
        },
        learning: {
          auto_save: true,
          session_timeout_minutes: 60,
          difficulty: 'intermediate' as const,
          learning_style: 'visual' as const,
          personalization_enabled: true,
          checkpoint_interval: 15,
          max_session_history: 100,
          enable_analytics: false,
          preferred_explanation_length: 'detailed' as const,
        },
        privacy: {
          store_conversations: true,
          retention_days: 30,
          anonymous_analytics: false,
          crash_reporting: true,
          encrypt_local_storage: false,
          auto_cleanup: true,
          export_format: 'json' as const,
        },
        performance: {
          cache_size_mb: 64,
          enable_caching: true,
          max_concurrent_requests: 3,
          request_timeout: 30,
          memory_limit_mb: 512,
          gpu_acceleration: false,
          background_processing: true,
          preload_models: false,
        },
      };

      await configService.setConfig(newConfig);

      expect(mockStore.saveConfig).toHaveBeenCalled();
      const savedConfig = vi.mocked(mockStore.saveConfig).mock.calls[0][0];
      expect(savedConfig).toHaveProperty('ai');
      expect(savedConfig.ai).toHaveProperty('providers');
      expect(savedConfig.ai.providers).toHaveProperty('openai');
      expect(savedConfig.ai.providers.openai).toEqual({ provider_type: 'openai', api_key: 'test' });
    });

    it('should get provider config', async () => {
      const mockConfig = {
        ai: {
          providers: {
            openai: { provider_type: 'openai' as const, api_key: 'test-key' },
          },
          model_types: {},
        },
        ui: {
          theme: 'light' as const,
          show_token_usage: true,
          display_format: 'detailed' as const,
          session_duration: 25,
          font_size: 'medium' as const,
          sidebar_width: 280,
          auto_save: true,
          auto_scroll: true,
          show_line_numbers: false,
          enable_markdown: true,
          enable_syntax_highlighting: true,
          compact_mode: false,
        },
        learning: {
          auto_save: true,
          session_timeout_minutes: 60,
          difficulty: 'intermediate' as const,
          learning_style: 'visual' as const,
          personalization_enabled: true,
          checkpoint_interval: 15,
          max_session_history: 100,
          enable_analytics: false,
          preferred_explanation_length: 'detailed' as const,
        },
        privacy: {
          store_conversations: true,
          retention_days: 30,
          anonymous_analytics: false,
          crash_reporting: true,
          encrypt_local_storage: false,
          auto_cleanup: true,
          export_format: 'json' as const,
        },
        performance: {
          cache_size_mb: 64,
          enable_caching: true,
          max_concurrent_requests: 3,
          request_timeout: 30,
          memory_limit_mb: 512,
          gpu_acceleration: false,
          background_processing: true,
          preload_models: false,
        },
      };
      vi.mocked(mockStore.loadConfig).mockResolvedValue(mockConfig);

      const providerConfig = await configService.getProviderConfig('openai');

      expect(providerConfig).toEqual({ provider_type: 'openai', api_key: 'test-key' });
    });

    it('should return undefined for non-existent provider', async () => {
      const mockConfig = {
        ai: { providers: {}, model_types: {} },
        ui: {
          theme: 'light' as const,
          show_token_usage: true,
          display_format: 'detailed' as const,
          session_duration: 25,
          font_size: 'medium' as const,
          sidebar_width: 280,
          auto_save: true,
          auto_scroll: true,
          show_line_numbers: false,
          enable_markdown: true,
          enable_syntax_highlighting: true,
          compact_mode: false,
        },
        learning: {
          auto_save: true,
          session_timeout_minutes: 60,
          difficulty: 'intermediate' as const,
          learning_style: 'visual' as const,
          personalization_enabled: true,
          checkpoint_interval: 15,
          max_session_history: 100,
          enable_analytics: false,
          preferred_explanation_length: 'detailed' as const,
        },
        privacy: {
          store_conversations: true,
          retention_days: 30,
          anonymous_analytics: false,
          crash_reporting: true,
          encrypt_local_storage: false,
          auto_cleanup: true,
          export_format: 'json' as const,
        },
        performance: {
          cache_size_mb: 64,
          enable_caching: true,
          max_concurrent_requests: 3,
          request_timeout: 30,
          memory_limit_mb: 512,
          gpu_acceleration: false,
          background_processing: true,
          preload_models: false,
        },
      };
      vi.mocked(mockStore.loadConfig).mockResolvedValue(mockConfig);

      const providerConfig = await configService.getProviderConfig('nonexistent');

      expect(providerConfig).toBeUndefined();
    });

    it('should set provider config', async () => {
      const providerConfig = { provider_type: 'openai' as const, api_key: 'new-key' };
      const mockConfig = {
        ai: { providers: {}, model_types: {} },
        ui: {
          theme: 'light' as const,
          show_token_usage: true,
          display_format: 'detailed' as const,
          session_duration: 25,
          font_size: 'medium' as const,
          sidebar_width: 280,
          auto_save: true,
          auto_scroll: true,
          show_line_numbers: false,
          enable_markdown: true,
          enable_syntax_highlighting: true,
          compact_mode: false,
        },
        learning: {
          auto_save: true,
          session_timeout_minutes: 60,
          difficulty: 'intermediate' as const,
          learning_style: 'visual' as const,
          personalization_enabled: true,
          checkpoint_interval: 15,
          max_session_history: 100,
          enable_analytics: false,
          preferred_explanation_length: 'detailed' as const,
        },
        privacy: {
          store_conversations: true,
          retention_days: 30,
          anonymous_analytics: false,
          crash_reporting: true,
          encrypt_local_storage: false,
          auto_cleanup: true,
          export_format: 'json' as const,
        },
        performance: {
          cache_size_mb: 64,
          enable_caching: true,
          max_concurrent_requests: 3,
          request_timeout: 30,
          memory_limit_mb: 512,
          gpu_acceleration: false,
          background_processing: true,
          preload_models: false,
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
          ai: { providers: {}, model_types: {} },
          ui: {
            theme: 'light' as const,
            show_token_usage: true,
            display_format: 'detailed' as const,
            session_duration: 25,
            font_size: 'medium' as const,
            sidebar_width: 280,
            auto_save: true,
            auto_scroll: true,
            show_line_numbers: false,
            enable_markdown: true,
            enable_syntax_highlighting: true,
            compact_mode: false,
          },
          learning: {
            auto_save: true,
            session_timeout_minutes: 60,
            difficulty: 'intermediate' as const,
            learning_style: 'visual' as const,
            personalization_enabled: true,
            checkpoint_interval: 15,
            max_session_history: 100,
            enable_analytics: false,
            preferred_explanation_length: 'detailed' as const,
          },
          privacy: {
            store_conversations: true,
            retention_days: 30,
            anonymous_analytics: false,
            crash_reporting: true,
            encrypt_local_storage: false,
            auto_cleanup: true,
            export_format: 'json' as const,
          },
          performance: {
            cache_size_mb: 64,
            enable_caching: true,
            max_concurrent_requests: 3,
            request_timeout: 30,
            memory_limit_mb: 512,
            gpu_acceleration: false,
            background_processing: true,
            preload_models: false,
          },
        }),
      ).rejects.toThrow('Store write error');
    });
  });
});
