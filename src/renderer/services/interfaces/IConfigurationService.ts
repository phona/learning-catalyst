
import type { AppConfig, ProviderValidationResult, SelectedModel, ModelTypeConfig } from '@/shared/types/config';
import type { ModelType } from '@/shared/types/ai';
import type { ProviderDisplay } from '@/shared/types/electron-api/settings-api';

/**
 * Configuration Service Interface
 *
 * Service for managing application configuration, provider settings,
 * and model type assignments.
 */
export interface IConfigurationService {
  // Configuration management
  saveConfig(config: AppConfig): Promise<void>;
  getConfiguration(key?: string): Promise<any>;
  setConfiguration(key: string, value: unknown, dataType?: string): Promise<boolean>;

  // Model type configuration
  updateModelTypeConfig(
    modelType: ModelType,
    modelConfig: SelectedModel | ModelTypeConfig
  ): Promise<void>;

  // Provider management
  getAvailableProviders(): Promise<{
    success: boolean;
    providers: ProviderDisplay[];
    summary: {
      total: number;
      connected: number;
      configured: number;
    };
  }>;

  configureProvider(params: {
    provider: string;
    config: any;
  }): Promise<{ success: boolean; providerId: string; status: string }>;

  validateProvider(
    providerType: string,
    apiKey: string,
    baseUrl?: string
  ): Promise<ProviderValidationResult>;

  getProviderModels(
    providerType: string,
    apiKey: string,
    baseUrl?: string
  ): Promise<string[]>;
}
