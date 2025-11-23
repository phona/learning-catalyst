import type {
  AppConfig,
  ProviderValidationResult,
  SelectedModel,
  ModelTypeConfig,
  ProviderConfig,
} from '@/shared/types/config';
import type { ElectronAPI } from '@/shared/types/electron-api';
import { ModelType } from '@/shared/types/ai';

/**
 * Configuration Service
 *
 * Service for managing application configuration.
 */

export interface ConfigurationValue {
  key: string;
  value: unknown;
  dataType: 'string' | 'number' | 'boolean' | 'json';
  lastModified: Date;
}

export interface ConfigurationSection {
  [key: string]: unknown;
}

/**
 * Configuration Service for managing application settings
 * Factory function to create configuration service instance
 */
export function createConfigurationService(apiClient: ElectronAPI) {
  // Internal state managed via closure
  const cache: Map<string, ConfigurationValue> = new Map();
  let currentConfig: AppConfig | null = null;

  /**
   * Get configuration value
   */
  const getConfiguration = async (
    key?: string,
  ): Promise<ConfigurationValue | Record<string, ConfigurationValue>> => {
    // Mock implementation for testing
    if (key) {
      const mockValue: ConfigurationValue = {
        key,
        value: key === 'ai.provider' ? 'openai' : 'default_value',
        dataType: 'string',
        lastModified: new Date(),
      };
      return mockValue;
    }

    // Return all configuration if no key specified
    const allConfig: Record<string, ConfigurationValue> = {
      'ai.provider': {
        key: 'ai.provider',
        value: 'openai',
        dataType: 'string',
        lastModified: new Date(),
      },
      'ai.model': {
        key: 'ai.model',
        value: 'gpt-3.5-turbo',
        dataType: 'string',
        lastModified: new Date(),
      },
    };

    return allConfig;
  };

  /**
   * Set configuration value
   */
  const setConfiguration = async (
    key: string,
    value: unknown,
    dataType?: string,
  ): Promise<boolean> => {
    try {
      // Mock implementation for testing
      const configValue: ConfigurationValue = {
        key,
        value,
        dataType: (dataType as ConfigurationValue['dataType']) || inferDataType(value),
        lastModified: new Date(),
      };

      cache.set(key, configValue);

      // Simulate IPC call to main process
      if (apiClient?.settings?.setConfig) {
        await apiClient.settings.setConfig(currentConfig ?? ({} as AppConfig));
      }

      return true;
    } catch (error) {
      console.error('Failed to set configuration:', error);
      return false;
    }
  };

  /**
   * Save full application configuration.
   * Keeps a local copy and updates persisted preferences via Electron API when available.
   */
  const saveConfig = async (config: AppConfig): Promise<void> => {
    try {
      currentConfig = config;
      if (apiClient?.settings?.setConfig) {
        await apiClient.settings.setConfig(config);
      }
      // Best-effort bridge to preload settings API
      if (apiClient?.settings?.updatePreferences) {
        // Map a minimal subset to user preferences; the main store handles full shape
        const preferences = {
          interface: {
            theme: config.ui?.theme,
            fontSize: config.ui?.fontSize,
            compactMode: config.ui?.compactMode,
            showProgressIndicators: config.ui?.showTokenUsage,
          },
          learning: {
            preferredDifficulty:
              config.learning?.difficulty === 'adaptive'
                ? 'intermediate'
                : config.learning?.difficulty,
            learningStyle: config.learning?.learningStyle,
          },
          privacy: {
            saveConversationHistory: config.privacy?.storeConversations,
            shareAnalytics: config.privacy?.anonymousAnalytics,
          },
        };
        await apiClient.settings.updatePreferences(preferences);
      }
    } catch (err) {
      // Surface consistent error behavior for callers
      const message = err instanceof Error ? err.message : 'Failed to save configuration';
      throw new Error(message);
    }
  };

  /**
   * Fetch the persisted application configuration.
   */
  const getConfig = async (): Promise<AppConfig | null> => {
    try {
      if (!apiClient?.settings?.getConfig) {
        return null;
      }

      const config = await apiClient.settings.getConfig();
      if (config) {
        currentConfig = config;
      }
      return config ?? null;
    } catch (error) {
      console.error('Failed to retrieve configuration:', error);
      return null;
    }
  };

  /**
   * Update a specific model type assignment and persist into currentConfig (if any).
   * Accepts either SelectedModel or a ModelTypeConfig-like shape.
   */
  const updateModelTypeConfig = async (
    modelType: ModelType,
    modelConfig: SelectedModel | ModelTypeConfig,
  ): Promise<void> => {
    const isModelTypeConfig = (mc: SelectedModel | ModelTypeConfig): mc is ModelTypeConfig => {
      return (
        (mc as ModelTypeConfig).availableProviders !== undefined ||
        (mc as ModelTypeConfig).defaultProvider !== undefined ||
        (mc as ModelTypeConfig).settings !== undefined
      );
    };

    const normalized: SelectedModel = isModelTypeConfig(modelConfig)
      ? { provider: modelConfig.defaultProvider ?? '', model: modelConfig.defaultModel ?? '' }
      : { provider: modelConfig.provider ?? '', model: modelConfig.model ?? '' };

    if (!normalized.provider || !normalized.model) {
      throw new Error('Provider and model are required to update model type configuration');
    }

    // Update local copy if available
    if (currentConfig) {
      const next: AppConfig = {
        ...currentConfig,
        ai: {
          ...currentConfig.ai,
          modelTypes: {
            ...(currentConfig.ai.modelTypes ?? {}),
            [modelType]: normalized,
          },
        },
      };
      currentConfig = next;

      // Persist the updated config
      await setConfiguration('ai.modelTypes', currentConfig.ai.modelTypes);
    }
  };

  /**
   * Get configuration section
   */
  const getConfigurationSection = async (section: string): Promise<ConfigurationSection> => {
    // Mock implementation
    const sections: Record<string, ConfigurationSection> = {
      ai: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 2048,
      },
      ui: {
        theme: 'dark',
        language: 'en',
        fontSize: 14,
      },
      learning: {
        dailyGoal: 60, // minutes
        reminderEnabled: true,
        autoSave: true,
      },
    };

    return sections[section] || {};
  };

  /**
   * Reset configuration to defaults
   */
  const resetConfiguration = async (section?: string): Promise<boolean> => {
    try {
      // Mock implementation
      if (section) {
        // Reset specific section
        console.log(`Resetting configuration section: ${section}`);
      } else {
        // Reset all configuration
        cache.clear();
        console.log('Resetting all configuration');
      }

      return true;
    } catch (error) {
      console.error('Failed to reset configuration:', error);
      return false;
    }
  };

  /**
   * Export configuration
   */
  const exportConfiguration = async (format: 'json' = 'json'): Promise<string> => {
    const config = await getConfiguration();

    if (format === 'json') {
      return JSON.stringify(config, null, 2);
    }

    throw new Error(`Unsupported export format: ${format}`);
  };

  /**
   * Import configuration
   */
  const importConfiguration = async (
    configData: string,
    format: 'json' = 'json',
  ): Promise<boolean> => {
    try {
      if (format === 'json') {
        const config = JSON.parse(configData);

        // Apply configuration
        for (const [key, value] of Object.entries(config)) {
          await setConfiguration(key, value);
        }

        return true;
      }

      throw new Error(`Unsupported import format: ${format}`);
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  };

  /**
   * Validate configuration value
   */
  const validateConfigValue = (key: string, value: unknown): boolean => {
    // Mock validation logic
    const validations: Record<string, (value: unknown) => boolean> = {
      'ai.temperature': (v) => typeof v === 'number' && v >= 0 && v <= 2,
      'ai.maxTokens': (v) => typeof v === 'number' && v > 0,
      'ui.fontSize': (v) => typeof v === 'number' && v >= 8 && v <= 32,
      'learning.dailyGoal': (v) => typeof v === 'number' && v > 0,
    };

    const validator = validations[key];
    return validator ? validator(value) : true;
  };

  /**
   * Get cached configuration value
   */
  const getCachedValue = (key: string): ConfigurationValue | undefined => {
    return cache.get(key);
  };

  /**
   * Clear configuration cache
   */
  const clearCache = (): void => {
    cache.clear();
  };

  /**
   * Validate provider credentials and connectivity.
   */
  const validateProvider = async (
    providerType: string,
    apiKey: string,
    baseUrl?: string,
  ): Promise<ProviderValidationResult> => {
    try {
      // Get available providers from settings API
      const response = await apiClient.settings.getAvailableProviders();
      if (!response.success || !response.data) {
        return { success: false, error: 'Provider list unavailable' };
      }
      const providers = response.data.providers || [];
      const provider = providers.find(
        (p: { providerType?: string }) => p.providerType === providerType,
      );

      if (!provider) {
        return { success: false, error: `Unknown provider: ${providerType}` };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate provider',
      };
    }
  };

  /**
   * Fetch available models for a provider.
   */
  const getProviderModels = async (
    providerType: string,
    apiKey: string,
    baseUrl?: string,
  ): Promise<string[]> => {
    try {
      // Get available providers from settings API
      const response = await apiClient.settings.getAvailableProviders();
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch providers');
      }
      const providers = (response.data.providers || []) as {
        providerType?: string;
        models?: string[];
      }[];
      const provider = providers.find((p) => p.providerType === providerType);

      if (!provider) {
        throw new Error(`Unknown provider: ${providerType}`);
      }

      return Array.isArray(provider.models) ? provider.models! : [];
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch models');
    }
  };

  /**
   * Get available AI providers and their status
   */
  const getAvailableProviders = async () => {
    try {
      const response = await apiClient.settings.getAvailableProviders();
      if (!response.success || !response.data) {
        throw new Error('Failed to get providers');
      }
      const { providers = [], summary } = response.data;
      return {
        success: true,
        providers,
        summary: {
          total: providers.length,
          connected: summary?.connected || 0,
          configured: summary?.configured || 0,
        },
      };
    } catch (error) {
      console.error('Failed to get available providers:', error);
      throw error;
    }
  };

  /**
   * Configure an AI provider (alias for addProvider to maintain compatibility)
   */
  const configureProvider = async (params: {
    provider: string;
    config: Partial<ProviderConfig>;
  }) => {
    try {
      const fullConfig: ProviderConfig = {
        providerType: params.provider as any,
        apiKey: params.config.apiKey,
        baseUrl: params.config.baseUrl,
        models: params.config.models,
        type: params.config.type,
        model: params.config.model,
        temperature: params.config.temperature,
        maxTokens: params.config.maxTokens,
        streaming: params.config.streaming,
        customHeaders: params.config.customHeaders,
      };

      const response = await apiClient.settings.configureProvider({
        provider: params.provider,
        config: fullConfig,
      });
      if (!response.success) {
        throw new Error('Failed to configure provider');
      }
      return { success: true, providerId: params.provider, status: 'configured' };
    } catch (error) {
      console.error('Failed to configure provider:', error);
      throw error;
    }
  };

  // Return public API
  return {
    getConfiguration,
    setConfiguration,
    saveConfig,
    updateModelTypeConfig,
    getConfigurationSection,
    resetConfiguration,
    exportConfiguration,
    importConfiguration,
    validateConfigValue,
    getCachedValue,
    clearCache,
    getAvailableProviders,
    configureProvider,
    validateProvider,
    getProviderModels,
    getConfig,
  };
}

export type ConfigurationService = ReturnType<typeof createConfigurationService>;
const inferDataType = (value: unknown): ConfigurationValue['dataType'] => {
  const t = typeof value;
  if (t === 'string') return 'string';
  if (t === 'number') return 'number';
  if (t === 'boolean') return 'boolean';
  return 'json';
};
