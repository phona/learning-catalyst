/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */




import { PREDEFINED_PROVIDERS } from '@/shared/constants/providers';
import type {
  AppConfig,
  ProviderValidationResult,
  SelectedModel,
  ModelTypeConfig,
} from '@/shared/types/config';
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
 */
export class ConfigurationService {
  private readonly cache: Map<string, ConfigurationValue> = new Map();
  private currentConfig: AppConfig | null = null;

  /**
   * Get configuration value
   */
  async getConfiguration(key?: string): Promise<ConfigurationValue | Record<string, ConfigurationValue>> {
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
  }

  /**
   * Set configuration value
   */
  async setConfiguration(key: string, value: unknown, dataType?: string): Promise<boolean> {
    try {
      // Mock implementation for testing
      const configValue: ConfigurationValue = {
        key,
        value,
        dataType: (dataType as any) || typeof value,
        lastModified: new Date()
      };

      this.cache.set(key, configValue);

      // Simulate IPC call to main process
      if (window.electronAPI?.setConfig) {
        await window.electronAPI.setConfig(key, value);
      }

      return true;
    } catch (error) {
      console.error('Failed to set configuration:', error);
      return false;
    }
  }

  /**
   * Save full application configuration.
   * Keeps a local copy and updates persisted preferences via Electron API when available.
   */
  async saveConfig(config: AppConfig): Promise<void> {
    try {
      this.currentConfig = config;
      // Best-effort bridge to preload settings API
      if (window?.electronAPI?.settings?.updatePreferences) {
        // Map a minimal subset to user preferences; the main store handles full shape
        const preferences = {
          interface: {
            theme: config.ui?.theme,
            fontSize: config.ui?.font_size,
            compactMode: config.ui?.compact_mode,
            showProgressIndicators: config.ui?.show_token_usage,
          },
          learning: {
            preferredDifficulty: config.learning?.difficulty,
            learningStyle: config.learning?.learning_style,
          },
          privacy: {
            saveConversationHistory: config.privacy?.store_conversations,
            shareAnalytics: config.privacy?.anonymous_analytics,
          },
        } as any;
        await window.electronAPI.settings.updatePreferences(preferences);
      }
    } catch (err) {
      // Surface consistent error behavior for callers
      const message = err instanceof Error ? err.message : 'Failed to save configuration';
      throw new Error(message);
    }
  }

  /**
   * Update a specific model type assignment and persist into currentConfig (if any).
   * Accepts either SelectedModel or a ModelTypeConfig-like shape.
   */
  async updateModelTypeConfig(
    modelType: ModelType,
    modelConfig: SelectedModel | ModelTypeConfig
  ): Promise<void> {
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
    if (this.currentConfig) {
      const next: AppConfig = {
        ...this.currentConfig,
        ai: {
          ...this.currentConfig.ai,
          model_types: {
            ...this.currentConfig.ai.model_types,
            [modelType]: normalized,
          },
        },
      };
      this.currentConfig = next;
    }
  }

  /**
   * Get configuration section
   */
  async getConfigurationSection(section: string): Promise<ConfigurationSection> {
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
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfiguration(section?: string): Promise<boolean> {
    try {
      // Mock implementation
      if (section) {
        // Reset specific section
        console.log(`Resetting configuration section: ${section}`);
      } else {
        // Reset all configuration
        this.cache.clear();
        console.log('Resetting all configuration');
      }

      return true;
    } catch (error) {
      console.error('Failed to reset configuration:', error);
      return false;
    }
  }

  /**
   * Export configuration
   */
  async exportConfiguration(format: 'json' = 'json'): Promise<string> {
    const config = await this.getConfiguration();

    if (format === 'json') {
      return JSON.stringify(config, null, 2);
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Import configuration
   */
  async importConfiguration(configData: string, format: 'json' = 'json'): Promise<boolean> {
    try {
      if (format === 'json') {
        const config = JSON.parse(configData);

        // Apply configuration
        for (const [key, value] of Object.entries(config)) {
          await this.setConfiguration(key, value);
        }

        return true;
      }

      throw new Error(`Unsupported import format: ${format}`);
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  }

  /**
   * Validate configuration value
   */
  private validateConfigValue(key: string, value: unknown): boolean {
    // Mock validation logic
    const validations: Record<string, (value: unknown) => boolean> = {
      'ai.temperature': (v) => typeof v === 'number' && v >= 0 && v <= 2,
      'ai.maxTokens': (v) => typeof v === 'number' && v > 0,
      'ui.fontSize': (v) => typeof v === 'number' && v >= 8 && v <= 32,
      'learning.dailyGoal': (v) => typeof v === 'number' && v > 0
    };

    const validator = validations[key];
    return validator ? validator(value) : true;
  }

  /**
   * Get cached configuration value
   */
  getCachedValue(key: string): ConfigurationValue | undefined {
    return this.cache.get(key);
  }

  /**
   * Clear configuration cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Validate provider credentials and connectivity.
   */
  async validateProvider(
    providerType: string,
    apiKey: string,
    baseUrl?: string
  ): Promise<ProviderValidationResult> {
    const endpoint = this.resolveProviderEndpoint(providerType, baseUrl);
    if (!endpoint) {
      return { success: false, error: `Unknown provider: ${providerType}` };
    }

    try {
      const response = await fetch(`${endpoint}/models`, {
        method: 'GET',
        headers: this.buildProviderHeaders(apiKey),
      });

      if (response.ok) {
        return { success: true };
      }

      const payload = await response.json().catch(() => null);
      const errorMessage =
        payload?.error?.message ||
        `${response.status} ${response.statusText}` ||
        'Unknown provider validation error';

      return { success: false, error: errorMessage };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reach provider',
      };
    }
  }

  /**
   * Fetch available models for a provider.
   */
  async getProviderModels(
    providerType: string,
    apiKey: string,
    baseUrl?: string
  ): Promise<string[]> {
    const endpoint = this.resolveProviderEndpoint(providerType, baseUrl);
    if (!endpoint) {
      throw new Error(`Unknown provider: ${providerType}`);
    }

    const response = await fetch(`${endpoint}/models`, {
      method: 'GET',
      headers: this.buildProviderHeaders(apiKey),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const errorMessage =
        payload?.error?.message ||
        `${response.status} ${response.statusText}` ||
        'Failed to fetch models';
      throw new Error(errorMessage);
    }

    const data = await response.json().catch(() => null);

    if (!data) {
      return [];
    }

    if (Array.isArray(data)) {
      return this.extractModelIdentifiers(data);
    }

    if (Array.isArray(data.data)) {
      return this.extractModelIdentifiers(data.data);
    }

    if (Array.isArray(data.models)) {
      return this.extractModelIdentifiers(data.models);
    }

    return [];
  }

  private resolveProviderEndpoint(providerType: string, override?: string): string | null {
    const rawUrl = override?.trim() || PREDEFINED_PROVIDERS[providerType]?.base_url;
    if (!rawUrl) {
      return null;
    }

    return rawUrl.replace(/\/+$/, '');
  }

  private buildProviderHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private extractModelIdentifiers(models: Array<any>): string[] {
    return models
      .map((model) => {
        if (typeof model === 'string') {
          return model;
        }

        if (model && typeof model === 'object') {
          return model.id || model.name || model.model || null;
        }

        return null;
      })
      .filter((value): value is string => Boolean(value));
  }
}
