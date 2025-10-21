import type {
  AppConfig,
  ProviderConfig,
  ValidationResult,
  ValidationError,
  ModelTypeConfig,
  ModelCapabilities,
  ProviderModelMapping,
  ModelTestResult,
  ModelValidationResult,
} from '@/types/config';

/**
 * Configuration management service
 * Converted from Python configuration management
 */
export class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig | null = null;
  private configLoadPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Load configuration from workspace file
   */
  async loadConfig(): Promise<AppConfig> {
    // If already loading, return the existing promise
    if (this.configLoadPromise) {
      await this.configLoadPromise;
      return this.config!;
    }

    this.configLoadPromise = this.doLoadConfig();
    await this.configLoadPromise;
    return this.config!;
  }

  private async doLoadConfig(): Promise<void> {
    try {
      // Load from workspace config file (includes defaults merged automatically)
      const storedConfig = await window.electronAPI.getConfig();

      if (storedConfig) {
        this.config = this.migrateConfig(storedConfig);
      } else {
        this.config = this.getDefaultConfig();
      }

      // Validate loaded config
      const validation = this.validateConfig(this.config);
      if (!validation.valid) {
        console.warn('Configuration validation failed:', validation.errors);
        // Use default config for invalid fields
        this.config = { ...this.getDefaultConfig(), ...this.config };
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Save configuration to workspace file
   */
  async saveConfig(config: Partial<AppConfig>): Promise<void> {
    if (!this.config) {
      await this.loadConfig();
    }

    const updatedConfig = { ...this.config!, ...config };

    // Validate before saving
    const validation = this.validateConfig(updatedConfig);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    try {
      await window.electronAPI.setConfig(updatedConfig);
      this.config = updatedConfig;
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<AppConfig> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config!;
  }

  /**
   * Get configuration value by key
   */
  async getConfigValue(key: string): Promise<any> {
    const config = await this.getConfig();
    return this.getNestedValue(config, key);
  }

  /**
   * Set configuration value by key
   */
  async setConfigValue(key: string, value: any): Promise<void> {
    const config = await this.getConfig();
    const updatedConfig = this.setNestedValue(config, key, value);
    await this.saveConfig(updatedConfig);
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfig(): Promise<AppConfig> {
    try {
      const defaultConfig = await window.electronAPI.resetConfig();
      this.config = defaultConfig;
      return defaultConfig;
    } catch (error) {
      console.error('Failed to reset configuration:', error);
      throw error;
    }
  }

  /**
   * Get provider configuration
   */
  async getProviderConfig(providerName: string): Promise<ProviderConfig | undefined> {
    const config = await this.getConfig();
    return config.ai.providers[providerName];
  }

  /**
   * Set provider configuration
   */
  async setProviderConfig(providerName: string, providerConfig: ProviderConfig): Promise<void> {
    const config = await this.getConfig();
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
    await this.saveConfig(updatedConfig);
  }

  /**
   * Remove provider configuration
   */
  async removeProviderConfig(providerName: string): Promise<void> {
    const config = await this.getConfig();
    const { [providerName]: removed, ...remainingProviders } = config.ai.providers;

    const updatedConfig = {
      ...config,
      ai: {
        ...config.ai,
        providers: remainingProviders,
      },
    };
    await this.saveConfig(updatedConfig);
  }

  /**
   * Set default provider and model
   */
  async setDefaultProvider(providerName: string, modelName: string): Promise<void> {
    const config = await this.getConfig();
    const updatedConfig = {
      ...config,
      ai: {
        ...config.ai,
        default_provider: providerName,
        default_model: modelName,
      },
    };
    await this.saveConfig(updatedConfig);
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): AppConfig {
    return {
      ai: {
        default_provider: 'openai',
        default_model: 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 4096,
        providers: {},
        streaming: true,
        enable_thinking: true,
        context_window_size: 10,
        // Enhanced model type configuration
        model_types: {
          chat: {
            default_provider: 'openai',
            default_model: 'gpt-3.5-turbo',
            available_providers: ['openai', 'chatglm', 'deepseek', 'siliconflow'],
            settings: {
              temperature: 0.7,
              max_tokens: 4096,
              top_p: 0.9,
              frequency_penalty: 0,
              presence_penalty: 0
            },
            capabilities: {
              streaming: true,
              thinking: true,
              function_calling: true,
              vision: false,
              max_input_tokens: 16384,
              max_output_tokens: 4096
            }
          },
          embedding: {
            default_provider: 'openai',
            default_model: 'text-embedding-3-small',
            available_providers: ['openai', 'chatglm', 'siliconflow'],
            settings: {
              max_tokens: 8192
            },
            capabilities: {
              streaming: false,
              thinking: false,
              function_calling: false,
              vision: false,
              max_input_tokens: 8192,
              max_output_tokens: 0
            }
          },
          rerank: {
            default_provider: 'siliconflow',
            default_model: 'BAAI/bge-reranker-v2-m3',
            available_providers: ['siliconflow'],
            settings: {
              max_tokens: 512
            },
            capabilities: {
              streaming: false,
              thinking: false,
              function_calling: false,
              vision: false,
              max_input_tokens: 512,
              max_output_tokens: 0
            }
          }
        }
      },
      ui: {
        theme: 'dark',
        show_token_usage: true,
        display_format: 'detailed',
        session_duration: 45,
        font_size: 'medium',
        sidebar_width: 256,
        auto_save: true,
        auto_scroll: true,
        show_line_numbers: true,
        enable_markdown: true,
        enable_syntax_highlighting: true,
        compact_mode: false,
      },
      learning: {
        auto_save: true,
        session_timeout_minutes: 120,
        difficulty: 'adaptive',
        learning_style: 'reading',
        personalization_enabled: true,
        checkpoint_interval: 30,
        max_session_history: 100,
        enable_analytics: true,
        preferred_explanation_length: 'detailed',
      },
      privacy: {
        store_conversations: true,
        retention_days: 30,
        anonymous_analytics: true,
        crash_reporting: true,
        encrypt_local_storage: false,
        auto_cleanup: true,
        export_format: 'json',
      },
      performance: {
        cache_size_mb: 100,
        enable_caching: true,
        max_concurrent_requests: 3,
        request_timeout: 30,
        memory_limit_mb: 512,
        gpu_acceleration: false,
        background_processing: true,
        preload_models: false,
      },
    };
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Basic structure validation
    if (!config || typeof config !== 'object') {
      errors.push({ field: 'root', message: 'Configuration must be an object', value: config });
      return { valid: false, errors };
    }

    // AI section validation
    if (!config.ai || typeof config.ai !== 'object') {
      errors.push({ field: 'ai', message: 'AI configuration is required', value: config.ai });
    } else {
      if (!config.ai.default_provider || typeof config.ai.default_provider !== 'string') {
        errors.push({ field: 'ai.default_provider', message: 'Default provider is required', value: config.ai.default_provider });
      }
      if (!config.ai.default_model || typeof config.ai.default_model !== 'string') {
        errors.push({ field: 'ai.default_model', message: 'Default model is required', value: config.ai.default_model });
      }
      if (typeof config.ai.temperature !== 'number' || config.ai.temperature < 0 || config.ai.temperature > 2) {
        errors.push({ field: 'ai.temperature', message: 'Temperature must be between 0 and 2', value: config.ai.temperature });
      }

      // Validate model types configuration
      if (!config.ai.model_types || typeof config.ai.model_types !== 'object') {
        errors.push({ field: 'ai.model_types', message: 'Model types configuration is required', value: config.ai.model_types });
      } else {
        const modelTypes = ['chat', 'embedding', 'rerank'];
        for (const modelType of modelTypes) {
          const typeConfig = config.ai.model_types[modelType];
          if (!typeConfig || typeof typeConfig !== 'object') {
            errors.push({ field: `ai.model_types.${modelType}`, message: `${modelType} model configuration is required`, value: typeConfig });
            continue;
          }

          if (!typeConfig.default_provider || typeof typeConfig.default_provider !== 'string') {
            errors.push({ field: `ai.model_types.${modelType}.default_provider`, message: `Default provider is required for ${modelType}`, value: typeConfig.default_provider });
          }

          if (!typeConfig.default_model || typeof typeConfig.default_model !== 'string') {
            errors.push({ field: `ai.model_types.${modelType}.default_model`, message: `Default model is required for ${modelType}`, value: typeConfig.default_model });
          }

          if (!Array.isArray(typeConfig.available_providers)) {
            errors.push({ field: `ai.model_types.${modelType}.available_providers`, message: `Available providers must be an array for ${modelType}`, value: typeConfig.available_providers });
          }

          if (typeConfig.settings && typeof typeConfig.settings !== 'object') {
            errors.push({ field: `ai.model_types.${modelType}.settings`, message: `Settings must be an object for ${modelType}`, value: typeConfig.settings });
          }
        }
      }
    }

    // UI section validation
    if (config.ui && typeof config.ui === 'object') {
      const validThemes = ['light', 'dark', 'auto'];
      if (!validThemes.includes(config.ui.theme)) {
        errors.push({ field: 'ui.theme', message: `Theme must be one of: ${validThemes.join(', ')}`, value: config.ui.theme });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Migrate configuration to latest version
   */
  private migrateConfig(config: any): AppConfig {
    // TODO: Implement configuration migration logic
    // For now, assume config is already in correct format
    return config as AppConfig;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): any {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
    return obj;
  }

  // Enhanced model type configuration methods

  /**
   * Get model type configuration
   */
  async getModelTypeConfig(modelType: 'chat' | 'embedding' | 'rerank'): Promise<ModelTypeConfig> {
    const config = await this.getConfig();
    return config.ai.model_types[modelType];
  }

  /**
   * Set model type configuration
   */
  async setModelTypeConfig(
    modelType: 'chat' | 'embedding' | 'rerank',
    config: Partial<ModelTypeConfig>
  ): Promise<void> {
    const currentConfig = await this.getConfig();
    const updatedConfig = {
      ...currentConfig,
      ai: {
        ...currentConfig.ai,
        model_types: {
          ...currentConfig.ai.model_types,
          [modelType]: {
            ...currentConfig.ai.model_types[modelType],
            ...config
          }
        }
      }
    };

    await this.saveConfig(updatedConfig);
  }

  /**
   * Get available models for a provider and model type
   */
  async getAvailableModels(providerName: string, modelType: 'chat' | 'embedding' | 'rerank'): Promise<string[]> {
    const providerConfig = await this.getProviderConfig(providerName);
    if (!providerConfig) {
      return [];
    }

    // Get the provider-model mapping
    const mapping = this.getProviderModelMapping();
    return mapping[providerName]?.[modelType] || [];
  }

  /**
   * Test a model configuration
   */
  async testModel(
    providerName: string,
    modelName: string,
    modelType: 'chat' | 'embedding' | 'rerank'
  ): Promise<ModelTestResult> {
    const startTime = Date.now();

    try {
      // This would make an actual API call to test the model
      // For now, we'll simulate a successful test
      const responseTime = Date.now() - startTime;

      const result: ModelTestResult = {
        model_id: modelName,
        provider: providerName,
        model_type: modelType,
        status: 'success',
        response_time_ms: responseTime,
        test_timestamp: new Date(),
        capabilities_tested: this.getDefaultCapabilitiesForModelType(modelType)
      };

      // Save test result to configuration
      await this.saveModelTestResult(result);

      return result;
    } catch (error) {
      const result: ModelTestResult = {
        model_id: modelName,
        provider: providerName,
        model_type: modelType,
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        test_timestamp: new Date()
      };

      await this.saveModelTestResult(result);
      return result;
    }
  }

  /**
   * Validate model configuration
   */
  async validateModelConfiguration(
    providerName: string,
    modelName: string,
    modelType: 'chat' | 'embedding' | 'rerank'
  ): Promise<ModelValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check if provider is configured
    const providerConfig = await this.getProviderConfig(providerName);
    if (!providerConfig) {
      errors.push(`Provider ${providerName} is not configured`);
      return {
        valid: false,
        errors,
        warnings,
        tested_capabilities: [],
        recommendations
      };
    }

    // Check if model is available for provider
    const availableModels = await this.getAvailableModels(providerName, modelType);
    if (!availableModels.includes(modelName)) {
      errors.push(`Model ${modelName} is not available for provider ${providerName}`);
    }

    // Check API key
    if (!providerConfig.api_key || providerConfig.api_key.trim() === '') {
      errors.push('API key is required');
    }

    // Check model type compatibility
    const modelTypeConfig = await this.getModelTypeConfig(modelType);
    if (!modelTypeConfig.available_providers.includes(providerName)) {
      warnings.push(`Provider ${providerName} may not be optimized for ${modelType} models`);
    }

    // Test the model
    const testResult = await this.testModel(providerName, modelName, modelType);
    if (testResult.status === 'error') {
      errors.push(`Model test failed: ${testResult.error_message}`);
    }

    // Generate recommendations
    if (testResult.response_time_ms && testResult.response_time_ms > 5000) {
      recommendations.push('Consider using a faster model for better responsiveness');
    }

    const testedCapabilities = testResult.capabilities_tested || [];

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      tested_capabilities: testedCapabilities,
      recommendations
    };
  }

  /**
   * Get provider to model type mapping
   */
  getProviderModelMapping(): ProviderModelMapping {
    return {
      openai: {
        chat: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
        embedding: ['text-embedding-ada-002', 'text-embedding-3-small', 'text-embedding-3-large'],
        rerank: [] // OpenAI doesn't have a dedicated rerank model
      },
      chatglm: {
        chat: ['glm-4', 'glm-4-0520', 'glm-3-turbo', 'glm-4-plus', 'glm-4-air', 'glm-4-airx', 'glm-4-long'],
        embedding: ['embedding-2', 'embedding-3'],
        rerank: [] // ChatGLM doesn't have a dedicated rerank model
      },
      deepseek: {
        chat: ['deepseek-chat', 'deepseek-coder'],
        embedding: [],
        rerank: []
      },
      siliconflow: {
        chat: ['deepseek-ai/DeepSeek-V3', 'meta-llama/Meta-Llama-3.1-8B-Instruct', '01-ai/Yi-1.5-9B-Chat-16K'],
        embedding: ['BAAI/bge-large-en-v1.5', 'BAAI/bge-large-zh-v1.5'],
        rerank: ['BAAI/bge-reranker-v2-m3']
      }
    };
  }

  /**
   * Get default capabilities for model type
   */
  private getDefaultCapabilitiesForModelType(modelType: 'chat' | 'embedding' | 'rerank'): string[] {
    switch (modelType) {
      case 'chat':
        return ['streaming', 'thinking', 'function_calling'];
      case 'embedding':
        return ['text_embedding'];
      case 'rerank':
        return ['text_reranking'];
      default:
        return [];
    }
  }

  /**
   * Save model test result
   */
  private async saveModelTestResult(result: ModelTestResult): Promise<void> {
    const config = await this.getConfig();

    // Store test results in metadata or a separate storage
    if (!config.ai.metadata) {
      config.ai.metadata = {};
    }

    if (!config.ai.metadata.model_tests) {
      config.ai.metadata.model_tests = [];
    }

    // Remove existing test for the same model and add new one
    config.ai.metadata.model_tests = config.ai.metadata.model_tests.filter(
      (test: any) => !(test.model_id === result.model_id && test.provider === result.provider)
    );

    config.ai.metadata.model_tests.push(result);

    await this.saveConfig(config);
  }

  /**
   * Get model test results
   */
  async getModelTestResults(): Promise<ModelTestResult[]> {
    const config = await this.getConfig();
    return config.ai.metadata?.model_tests || [];
  }

  /**
   * Get optimal model for a task
   */
  async getOptimalModel(
    taskType: 'chat' | 'embedding' | 'rerank',
    requirements: {
      speed?: 'fast' | 'balanced' | 'quality';
      cost?: 'low' | 'medium' | 'high';
      capabilities?: string[];
    } = {}
  ): Promise<{ provider: string; model: string } | null> {
    const modelTypeConfig = await this.getModelTypeConfig(taskType);
    const mapping = this.getProviderModelMapping();

    // Get available models for the preferred provider
    const availableModels = mapping[modelTypeConfig.default_provider]?.[taskType] || [];

    if (availableModels.length === 0) {
      return null;
    }

    // Select model based on requirements
    let selectedModel = availableModels[0]; // Default to first available

    if (requirements.speed === 'fast') {
      // Prefer faster models (simplified logic)
      selectedModel = availableModels.find(model =>
        model.includes('turbo') || model.includes('fast') || model.includes('air')
      ) || selectedModel;
    }

    if (requirements.speed === 'quality') {
      // Prefer higher quality models
      selectedModel = availableModels.find(model =>
        model.includes('gpt-4') || model.includes('claude') || model.includes('deepseek')
      ) || selectedModel;
    }

    return {
      provider: modelTypeConfig.default_provider,
      model: selectedModel
    };
  }
}

// Export singleton instance
export const configService = ConfigService.getInstance();