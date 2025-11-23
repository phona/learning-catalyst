import type { AppConfig, ProviderValidationResult, ProviderConfig } from '@/shared/types/config';
import type { ElectronAPI } from '@/shared/types/electron-api';
import _ from 'lodash';
import { assertOk, unwrap } from '@/renderer/utils/apiResponse';

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
    const resp = await apiClient.settings.setConfig(newConfig as AppConfig);
    assertOk(resp);
  };

  /**
   * Fetch the persisted application configuration.
   */
  const getConfig = async (): Promise<AppConfig | null> => {
    const resp = await apiClient.settings.getConfig();
    return unwrap(resp);
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
    const response = await apiClient.settings.getAvailableProviders();
    assertOk(response);
    const result = unwrap(response);
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
    const response = await apiClient.settings.getAvailableProviders();
    const result = unwrap(response);
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
    return unwrap(response);
  };

  const validateProvider = async (
    providerType: string,
    apiKey: string,
    baseUrl?: string,
  ): Promise<ProviderValidationResult> => {
    if (!providerType || !apiKey.trim()) {
      return { success: false, error: 'Provider and API key are required' };
    }
    const providersResp = await apiClient.settings.getAvailableProviders();
    const { providers } = unwrap(providersResp);
    const known = providers.find((p) => p.providerType === providerType);
    if (!known && !baseUrl) {
      return {
        success: false,
        error: 'Unknown provider. Provide a base URL for custom providers',
      };
    }
    return { success: true };
  };

  // Return public API
  return {
    getAvailableProviders,
    configureProvider,
    validateProvider,
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
  getProviderModels: (providerType: string, apiKey: string, baseUrl?: string) => Promise<string[]>;
  getConfig: () => Promise<AppConfig | null>;
  setConfig: (config: Partial<AppConfig>) => Promise<void>;
  saveConfig: (config: Partial<AppConfig>) => Promise<void>;
}
