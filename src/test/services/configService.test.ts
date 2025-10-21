import { ConfigService, configService } from '@/services/configService';
import type { AppConfig, ProviderConfig } from '@/types/config';
import { vi } from 'vitest';

// Mock Electron API
const mockGetConfig = vi.fn();
const mockSetConfig = vi.fn();

Object.defineProperty(window, 'electronAPI', {
  value: {
    getConfig: mockGetConfig,
    setConfig: mockSetConfig,
  },
  writable: true,
});

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(() => {
    // Reset singleton instance
    (ConfigService as any).instance = null;
    service = ConfigService.getInstance();

    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const service1 = ConfigService.getInstance();
      const service2 = ConfigService.getInstance();

      expect(service1).toBe(service2);
    });

    it('exports singleton instance', () => {
      expect(configService).toBeInstanceOf(ConfigService);
    });
  });

  describe('Configuration Loading', () => {
    const mockConfig: AppConfig = {
      ai: {
        default_provider: 'openai',
        default_model: 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 4096,
        providers: {
          openai: {
            name: 'openai',
            api_key: 'test-key',
            base_url: 'https://api.openai.com/v1',
          },
        },
        streaming: true,
        enable_thinking: true,
        context_window_size: 10,
        model_types: {
          chat: ['gpt-3.5-turbo', 'gpt-4'],
          completion: ['text-davinci-003'],
          embedding: ['text-embedding-ada-002'],
        },
      },
      ui: {
        theme: 'dark',
        show_token_usage: true,
        display_format: 'detailed',
        session_duration: 45,
        font_size: 'medium',
        sidebar_width: 256,
        auto_save: true,
        auto_scroll: true,
        show_line_numbers: true,
        enable_markdown: true,
        enable_syntax_highlighting: true,
        compact_mode: false,
      },
      learning: {
        auto_save: true,
        session_timeout_minutes: 120,
        difficulty: 'adaptive',
        learning_style: 'reading',
        personalization_enabled: true,
        checkpoint_interval: 30,
        max_session_history: 100,
        enable_analytics: true,
        preferred_explanation_length: 'detailed',
      },
      privacy: {
        store_conversations: true,
        retention_days: 30,
        anonymous_analytics: true,
        crash_reporting: true,
        encrypt_local_storage: false,
        auto_cleanup: true,
        export_format: 'json',
      },
      performance: {
        cache_size_mb: 100,
        enable_caching: true,
        max_concurrent_requests: 3,
        request_timeout: 30,
        memory_limit_mb: 512,
        gpu_acceleration: false,
        background_processing: true,
        preload_models: false,
      },
    };

    it('loads configuration from storage', async () => {
      mockGetConfig.mockResolvedValue(mockConfig);

      const config = await service.loadConfig();

      expect(mockGetConfig).toHaveBeenCalled();
      expect(config).toEqual(mockConfig);
    });

    it('returns default config when no stored config exists', async () => {
      mockGetConfig.mockResolvedValue(null);

      const config = await service.loadConfig();

      expect(config.ai.default_provider).toBe('openai');
      expect(config.ui.theme).toBe('dark');
      expect(config).toBeDefined();
    });

    it('handles config loading errors gracefully', async () => {
      mockGetConfig.mockRejectedValue(new Error('Storage error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

      const config = await service.loadConfig();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load configuration:', expect.any(Error));
      expect(config.ai.default_provider).toBe('openai'); // Should return default config
      expect(config.ui.theme).toBe('dark');

      consoleSpy.mockRestore();
    });

    it('prevents concurrent config loading', async () => {
      mockGetConfig.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockConfig), 100))
      );

      const [config1, config2, config3] = await Promise.all([
        service.loadConfig(),
        service.loadConfig(),
        service.loadConfig(),
      ]);

      expect(mockGetConfig).toHaveBeenCalledTimes(1);
      expect(config1).toEqual(mockConfig);
      expect(config2).toEqual(mockConfig);
      expect(config3).toEqual(mockConfig);
    });

    it('validates loaded configuration', async () => {
      const invalidConfig = {
        ...mockConfig,
        ai: {
          ...mockConfig.ai,
          temperature: 5, // Invalid temperature
          default_provider: '', // Invalid provider
        },
      };

      mockGetConfig.mockResolvedValue(invalidConfig);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      const config = await service.loadConfig();

      expect(consoleSpy).toHaveBeenCalledWith('Configuration validation failed:', expect.any(Array));
      expect(config.ai.temperature).toBe(0.7); // Should fallback to default
      expect(config.ai.default_provider).toBe('openai'); // Should fallback to default

      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Saving', () => {
    const mockPartialConfig: Partial<AppConfig> = {
      ui: {
        theme: 'light',
        show_token_usage: false,
        display_format: 'compact',
        session_duration: 60,
        font_size: 'large',
        sidebar_width: 300,
        auto_save: false,
        auto_scroll: false,
        show_line_numbers: false,
        enable_markdown: false,
        enable_syntax_highlighting: false,
        compact_mode: true,
      },
    };

    beforeEach(() => {
      // Set up initial config
      mockGetConfig.mockResolvedValue({
        ai: {
          default_provider: 'openai',
          default_model: 'gpt-3.5-turbo',
          temperature: 0.7,
          max_tokens: 4096,
          providers: {},
          streaming: true,
          enable_thinking: true,
          context_window_size: 10,
        },
        ui: {
          theme: 'dark',
          show_token_usage: true,
          display_format: 'detailed',
          session_duration: 45,
          font_size: 'medium',
          sidebar_width: 256,
          auto_save: true,
          auto_scroll: true,
          show_line_numbers: true,
          enable_markdown: true,
          enable_syntax_highlighting: true,
          compact_mode: false,
        },
        learning: {
          auto_save: true,
          session_timeout_minutes: 120,
          difficulty: 'adaptive',
          learning_style: 'reading',
          personalization_enabled: true,
          checkpoint_interval: 30,
          max_session_history: 100,
          enable_analytics: true,
          preferred_explanation_length: 'detailed',
        },
        privacy: {
          store_conversations: true,
          retention_days: 30,
          anonymous_analytics: true,
          crash_reporting: true,
          encrypt_local_storage: false,
          auto_cleanup: true,
          export_format: 'json',
        },
        performance: {
          cache_size_mb: 100,
          enable_caching: true,
          max_concurrent_requests: 3,
          request_timeout: 30,
          memory_limit_mb: 512,
          gpu_acceleration: false,
          background_processing: true,
          preload_models: false,
        },
      });

      mockSetConfig.mockResolvedValue(undefined);
    });

    it('saves configuration changes', async () => {
      await service.saveConfig(mockPartialConfig);

      expect(mockSetConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          ui: expect.objectContaining({
            theme: 'light',
            show_token_usage: false,
          }),
        })
      );
    });

    it('validates configuration before saving', async () => {
      const invalidConfig = {
        ai: {
          temperature: 5, // Invalid
          default_provider: '', // Invalid
        },
      };

      await expect(service.saveConfig(invalidConfig)).rejects.toThrow(
        'Invalid configuration:'
      );
      expect(mockSetConfig).not.toHaveBeenCalled();
    });

    it('handles save errors', async () => {
      mockSetConfig.mockRejectedValue(new Error('Save failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

      await expect(service.saveConfig(mockPartialConfig)).rejects.toThrow('Save failed');

      expect(consoleSpy).toHaveBeenCalledWith('Failed to save configuration:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('loads config if not already loaded when saving', async () => {
      // Reset instance to ensure no config is loaded
      (ConfigService as any).instance = null;
      service = ConfigService.getInstance();

      await service.saveConfig(mockPartialConfig);

      expect(mockGetConfig).toHaveBeenCalled();
      expect(mockSetConfig).toHaveBeenCalled();
    });
  });

  describe('Configuration Retrieval', () => {
    const mockConfig: AppConfig = {
      ai: {
        default_provider: 'openai',
        default_model: 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 4096,
        providers: {},
        streaming: true,
        enable_thinking: true,
        context_window_size: 10,
        model_types: {
          chat: ['gpt-3.5-turbo', 'gpt-4'],
          completion: ['text-davinci-003'],
          embedding: ['text-embedding-ada-002'],
        },
      },
      ui: {
        theme: 'dark',
        show_token_usage: true,
        display_format: 'detailed',
        session_duration: 45,
        font_size: 'medium',
        sidebar_width: 256,
        auto_save: true,
        auto_scroll: true,
        show_line_numbers: true,
        enable_markdown: true,
        enable_syntax_highlighting: true,
        compact_mode: false,
      },
      learning: {
        auto_save: true,
        session_timeout_minutes: 120,
        difficulty: 'adaptive',
        learning_style: 'reading',
        personalization_enabled: true,
        checkpoint_interval: 30,
        max_session_history: 100,
        enable_analytics: true,
        preferred_explanation_length: 'detailed',
      },
      privacy: {
        store_conversations: true,
        retention_days: 30,
        anonymous_analytics: true,
        crash_reporting: true,
        encrypt_local_storage: false,
        auto_cleanup: true,
        export_format: 'json',
      },
      performance: {
        cache_size_mb: 100,
        enable_caching: true,
        max_concurrent_requests: 3,
        request_timeout: 30,
        memory_limit_mb: 512,
        gpu_acceleration: false,
        background_processing: true,
        preload_models: false,
      },
    };

    beforeEach(() => {
      mockGetConfig.mockResolvedValue(mockConfig);
    });

    it('gets current configuration', async () => {
      const config = await service.getConfig();

      expect(config).toEqual(mockConfig);
    });

    it('gets configuration value by key', async () => {
      const value = await service.getConfigValue('ai.default_provider');

      expect(value).toBe('openai');
    });

    it('gets nested configuration value', async () => {
      const value = await service.getConfigValue('ui.theme');

      expect(value).toBe('dark');
    });

    it('returns undefined for non-existent key', async () => {
      const value = await service.getConfigValue('non.existent.key');

      expect(value).toBeUndefined();
    });

    it('sets configuration value by key', async () => {
      await service.setConfigValue('ui.theme', 'light');

      expect(mockSetConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          ui: expect.objectContaining({
            theme: 'light',
          }),
        })
      );
    });

    it('sets nested configuration value', async () => {
      await service.setConfigValue('ai.temperature', 1.0);

      expect(mockSetConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          ai: expect.objectContaining({
            temperature: 1.0,
          }),
        })
      );
    });

    it('creates intermediate objects when setting nested values', async () => {
      await service.setConfigValue('new.nested.key', 'value');

      expect(mockSetConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          new: {
            nested: {
              key: 'value',
            },
          },
        })
      );
    });
  });

  describe('Provider Configuration', () => {
    const mockConfig: AppConfig = {
      ai: {
        default_provider: 'openai',
        default_model: 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 4096,
        providers: {
          openai: {
            name: 'openai',
            api_key: 'test-key',
            base_url: 'https://api.openai.com/v1',
          },
        },
        streaming: true,
        enable_thinking: true,
        context_window_size: 10,
        model_types: {
          chat: ['gpt-3.5-turbo', 'gpt-4'],
          completion: ['text-davinci-003'],
          embedding: ['text-embedding-ada-002'],
        },
      },
      ui: {
        theme: 'dark',
        show_token_usage: true,
        display_format: 'detailed',
        session_duration: 45,
        font_size: 'medium',
        sidebar_width: 256,
        auto_save: true,
        auto_scroll: true,
        show_line_numbers: true,
        enable_markdown: true,
        enable_syntax_highlighting: true,
        compact_mode: false,
      },
      learning: {
        auto_save: true,
        session_timeout_minutes: 120,
        difficulty: 'adaptive',
        learning_style: 'reading',
        personalization_enabled: true,
        checkpoint_interval: 30,
        max_session_history: 100,
        enable_analytics: true,
        preferred_explanation_length: 'detailed',
      },
      privacy: {
        store_conversations: true,
        retention_days: 30,
        anonymous_analytics: true,
        crash_reporting: true,
        encrypt_local_storage: false,
        auto_cleanup: true,
        export_format: 'json',
      },
      performance: {
        cache_size_mb: 100,
        enable_caching: true,
        max_concurrent_requests: 3,
        request_timeout: 30,
        memory_limit_mb: 512,
        gpu_acceleration: false,
        background_processing: true,
        preload_models: false,
      },
    };

    beforeEach(() => {
      mockGetConfig.mockResolvedValue(mockConfig);
      mockSetConfig.mockResolvedValue(undefined);
    });

    it('gets provider configuration', async () => {
      const providerConfig = await service.getProviderConfig('openai');

      expect(providerConfig).toEqual({
        name: 'openai',
        api_key: 'test-key',
        base_url: 'https://api.openai.com/v1',
      });
    });

    it('returns undefined for non-existent provider', async () => {
      const providerConfig = await service.getProviderConfig('nonexistent');

      expect(providerConfig).toBeUndefined();
    });

    it('sets provider configuration', async () => {
      const newProviderConfig: ProviderConfig = {
        name: 'chatglm',
        api_key: 'chatglm-key',
        base_url: 'https://open.bigmodel.cn/api/paas/v4',
      };

      await service.setProviderConfig('chatglm', newProviderConfig);

      expect(mockSetConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          ai: expect.objectContaining({
            providers: expect.objectContaining({
              chatglm: newProviderConfig,
            }),
          }),
        })
      );
    });

    it('removes provider configuration', async () => {
      await service.removeProviderConfig('openai');

      expect(mockSetConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          ai: expect.objectContaining({
            providers: expect.not.objectContaining({
              openai: expect.any(Object),
            }),
          }),
        })
      );
    });

    it('sets default provider and model', async () => {
      await service.setDefaultProvider('chatglm', 'chatglm-pro');

      expect(mockSetConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          ai: expect.objectContaining({
            default_provider: 'chatglm',
            default_model: 'chatglm-pro',
          }),
        })
      );
    });
  });

  describe('Configuration Validation', () => {
    it('rejects non-object configuration', async () => {
      mockGetConfig.mockResolvedValue(null);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();
      await service.loadConfig();

      expect(consoleSpy).not.toHaveBeenCalledWith(
        'Configuration validation failed:',
        expect.any(Array)
      );

      consoleSpy.mockRestore();
    });

    it('rejects configuration without AI section', async () => {
      mockGetConfig.mockResolvedValue({
        ui: { theme: 'dark' },
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();
      await service.loadConfig();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Configuration validation failed:',
        expect.arrayContaining([
          expect.objectContaining({
            field: 'ai',
            message: 'AI configuration is required',
          }),
        ])
      );

      consoleSpy.mockRestore();
    });

    it('rejects invalid AI configuration', async () => {
      mockGetConfig.mockResolvedValue({
        ai: {
          default_provider: '',
          default_model: '',
          temperature: 5,
        },
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();
      await service.loadConfig();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Configuration validation failed:',
        expect.arrayContaining([
          expect.objectContaining({
            field: 'ai.default_provider',
            message: 'Default provider is required',
          }),
          expect.objectContaining({
            field: 'ai.default_model',
            message: 'Default model is required',
          }),
          expect.objectContaining({
            field: 'ai.temperature',
            message: 'Temperature must be between 0 and 2',
          }),
        ])
      );

      consoleSpy.mockRestore();
    });

    it('rejects invalid theme', async () => {
      mockGetConfig.mockResolvedValue({
        ai: {
          default_provider: 'openai',
          default_model: 'gpt-3.5-turbo',
          temperature: 0.7,
          max_tokens: 4096,
          providers: {},
        },
        ui: {
          theme: 'invalid-theme',
        },
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();
      await service.loadConfig();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Configuration validation failed:',
        expect.arrayContaining([
          expect.objectContaining({
            field: 'ui.theme',
            message: 'Theme must be one of: light, dark, auto',
          }),
        ])
      );

      consoleSpy.mockRestore();
    });
  });
});