import type { AppConfig } from '@/shared/types/config';

/**
 * Configuration storage interface for main process
 * Provides abstraction layer for configuration persistence
 */
export interface IConfigStorage {
  /**
   * Load configuration from storage
   * @returns Promise resolving to AppConfig or null if not found
   */
  loadConfig(): Promise<AppConfig | null>;

  /**
   * Save configuration to storage
   * @param config - Configuration to save
   * @returns Promise resolving when save is complete
   */
  saveConfig(config: AppConfig): Promise<void>;

  /**
   * Check if configuration exists in storage
   * @returns Promise resolving to boolean indicating existence
   */
  hasConfig(): Promise<boolean>;
}

/**
 * Configuration validation error
 */
export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Configuration validator
 */
export class ConfigValidator {
  /**
   * Validate configuration object
   * @param config - Unknown configuration to validate
   * @returns Validated AppConfig
   * @throws ConfigValidationError when validation fails
   */
  static validate(config: unknown): AppConfig {
    if (!config || typeof config !== 'object') {
      throw new ConfigValidationError('Configuration must be an object');
    }

    const configObj = config as Record<string, unknown>;

    // Validate required top-level sections
    const requiredSections = ['ai', 'ui', 'learning', 'privacy', 'performance'];
    for (const section of requiredSections) {
      if (!configObj[section] || typeof configObj[section] !== 'object') {
        throw new ConfigValidationError(`Missing required section: ${section}`, section);
      }
    }

    // Validate AI section
    if (!configObj.ai || typeof configObj.ai !== 'object') {
      throw new ConfigValidationError('AI configuration is required', 'ai');
    }

    const aiConfig = configObj.ai as Record<string, unknown>;
    if (!aiConfig.providers || typeof aiConfig.providers !== 'object') {
      throw new ConfigValidationError('AI providers configuration is required', 'ai.providers');
    }

    if (!aiConfig.model_types || typeof aiConfig.model_types !== 'object') {
      throw new ConfigValidationError('AI model types configuration is required', 'ai.model_types');
    }

    return config as AppConfig; // Safe after validation
  }

  /**
   * Validate provider configuration
   * @param provider - Provider configuration to validate
   * @throws ConfigValidationError when validation fails
   */
  static validateProvider(provider: unknown): asserts provider is Record<string, unknown> {
    if (!provider || typeof provider !== 'object') {
      throw new ConfigValidationError('Provider configuration must be an object');
    }
  }

  /**
   * Validate model ID format
   * @param modelId - Model ID to validate
   * @throws ConfigValidationError when validation fails
   */
  static validateModelId(modelId: string): void {
    if (!modelId || typeof modelId !== 'string' || modelId.trim().length === 0) {
      throw new ConfigValidationError('Model ID must be a non-empty string');
    }
  }
}