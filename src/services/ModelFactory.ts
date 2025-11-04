import {
  ChatOpenAI,
} from '@langchain/openai';
import type {
  ProviderConfig,
  ProviderType,
} from '@/types/config';

// Use ChatOpenAI for all providers as recommended for OpenAI-compatible APIs
type AIModel = ChatOpenAI;
import { DEFAULT_PROVIDER_CONFIGS } from '@/types/config';

/**
 * Simplified Model Factory
 * Creates LangChain models for the 3 unified provider types
 */
export class ModelFactory {
  /**
   * Create a LangChain model based on provider type and configuration
   */
  static createModel(
    providerType: ProviderType,
    config: ProviderConfig
  ): AIModel {
    // Merge with defaults and ensure backward compatibility
    const fullConfig = {
      ...DEFAULT_PROVIDER_CONFIGS[providerType],
      ...config,
      provider_type: config.provider_type || config.type || providerType, // Ensure provider_type is set
      type: config.type || providerType, // Legacy support
    } as ProviderConfig;

    switch (providerType) {
      case 'openai':
        return this.createOpenAIModel(fullConfig);

      case 'chatglm':
        return this.createChatGLMModel(fullConfig);

      case 'deepseek':
        return this.createOpenAICompatibleModel(fullConfig);

      case 'siliconflow':
        return this.createOpenAICompatibleModel(fullConfig);

      case 'openai-compatible':
        return this.createOpenAICompatibleModel(fullConfig);

      default:
        throw new Error(`Unsupported provider type: ${providerType}`);
    }
  }

  /**
   * Create OpenAI model
   */
  private static createOpenAIModel(config: ProviderConfig): ChatOpenAI {
    const openaiConfig: any = {
      apiKey: config.api_key,
      modelName: config.model || (config.models && config.models[0]) || 'gpt-3.5-turbo',
      temperature: config.temperature || 0.7,
      maxTokens: config.max_tokens || 4096,
      streaming: config.streaming !== false,
    };

    if (config.base_url) {
      openaiConfig.configuration = {
        baseURL: config.base_url,
      };
    }

    return new ChatOpenAI(openaiConfig);
  }

  /**
   * Create ChatGLM model
   * Note: Using ChatOpenAI for ChatGLM since it has OpenAI-compatible API
   * If native LangChain ChatGLM is available, we can switch to that
   */
  private static createChatGLMModel(config: ProviderConfig): AIModel {
    // Use ChatOpenAI for ChatGLM as it's OpenAI-compatible
    console.log('Using ChatOpenAI with ChatGLM endpoint');

    const chatglmConfig: any = {
      apiKey: config.api_key,
      modelName: config.model || (config.models && config.models[0]) || 'glm-4',
      temperature: config.temperature || 0.7,
      maxTokens: config.max_tokens || 4096,
      streaming: config.streaming !== false,
    };

    // Add custom configuration for ChatGLM
    if (config.base_url) {
      chatglmConfig.configuration = {
        baseURL: config.base_url,
        headers: this.getChatGLMHeaders(config),
      };
    }

    return new ChatOpenAI(chatglmConfig);
  }

  /**
   * Create OpenAI-compatible model (unified for all compatible endpoints)
   */
  private static createOpenAICompatibleModel(config: ProviderConfig): ChatOpenAI {
    const modelName = config.model || (config.models && config.models[0]) || 'llama3.1:8b';
    console.log(`Starting OpenAI-compatible model: ${modelName} at ${config.base_url}`);

    const compatibleConfig: any = {
      apiKey: config.api_key || 'not-needed-for-local',
      modelName: modelName,
      temperature: config.temperature || 0.7,
      maxTokens: config.max_tokens || 4096,
      streaming: config.streaming !== false,
    };

    if (config.base_url) {
      compatibleConfig.configuration = {
        baseURL: config.base_url,
        headers: this.getCustomHeaders(config),
      };
    }

    return new ChatOpenAI(compatibleConfig);
  }

  /**
   * Get ChatGLM-specific headers
   */
  private static getChatGLMHeaders(config: ProviderConfig): Record<string, string> {
    const headers: Record<string, string> = {};

    // ChatGLM may require specific headers
    if (config.api_key) {
      headers['Authorization'] = `Bearer ${config.api_key}`;
    }

    // Add any ChatGLM-specific headers here
    headers['Content-Type'] = 'application/json';

    return headers;
  }

