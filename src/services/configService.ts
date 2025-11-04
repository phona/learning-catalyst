import type {
  AppConfig,
  ProviderConfig,
  SelectedModel,
  ProviderValidationResult,
} from '@/types/config';
import { ModelType } from '@/types/ai';
import { ConfigAPI } from '@/types/electron-api';
import { ChatOpenAI } from '@langchain/openai';
import { PREDEFINED_PROVIDERS, supportsModelDiscovery, getPredefinedModels } from '@/constants/providers';

/**
 * Configuration management service
 */
export class ConfigService {
  private config: AppConfig | null = null;
  private currentModelChangedCallbacks: ((modelType: ModelType, config: SelectedModel) => void)[] = [];

  constructor(private api: ConfigAPI) { }

  private async loadConfig(): Promise<void> {
    const storedConfig = await this.api.getConfig();
    if (storedConfig) {
      this.config = storedConfig;
    } else {
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

    const updatedConfig = { ...this.config, ...config } as AppConfig;
    await this.api.setConfig(updatedConfig);
    this.config = updatedConfig;
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<AppConfig> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config as AppConfig;
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

      // Handle different API response formats
      if (data.data && Array.isArray(data.data)) {
        // OpenAI-style format
        return data.data.map((model: any) => model.id);
      } else if (Array.isArray(data)) {
        // Direct array format
        return data.map((model: any) => model.id || model.model || model);
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
      (appConfig.ai.model_types as any)[modelType] = modelAssignment;
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

    // Support both old and new configuration formats
    const providerId = (chatConfig as any).provider_config_id || chatConfig.provider;
    const modelId = (chatConfig as any).model_id || chatConfig.model;

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

export async function createConfigService(api?: ConfigAPI): Promise<ConfigService> {
  const electronAPI = api || (typeof window !== 'undefined' ? window.electronAPI : null);
  if (!electronAPI) {
    throw new Error('ElectronAPI not available. Make sure this code is running in Electron renderer process.')
  }

  const configService = new ConfigService(electronAPI);
  await configService.getConfig();
  return configService;
}