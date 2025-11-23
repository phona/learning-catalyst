import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { merge } from 'lodash';
import type { AppConfig, ProviderConfig } from '@/shared/types';
import type { ConfigurationService } from '@/renderer/services/configuration/configuration-service';

const DEFAULT_APP_CONFIG: AppConfig = {
  ai: {
    providers: {},
    modelTypes: {},
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
  learning: {
    autoSave: true,
    sessionTimeoutMinutes: 60,
    difficulty: 'intermediate',
    learningStyle: 'visual',
    personalizationEnabled: true,
    checkpointInterval: 15,
    maxSessionHistory: 100,
    enableAnalytics: false,
    preferredExplanationLength: 'detailed',
  },
  privacy: {
    storeConversations: true,
    retentionDays: 90,
    anonymousAnalytics: false,
    crashReporting: true,
    encryptLocalStorage: false,
    autoCleanup: true,
    exportFormat: 'json',
  },
  performance: {
    cacheSizeMb: 100,
    enableCaching: true,
    maxConcurrentRequests: 5,
    requestTimeout: 30,
    memoryLimitMb: 512,
    gpuAcceleration: false,
    backgroundProcessing: true,
    preloadModels: false,
  },
};

let configurationService: ConfigurationService | null = null;

export const setConfigurationService = (service: ConfigurationService | null) => {
  configurationService = service;
};

const requireConfigurationService = (): ConfigurationService => {
  if (!configurationService) {
    throw new Error(
      'Configuration service has not been initialized. ServicesProvider must be mounted before using the config store.',
    );
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
          const merged = merge({}, DEFAULT_APP_CONFIG, config ?? {});
          set({ config: merged, loading: false }, false, 'loadConfig:success');
          return merged;
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

        await get().updateConfig({
          ai: {
            ...config.ai,
            modelTypes: {
              ...config.ai.modelTypes,
              chat: {
                provider: providerName,
                model: modelName,
                temperature: 0.7,
                maxTokens: 2048,
                topP: 1,
                enableThinking: false,
                stream: true,
              },
            },
          },
        });
      },
    }),
    { name: 'config-store' },
  ),
);
