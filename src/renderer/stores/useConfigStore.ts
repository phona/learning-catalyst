import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AppConfig, ProviderConfig } from '@/types/config';

interface ConfigStore {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadConfig: () => Promise<AppConfig | null>;
  saveConfig: (config: AppConfig) => Promise<void>;
  updateConfig: (updates: Partial<AppConfig>) => Promise<void>;
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
          const config = await window.electronAPI.getConfig();
          set({ config, loading: false }, false, 'loadConfig:success');
          return config;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load config';
          set({ error: errorMessage, loading: false }, false, 'loadConfig:error');
          return null;
        }
      },

      saveConfig: async (config: AppConfig) => {
        set({ loading: true, error: null }, false, 'saveConfig:start');

        try {
          await window.electronAPI.setConfig(config);
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

        const { [providerName]: removed, ...remainingProviders } = config.ai.providers;

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

        await get().updateConfig({
          ai: {
            ...config.ai,
            default_provider: providerName,
            default_model: modelName,
          },
        });
      },
    }),
    { name: 'config-store' }
  )
);