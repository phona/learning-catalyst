import { unwrapAPI } from '@/renderer/hooks/useElectronAPI.helpers';
import type { AppConfig, ProviderValidationResult, ProviderConfig } from '@/shared/types/config';
import type { ElectronAPI } from '@/shared/types/electron-api';
import _ from 'lodash';

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
  /**
   * Set configuration value
   */
  const setConfig = async (config: Partial<AppConfig>): Promise<void> => {
    const currentConfig = (await getConfig()) ?? {};
    const newConfig = _.merge({}, currentConfig, config);
    await unwrapAPI(apiClient.settings.setConfig(newConfig as AppConfig));
  };

  /**
   * Fetch the persisted application configuration.
   */
  const getConfig = async (): Promise<AppConfig | null> => {
    const resp = await unwrapAPI(apiClient.settings.getConfig());
    return resp;
  };

  /**
   * Import configuration
   */
  const importConfig = async (configData: string, format: 'json' = 'json'): Promise<void> => {
    throw new Error('Import configuration not implemented');
  };

  /**
   * Fetch available models for a provider.
   */
  const getProviderModels = async (
    providerType: string,
    apiKey: string,
    baseUrl?: string,
  ): Promise<string[]> => {
    // Get available providers from settings API
    const response = await unwrapAPI(apiClient.settings.getAvailableProviders());
    const result = response;
    const providers = (result.providers || []) as {
      providerType?: string;
      models?: string[];
    }[];
    const provider = providers.find((p) => p.providerType === providerType);

    if (!provider) {
      throw new Error(`Unknown provider: ${providerType}`);
    }

    return Array.isArray(provider.models) ? provider.models! : [];
  };

  /**
   * Get available AI providers and their status
   */
  const getAvailableProviders = async () => {
    const response = await unwrapAPI(apiClient.settings.getAvailableProviders());
    const result = response;
    const { providers = [], summary } = result;
    return {
      success: true,
      providers,
      summary: {
        total: providers.length,
        connected: summary?.connected || 0,
        configured: summary?.configured || 0,
      },
    };
  };

  /**
   * Configure an AI provider (alias for addProvider to maintain compatibility)
   */
  const configureProvider = async (params: {
    provider: string;
    config: Partial<ProviderConfig>;
  }) => {
    const currentConfig = (await getConfig()) ?? {};
    const newConfig = _.merge(
      {},
      (currentConfig as AppConfig)?.ai?.providers?.[params.provider] || {},
      params.config
    );

    const response = await unwrapAPI(apiClient.settings.configureProvider({
      provider: params.provider,
      config: newConfig,
    }));
    return response;
  };

  const validateProvider = async (
    providerType: string,
    apiKey: string,
    baseUrl?: string,
  ): Promise<ProviderValidationResult> => {
    if (!providerType || !apiKey.trim()) {
      return { success: false, error: 'Provider and API key are required' };
    }
    const providersResp = await unwrapAPI(apiClient.settings.getAvailableProviders());
    const { providers } = providersResp;
    const known = providers.find((p) => p.providerType === providerType);
    if (!known && !baseUrl) {
      return {
        success: false,
        error: 'Unknown provider. Provide a base URL for custom providers',
      };
    }
    return { success: true };
  };

  /**
   * Get the status of the currently configured AI provider
   */
  const getProviderStatus = async () => {
    try {
      const config = await getConfig();
      const providers = config?.ai?.providers;

      if (!providers || Object.keys(providers).length === 0) {
        return {
          status: 'not-configured' as const,
          message: 'No AI Provider Configured',
          details: 'Please configure an AI provider in Settings > AI Providers.',
          providerInfo: null,
        };
      }

      // Get the first configured provider
      const providerEntries = Object.entries(providers);
      if (providerEntries.length === 0) {
        return {
          status: 'not-configured' as const,
          message: 'No AI Provider Configured',
          details: 'Please configure an AI provider in Settings > AI Providers.',
          providerInfo: null,
        };
      }

      const [providerName, providerConfig] = providerEntries[0];

      if (!providerConfig || !providerConfig.apiKey) {
        return {
          status: 'incomplete' as const,
          message: 'AI Provider Incomplete',
          details: `The ${providerName} provider is not properly configured. Please add a valid API key in Settings > AI Providers.`,
          providerInfo: { name: providerName, type: 'llm' },
        };
      }

      // TODO: Add actual connectivity test
      return {
        status: 'ready' as const,
        message: `${providerName} Ready`,
        details: 'Provider is configured and ready to use.',
        providerInfo: { name: providerName, type: 'llm' },
      };
    } catch (error) {
      console.error('Failed to get provider status:', error);
      return {
        status: 'error' as const,
        message: 'Provider Validation Failed',
        details: 'An error occurred while validating the AI provider. Please check your configuration.',
        providerInfo: null,
      };
    }
  };

  // Return public API
  return {
    getAvailableProviders,
    configureProvider,
    validateProvider,
    getProviderStatus,
    getProviderModels,
    getConfig,
    setConfig,
    saveConfig: setConfig,
  };
}

export interface ConfigurationService {
  getAvailableProviders: () => Promise<{
    success: boolean;
    providers: ProviderConfig[];
    summary: { total: number; connected: number; configured: number };
  }>;
  configureProvider: (params: {
    provider: string;
    config: Partial<ProviderConfig>;
  }) => Promise<{ providerId: string; status: string }>;
  validateProvider: (
    providerType: string,
    apiKey: string,
    baseUrl?: string,
  ) => Promise<ProviderValidationResult>;
  getProviderStatus: () => Promise<{
    status: 'loading' | 'ready' | 'not-configured' | 'incomplete' | 'error';
    message: string;
    details?: string;
    providerInfo?: { name?: string; type?: string } | null;
  }>;
  getProviderModels: (providerType: string, apiKey: string, baseUrl?: string) => Promise<string[]>;
  getConfig: () => Promise<AppConfig | null>;
  setConfig: (config: Partial<AppConfig>) => Promise<void>;
  saveConfig: (config: Partial<AppConfig>) => Promise<void>;
}