  /**
   * Get custom headers for OpenAI-compatible providers
   */
  private static getCustomHeaders(config: ProviderConfig): Record<string, string> {
    const headers: Record<string, string> = {};

    // Add custom headers from config (support both field names for backward compatibility)
    if (config.custom_headers) {
      Object.assign(headers, config.custom_headers);
    }
    if (config.customHeaders) {
      Object.assign(headers, config.customHeaders);
    }

    // Provider-specific headers
    if (config.base_url?.includes('deepseek') && config.api_key) {
      headers['Authorization'] = `Bearer ${config.api_key}`;
    }
    if (config.base_url?.includes('siliconflow') && config.api_key) {
      headers['Authorization'] = `Bearer ${config.api_key}`;
    }
    if (config.base_url?.includes('together') && config.api_key) {
      headers['Authorization'] = `Bearer ${config.api_key}`;
    }
    if (config.base_url?.includes('groq') && config.api_key) {
      headers['Authorization'] = `Bearer ${config.api_key}`;
    }

    // Common headers
    headers['Content-Type'] = 'application/json';

    return headers;
  }

  /**
   * Validate provider configuration
   */
  static validateConfig(
    providerType: ProviderType,
    config: Partial<ProviderConfig>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields - model can be specified via model field or models array
    if (!config.model && (!config.models || config.models.length === 0)) {
      errors.push('Model name is required');
    }

    // Provider-specific validation
    switch (providerType) {
      case 'openai':
        if (!config.api_key) {
          errors.push('API key is required for OpenAI');
        }
        break;

      case 'chatglm':
        if (!config.api_key) {
          errors.push('API key is required for ChatGLM');
        }
        if (!config.base_url) {
          errors.push('Base URL is required for ChatGLM');
        }
        break;

      case 'deepseek':
        if (!config.api_key) {
          errors.push('API key is required for DeepSeek');
        }
        if (!config.base_url) {
          errors.push('Base URL is required for DeepSeek');
        }
        break;

      case 'siliconflow':
        if (!config.api_key) {
          errors.push('API key is required for SiliconFlow');
        }
        if (!config.base_url) {
          errors.push('Base URL is required for SiliconFlow');
        }
        break;

      case 'openai-compatible':
        if (!config.base_url) {
          errors.push('Base URL is required for OpenAI-compatible providers');
        }
        // API key is optional for local models
        if (config.base_url && !config.base_url.includes('localhost') && !config.base_url.includes('127.0.0.1') && !config.api_key) {
          errors.push('API key is required for remote OpenAI-compatible providers');
        }
        break;
    }

    // Model-specific validation
    const modelName = config.model || (config.models && config.models[0]);
    if (modelName && modelName.length < 1) {
      errors.push('Model name cannot be empty');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get supported models for a provider type
   */
  static getSupportedModels(providerType: ProviderType): string[] {
    switch (providerType) {
      case 'openai':
        return [
          'gpt-4o',
          'gpt-4o-mini',
          'gpt-4',
          'gpt-4-turbo',
          'gpt-3.5-turbo',
          'gpt-3.5-turbo-16k',
        ];

      case 'chatglm':
        return [
          'glm-4',
          'glm-4-plus',
          'glm-4-0520',
          'glm-4-air',
          'glm-4-airx',
          'glm-4-flash',
          'glm-3-turbo',
        ];

      case 'deepseek':
        return [
          'deepseek-chat',
          'deepseek-coder',
        ];

      case 'siliconflow':
        return [
          'qwen2.5-72b-instruct',
          'qwen2.5-32b-instruct',
          'qwen2.5-14b-instruct',
          'qwen2.5-7b-instruct',
        ];

      case 'openai-compatible':
        // Common models for various providers
        return [
          'deepseek-chat',
          'deepseek-coder',
          'qwen2.5-72b-instruct',
          'qwen2.5-32b-instruct',
          'qwen2.5-14b-instruct',
          'qwen2.5-7b-instruct',
          'llama3.1:405b',
          'llama3.1:70b',
          'llama3.1:8b',
          'llama3:70b',
          'llama3:8b',
          'mistral:7b',
          'mixtral:8x7b',
          'codellama:13b',
          'codellama:34b',
        ];

      default:
        return [];
    }
  }

  /**
   * Detect provider type from base URL
   */
  static detectProviderType(baseUrl: string): ProviderType | null {
    const url = baseUrl.toLowerCase();

    if (url.includes('openai.com')) {
      return 'openai';
    }
    if (url.includes('bigmodel.cn') || url.includes('chatglm')) {
      return 'chatglm';
    }
    if (url.includes('deepseek') ||
        url.includes('siliconflow') ||
        url.includes('together') ||
        url.includes('groq') ||
        url.includes('localhost') ||
        url.includes('127.0.0.1') ||
        url.includes('ollama')) {
      return 'openai-compatible';
    }

    return null;
  }

  /**
   * Get default configuration for provider type
   */
  static getDefaultConfig(providerType: ProviderType): Partial<ProviderConfig> {
    return DEFAULT_PROVIDER_CONFIGS[providerType] || {};
  }
}