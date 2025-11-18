import type {
  AppConfig,
  ProviderConfig,
  SelectedModel,
  ProviderValidationResult,
} from '@/shared/types/config';
import { ModelType } from '@/shared/types/ai';
import { ChatOpenAI } from '@langchain/openai';
import { PREDEFINED_PROVIDERS, supportsModelDiscovery, getPredefinedModels } from '@/shared/constants/providers';
import { IConfigStorage, ConfigValidationError, ConfigValidator } from './config/interfaces';
import { ILogger, IEventBus } from './registry/ServiceTokens';

/**
 * Configuration management service
 * Uses dependency injection for storage, logging, and event handling
 */
export class ConfigService {
  private config: AppConfig | null = null;
  private readonly currentModelChangedCallbacks: ((modelType: ModelType, config: SelectedModel) => void)[] = [];

  constructor(
    private readonly configStorage: IConfigStorage,
    private readonly logger: ILogger,
    private readonly eventBus?: IEventBus
  ) {}

  private async loadConfig(): Promise<void> {
    try {
      const storedConfig = await this.configStorage.loadConfig();
      if (storedConfig) {
        this.config = ConfigValidator.validate(storedConfig);
        this.logger.info('Configuration loaded successfully from storage');
      } else {
        this.config = this.getDefaultConfig();
        await this.configStorage.saveConfig(this.config);
        this.logger.info('Created default configuration');
      }

      // Emit config loaded event
      if (this.eventBus) {
        this.eventBus.emit('config:loaded', this.config);
      }
    } catch (error) {
      this.logger.error('Failed to load configuration', error);
      // Fall back to default configuration
      this.config = this.getDefaultConfig();
      try {
        await this.configStorage.saveConfig(this.config);
        this.logger.info('Created default configuration after load failure');
      } catch (saveError) {
        this.logger.error('Failed to save default configuration', saveError);
      }
    }
  }

