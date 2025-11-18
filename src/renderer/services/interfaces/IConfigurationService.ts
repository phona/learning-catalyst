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




import type { AppConfig, ProviderValidationResult, SelectedModel, ModelTypeConfig } from '@/shared/types/config';
import type { ModelType } from '@/shared/types/ai';

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
