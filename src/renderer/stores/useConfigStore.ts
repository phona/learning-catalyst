import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AppConfig, ProviderConfig } from '@/shared/types/config';

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
          // Use documented settingsAPI method
          const userPrefs = await window.electronAPI.settings.getUserPreferences();
          // Map user preferences to AppConfig format
          const config: AppConfig = {
            ai: {
              providers: {},
              model_types: {},
            },
            ui: {
              theme: (userPrefs.interface?.theme as 'light' | 'dark' | 'auto') || 'light',
              show_token_usage: userPrefs.interface?.showProgressIndicators || false,
              display_format: 'detailed',
              session_duration: userPrefs.learning?.preferredSessionDuration ? parseInt(userPrefs.learning.preferredSessionDuration) : 25,
              font_size: (userPrefs.interface?.fontSize as 'small' | 'medium' | 'large') || 'medium',
              sidebar_width: 300,
              auto_save: true,
              auto_scroll: true,
              show_line_numbers: false,
              enable_markdown: true,
              enable_syntax_highlighting: true,
              compact_mode: userPrefs.interface?.compactMode || false,
            },
            learning: {
              auto_save: true,
              session_timeout_minutes: 60,
              difficulty: (userPrefs.learning?.preferredDifficulty as any) || 'intermediate',
              learning_style: (userPrefs.learning?.learningStyle as any) || 'visual',
              personalization_enabled: true,
              checkpoint_interval: 15,
              max_session_history: 100,
              enable_analytics: (userPrefs.learning as any)?.tracking?.enableAnalytics || false,
              preferred_explanation_length: 'detailed',
            },
            privacy: {
              store_conversations: userPrefs.privacy?.saveConversationHistory || true,
              retention_days: userPrefs.privacy?.dataRetentionDays || 90,
              anonymous_analytics: userPrefs.privacy?.shareAnalytics || false,
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
          // Map AppConfig to user preferences format for the documented API
          const preferences = {
            interface: {
              theme: config.ui.theme,
              fontSize: config.ui.font_size,
              enableAnimations: true,
              compactMode: config.ui.compact_mode,
              showProgressIndicators: config.ui.show_token_usage,
            },
            learning: {
              preferredDifficulty: config.learning.difficulty === 'adaptive' ? 'intermediate' : config.learning.difficulty,
              learningStyle: config.learning.learning_style,
              preferredSessionDuration: `${config.ui.session_duration}min` as '15min' | '25min' | '45min' | '60min' | 'custom',
              enableReminders: true,
              reminderTime: '19:00',
              dailyGoalMinutes: 30,
              weeklyGoalSessions: 5,
              tracking: {
                enableAnalytics: config.learning.enable_analytics,
                shareProgress: false,
                detailedLogging: true,
                exportData: false,
              },
            },
            privacy: {
              shareAnalytics: config.privacy.anonymous_analytics,
              saveConversationHistory: config.privacy.store_conversations,
              dataRetentionDays: config.privacy.retention_days,
            },
          };

          await window.electronAPI.settings.updatePreferences(preferences);
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
          // Since there's no direct resetConfig in the documented API,
          // create a default config and save it
          const defaultConfig: AppConfig = {
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

          // Save the default config using the documented API
          await get().saveConfig(defaultConfig);
          set({ config: defaultConfig, loading: false }, false, 'resetConfig:success');
          return defaultConfig;
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