  /**
   * Save configuration to storage
   */
  async saveConfig(config: Partial<AppConfig>): Promise<void> {
    try {
      if (!this.config) {
        await this.loadConfig();
      }

      const updatedConfig = { ...this.config, ...config };
      ConfigValidator.validate(updatedConfig);

      await this.configStorage.saveConfig(updatedConfig);
      this.config = updatedConfig;

      this.logger.info('Configuration saved successfully');

      // Emit config saved event
      if (this.eventBus) {
        this.eventBus.emit('config:saved', updatedConfig);
      }
    } catch (error) {
      this.logger.error('Failed to save configuration', error);
      throw error instanceof ConfigValidationError ? error :
        new ConfigValidationError(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<AppConfig> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config; // Safe - validated in loadConfig
  }

  /**
   * Get provider configuration
   */
  async getProviderConfig(providerName: string): Promise<ProviderConfig> {
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
   * Register callback for current model changes
   */
  onCurrentModelChanged(callback: (modelType: ModelType, config: SelectedModel) => void): void {
    this.currentModelChangedCallbacks.push(callback);
  }

  /**
   * Remove callback for current model changes
   */
  offCurrentModelChanged(callback: (modelType: ModelType, config: SelectedModel) => void): void {
    const index = this.currentModelChangedCallbacks.indexOf(callback);
    if (index > -1) {
      this.currentModelChangedCallbacks.splice(index, 1);
    }
  }

  /**
   * Update model type configuration and trigger callback
   */
  async updateModelTypeConfig(modelType: ModelType, modelConfig: SelectedModel): Promise<void> {
    // Validate model type configuration
    if (!modelConfig.provider) {
      throw new Error(`Provider is required for model type: ${modelType}`);
    }

    if (!modelConfig.model) {
      throw new Error(`Model is required for model type: ${modelType}`);
    }

    const config = await this.getConfig();
    const updatedConfig = {
      ...config,
      ai: {
        ...config.ai,
        model_types: {
          ...config.ai.model_types,
          [modelType]: modelConfig,
        },
      },
    };
    await this.saveConfig(updatedConfig);

    // Trigger all registered callbacks
    for (const callback of this.currentModelChangedCallbacks) {
      try {
        callback(modelType, modelConfig);
      } catch (error) {
        console.error('Error in model change callback:', error);
        // Don't throw - callback errors shouldn't prevent config updates
      }
    }
  }

  /**
   * Validate provider API key and connection
   */
  async validateProvider(providerType: string, apiKey: string, baseUrl?: string): Promise<ProviderValidationResult> {
    const provider = PREDEFINED_PROVIDERS[providerType];
    if (!provider) {
      return { success: false, error: 'Unknown provider' };
    }

    const url = baseUrl || provider.base_url;

    try {
      const response = await fetch(`${url}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Get available models for a provider (with API discovery fallback to predefined)
   */
  async getProviderModels(providerType: string, apiKey: string, baseUrl?: string): Promise<string[]> {
    const provider = PREDEFINED_PROVIDERS[providerType];
    if (!provider) {
      return [];
    }

    // Try API discovery first
    if (supportsModelDiscovery(providerType)) {
      const models = await this.fetchModelsFromAPI(providerType, apiKey, baseUrl);
      if (models.length > 0) {
        return models;
      }
    }

    // Fallback to predefined models
    return getPredefinedModels(providerType);
  }

  /**
   * Fetch models directly from provider API
   */
  private async fetchModelsFromAPI(providerType: string, apiKey: string, baseUrl?: string): Promise<string[]> {
    const provider = PREDEFINED_PROVIDERS[providerType];
    if (!provider) {
      return [];
    }

    const url = baseUrl || provider.base_url;

    try {
      const response = await fetch(`${url}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`Failed to fetch models from ${providerType}: ${response.status}`);
        return [];
      }

      const data = await response.json();

      // Handle different API response formats with type safety
      if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        // OpenAI-style format
        return data.data
          .filter((model: unknown): model is { id?: string } =>
            typeof model === 'object' && model !== null && 'id' in model
          )
          .map((model) => model.id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0);
      } else if (Array.isArray(data)) {
        // Direct array format
        return data
          .filter((model: unknown): model is { id?: string; model?: string } =>
            typeof model === 'object' && model !== null
          )
          .map((model) => model.id || model.model)
          .filter((id): id is string => typeof id === 'string' && id.length > 0);
      }

      return [];
    } catch (error) {
      console.warn(`Error fetching models from ${providerType}:`, error);
      return [];
    }
  }

  /**
   * Create LangChain model instance
   */
  createChatModel(providerConfig: ProviderConfig, modelId: string): ChatOpenAI {
    const provider = PREDEFINED_PROVIDERS[providerConfig.provider_type];

    return new ChatOpenAI({
      modelName: modelId,
      openAIApiKey: providerConfig.api_key,
      configuration: {
        baseURL: providerConfig.base_url || provider.base_url
      }
    });
  }

  /**
   * Add a new provider configuration
   */
  async addProvider(id: string, config: ProviderConfig): Promise<void> {
    const appConfig = await this.getConfig();
    appConfig.ai.providers[id] = config;
    await this.saveConfig(appConfig);
  }

  /**
   * Assign a model to a specific model type
   */
  async assignModelToType(modelType: string, providerId: string, modelId: string): Promise<void> {
    const appConfig = await this.getConfig();

    // Ensure modelType is valid
    if (!['chat', 'embedding', 'rerank'].includes(modelType)) {
      throw new Error(`Invalid model type: ${modelType}`);
    }

    // Create the model assignment
    const modelAssignment = {
      provider_config_id: providerId,
      model_id: modelId
    };

    // Update the specific model type
    if (modelType === 'chat') {
      appConfig.ai.model_types.chat = {
        ...appConfig.ai.model_types.chat,
        ...modelAssignment,
        provider: providerId,
        model: modelId
      };
    } else {
      const modelTypes = appConfig.ai.model_types as Record<string, unknown>;
      modelTypes[modelType] = modelAssignment;
    }

    await this.saveConfig(appConfig);
  }

  /**
   * Get working chat model instance
   */
  async getChatModel(): Promise<ChatOpenAI> {
    const config = await this.getConfig();
    const chatConfig = config.ai.model_types.chat;

    if (!chatConfig) {
      throw new Error('No chat model configured');
    }

    // Support both old and new configuration formats safely
    const providerId = this.extractProviderId(chatConfig);
    const modelId = this.extractModelId(chatConfig);

    if (!providerId || !modelId) {
      throw new Error('Chat model configuration is incomplete');
    }

    const providerConfig = config.ai.providers[providerId];
    if (!providerConfig) {
      throw new Error(`Provider configuration not found: ${providerId}`);
    }

    return this.createChatModel(providerConfig, modelId);
  }

  /**
   * Extract provider ID from chat configuration safely
   * Supports both old and new configuration formats
   */
  private extractProviderId(chatConfig: Record<string, unknown>): string | undefined {
    // New format
    if (chatConfig.provider && typeof chatConfig.provider === 'string') {
      return chatConfig.provider;
    }

    // Legacy format
    if (
      'provider_config_id' in chatConfig &&
      typeof chatConfig.provider_config_id === 'string'
    ) {
      return chatConfig.provider_config_id;
    }

    return undefined;
  }

  /**
   * Extract model ID from chat configuration safely
   * Supports both old and new configuration formats
   */
  private extractModelId(chatConfig: Record<string, unknown>): string | undefined {
    // New format
    if (chatConfig.model && typeof chatConfig.model === 'string') {
      return chatConfig.model;
    }

    // Legacy format
    if (
      'model_id' in chatConfig &&
      typeof chatConfig.model_id === 'string'
    ) {
      return chatConfig.model_id;
    }

    return undefined;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): AppConfig {
    return {
      ai: {
        providers: {},
        // Model type configuration using SelectedModel interface
        model_types: {
          chat: {
            temperature: 0.7,
            max_tokens: 4096,
            top_p: 0.9,
            enable_thinking: true,
            stream: true,
          }
        },
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
}

/**
 * Factory function to create ConfigService with dependencies
 * This should be used with the service registry for proper dependency injection
 */
export function createConfigService(
  configStorage: IConfigStorage,
  logger: ILogger,
  eventBus?: IEventBus
): ConfigService {
  return new ConfigService(configStorage, logger, eventBus);
}

/**
 * Factory function to create ConfigService and initialize it
 * Convenience function that also loads initial configuration
 */
export async function createAndInitializeConfigService(
  configStorage: IConfigStorage,
  logger: ILogger,
  eventBus?: IEventBus
): Promise<ConfigService> {
  const configService = new ConfigService(configStorage, logger, eventBus);
  await configService.getConfig(); // Initialize by loading config
  return configService;
}