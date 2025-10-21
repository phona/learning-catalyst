import { configService } from '../services/configService';
import { vi } from 'vitest';

// Mock electronAPI for testing
Object.defineProperty(window, 'electronAPI', {
  value: {
    getConfig: vi.fn(),
    setConfig: vi.fn(),
  },
  writable: true,
});

describe('Workspace Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('loads default configuration', async () => {
    const mockConfig = {
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

    (window.electronAPI.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(mockConfig);

    const defaultConfig = await configService.loadConfig();

    expect(defaultConfig.ai.default_provider).toBe('openai');
    expect(defaultConfig.ui.theme).toBe('dark');
    expect(window.electronAPI.getConfig).toHaveBeenCalled();
  });

  test('modifies and saves configuration values', async () => {
    const mockConfig = {
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

    (window.electronAPI.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(mockConfig);
    (window.electronAPI.setConfig as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await configService.setConfigValue('ui.theme', 'light');
    await configService.setConfigValue('ai.temperature', 0.8);
    await configService.setConfigValue('learning.difficulty', 'advanced');

    const modifiedConfig = await configService.getConfig();

    expect(modifiedConfig.ui.theme).toBe('light');
    expect(modifiedConfig.ai.temperature).toBe(0.8);
    expect(modifiedConfig.learning.difficulty).toBe('advanced');
    expect(window.electronAPI.setConfig).toHaveBeenCalledTimes(3);
  });

  test('manages provider configuration', async () => {
    const mockConfig = {
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

    (window.electronAPI.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue(mockConfig);
    (window.electronAPI.setConfig as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const testProvider = {
      name: 'openai',
      api_key: 'test-key-12345',
      base_url: 'https://api.openai.com/v1',
    };

    await configService.setProviderConfig('openai', testProvider);
    const providerConfig = await configService.getProviderConfig('openai');

    expect(providerConfig?.name).toBe('openai');
    expect(providerConfig?.api_key).toBe('test-key-12345');
    expect(window.electronAPI.setConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        ai: expect.objectContaining({
          providers: expect.objectContaining({
            openai: testProvider,
          }),
        }),
      })
    );
  });
});