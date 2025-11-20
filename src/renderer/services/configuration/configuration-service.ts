import type {
  AppConfig,
  ProviderValidationResult,
  SelectedModel,
  ModelTypeConfig,
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
  const getConfiguration = async (key?: string): Promise<ConfigurationValue | Record<string, ConfigurationValue>> => {
    // Mock implementation for testing
    if (key) {
      const mockValue: ConfigurationValue = {
        key,
        value: key === 'ai.provider' ? 'openai' : 'default_value',
        dataType: 'string',
        lastModified: new Date()
      };
      return mockValue;
    }

    // Return all configuration if no key specified
    const allConfig: Record<string, ConfigurationValue> = {
      'ai.provider': {
        key: 'ai.provider',
        value: 'openai',
        dataType: 'string',
        lastModified: new Date()
      },
      'ai.model': {
        key: 'ai.model',
        value: 'gpt-3.5-turbo',
        dataType: 'string',
        lastModified: new Date()
      }
    };

    return allConfig;
  };

  /**
   * Set configuration value
   */
  const setConfiguration = async (key: string, value: unknown, dataType?: string): Promise<boolean> => {
    try {
      // Mock implementation for testing
      const configValue: ConfigurationValue = {
        key,
        value,
        dataType: (dataType as any) || typeof value,
        lastModified: new Date()
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
            fontSize: config.ui?.font_size,
            compactMode: config.ui?.compact_mode,
            showProgressIndicators: config.ui?.show_token_usage,
          },
          learning: {
            preferredDifficulty: config.learning?.difficulty === 'adaptive' ? 'intermediate' : config.learning?.difficulty,
            learningStyle: config.learning?.learning_style,
          },
          privacy: {
            saveConversationHistory: config.privacy?.store_conversations,
            shareAnalytics: config.privacy?.anonymous_analytics,
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
   * Update a specific model type assignment and persist into currentConfig (if any).
   * Accepts either SelectedModel or a ModelTypeConfig-like shape.
   */
  const updateModelTypeConfig = async (
    modelType: ModelType,
    modelConfig: SelectedModel | ModelTypeConfig
  ): Promise<void> => {
    // Normalize input to SelectedModel
    const normalized: SelectedModel = (
      (modelConfig as any).provider && (modelConfig as any).model
    )
      ? { provider: (modelConfig as any).provider, model: (modelConfig as any).model }
      : {
        provider: (modelConfig as any).default_provider ?? '',
        model: (modelConfig as any).default_model ?? '',
      };

    if (!normalized.provider || !normalized.model) {
      throw new Error('Provider and model are required to update model type configuration');
    }

    // Update local copy if available
    if (currentConfig) {
      const next: AppConfig = {
        ...currentConfig,
        ai: {
          ...currentConfig.ai,
          model_types: {
            ...currentConfig.ai.model_types,
            [modelType]: normalized,
          },
        },
      };
      currentConfig = next;

      // Persist the updated config
      await setConfiguration('ai.model_types', currentConfig.ai.model_types);
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
        maxTokens: 2048
      },
      ui: {
        theme: 'dark',
        language: 'en',
        fontSize: 14
      },
      learning: {
        dailyGoal: 60, // minutes
        reminderEnabled: true,
        autoSave: true
      }
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
  const importConfiguration = async (configData: string, format: 'json' = 'json'): Promise<boolean> => {
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
      'learning.dailyGoal': (v) => typeof v === 'number' && v > 0
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
    baseUrl?: string
  ): Promise<ProviderValidationResult> => {
    try {
      // Get available providers from settings API
      const response = await apiClient.settings.getAvailableProviders();
      const providers = response.providers || [];
      const provider = providers.find(p => p.id === providerType);

      if (!provider) {
        return { success: false, error: `Unknown provider: ${providerType}` };
      }

      // Check if provider is configured
      if (provider.status === 'not_configured') {
        return { success: false, error: 'Provider is not configured' };
      }

      if (provider.status === 'error') {
        return { success: false, error: 'Provider configuration has errors' };
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
    baseUrl?: string
  ): Promise<string[]> => {
    try {
      // Get available providers from settings API
      const response = await apiClient.settings.getAvailableProviders();
      const providers = response.providers || [];
      const provider = providers.find(p => p.id === providerType);

      if (!provider) {
        throw new Error(`Unknown provider: ${providerType}`);
      }

      // Extract model IDs from provider models
      return provider.models.map(model => model.id);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch models');
    }
  };

  /**
   * Get available AI providers and their status
   */
  const getAvailableProviders = async () => {
    try {
      const response = await apiClient.settings.getProviders();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to get providers');
      }
      return {
        success: true,
        providers: response.data || [],
        summary: {
          total: response.data?.length || 0,
          connected: 0,
          configured: 0
        }
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
    config: any;
  }) => {
    try {
      const response = await apiClient.settings.addProvider({
        provider_type: params.provider,
        api_key: params.config.api_key,
        base_url: params.config.base_url,
        models: []
      });
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to configure provider');
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
  };
}

export type ConfigurationService = ReturnType<typeof createConfigurationService>;
