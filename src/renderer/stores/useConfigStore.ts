


import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AppConfig, ProviderConfig } from '@/shared/types/config';
import type { ConfigurationService } from '@/renderer/services/configuration/configuration-service';

const DEFAULT_APP_CONFIG: AppConfig = {
  ai: {
    providers: {},
    model_types: {},
  },
  ui: {
    theme: 'light',
    show_token_usage: false,
    display_format: 'detailed',
    session_duration: 25,
    font_size: 'medium',
    sidebar_width: 300,
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
    difficulty: 'intermediate',
    learning_style: 'visual',
    personalization_enabled: true,
    checkpoint_interval: 15,
    max_session_history: 100,
    enable_analytics: false,
    preferred_explanation_length: 'detailed',
  },
  privacy: {
    store_conversations: true,
    retention_days: 90,
    anonymous_analytics: false,
    crash_reporting: true,
    encrypt_local_storage: false,
    auto_cleanup: true,
    export_format: 'json',
  },
  performance: {
    cache_size_mb: 100,
    enable_caching: true,
    max_concurrent_requests: 5,
    request_timeout: 30,
    memory_limit_mb: 512,
    gpu_acceleration: false,
    background_processing: true,
    preload_models: false,
  },
};

let configurationService: ConfigurationService | null = null;

export const setConfigurationService = (service: ConfigurationService | null) => {
  configurationService = service;
};

const requireConfigurationService = (): ConfigurationService => {
  if (!configurationService) {
    throw new Error('Configuration service has not been initialized. ServicesProvider must be mounted before using the config store.');
  }
  return configurationService;
};

interface ConfigStore {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadConfig: () => Promise<AppConfig | null>;
  setConfig: (config: AppConfig) => void;
  saveConfig: (config: AppConfig) => Promise<void>;
  updateConfig: (updates: Partial<AppConfig>) => Promise<void>;
  resetConfig: () => Promise<AppConfig>;
  getProviderConfig: (providerName: string) => ProviderConfig | undefined;
  setProviderConfig: (providerName: string, config: ProviderConfig) => Promise<void>;
  removeProviderConfig: (providerName: string) => Promise<void>;
  setDefaultProvider: (providerName: string, modelName: string) => Promise<void>;
}

export const useConfigStore = create<ConfigStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      config: null,
      loading: false,
      error: null,

      // Actions
      loadConfig: async () => {
        set({ loading: true, error: null }, false, 'loadConfig:start');

        try {
          const service = requireConfigurationService();
          const config = await service.getConfig();
          set({ config, loading: false }, false, 'loadConfig:success');
          return config;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load config';
          set({ error: errorMessage, loading: false }, false, 'loadConfig:error');
          return null;
        }
      },

      setConfig: (config: AppConfig) => {
        set({ config }, false, 'setConfig');
      },

      saveConfig: async (config: AppConfig) => {
        set({ loading: true, error: null }, false, 'saveConfig:start');

        try {
          const service = requireConfigurationService();
          await service.saveConfig(config);
          set({ config, loading: false }, false, 'saveConfig:success');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to save config';
          set({ error: errorMessage, loading: false }, false, 'saveConfig:error');
          throw error;
        }
      },

      updateConfig: async (updates: Partial<AppConfig>) => {
        const { config } = get();
        if (!config) throw new Error('No config loaded');

        const updatedConfig = { ...config, ...updates };
        await get().saveConfig(updatedConfig);
      },

      resetConfig: async () => {
        set({ loading: true, error: null }, false, 'resetConfig:start');

        try {
          const service = requireConfigurationService();
          await service.saveConfig(DEFAULT_APP_CONFIG);
          set({ config: DEFAULT_APP_CONFIG, loading: false }, false, 'resetConfig:success');
          return DEFAULT_APP_CONFIG;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to reset config';
          set({ error: errorMessage, loading: false }, false, 'resetConfig:error');
          throw error;
        }
      },

      getProviderConfig: (providerName: string) => {
        const { config } = get();
        return config?.ai?.providers?.[providerName];
      },

      setProviderConfig: async (providerName: string, providerConfig: ProviderConfig) => {
        const { config } = get();
        if (!config) throw new Error('No config loaded');

        const updatedConfig = {
          ...config,
          ai: {
            ...config.ai,
            providers: {
              ...config.ai.providers,
              [providerName]: providerConfig,
            },
          },
        };

        await get().saveConfig(updatedConfig);
      },

      removeProviderConfig: async (providerName: string) => {
        const { config } = get();
        if (!config) throw new Error('No config loaded');

        const { [providerName]: _removed, ...remainingProviders } = config.ai.providers;

        const updatedConfig = {
          ...config,
          ai: {
            ...config.ai,
            providers: remainingProviders,
          },
        };

        await get().saveConfig(updatedConfig);
      },

      setDefaultProvider: async (providerName: string, modelName: string) => {
        const { config } = get();
        if (!config) throw new Error('No config loaded');

        // Update the model_types to set default chat model
        await get().updateConfig({
          ai: {
            ...config.ai,
            model_types: {
              ...config.ai.model_types,
              chat: {
                provider: providerName,
                model: modelName,
                temperature: 0.7,
                max_tokens: 2048,
                top_p: 1,
                enable_thinking: false,
                stream: true,
              },
            },
          },
        });
      },
    }),
    { name: 'config-store' }
  )
);
