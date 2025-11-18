/**
 * Predefined AI provider configurations
 *
 * 🎯 What It Is: Central registry of supported AI providers with their configurations
 * ⚙️ How It Works: Exports PREDEFINED_PROVIDERS constant containing provider metadata
 * 🔗 Relationships: Used by ConfigService and UI components for provider selection and configuration
 */

export interface PredefinedProvider {
  id: string;
  name: string;
  type: string;
  base_url: string;
  description: string;
  supported_features: string[];
  documentation_url: string;
  default_models: {
    chat?: string[];
    embedding?: string[];
    rerank?: string[];
  };
}

export const PREDEFINED_PROVIDERS: Record<string, PredefinedProvider> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai',
    base_url: 'https://api.openai.com/v1',
    description: 'Official OpenAI API with GPT models',
    supported_features: ['chat', 'embedding', 'rerank'],
    documentation_url: 'https://platform.openai.com/docs',
    default_models: {
      chat: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      embedding: ['text-embedding-ada-002', 'text-embedding-3-small', 'text-embedding-3-large'],
      rerank: ['text-davinci-003']
    }
  },
  chatglm: {
    id: 'chatglm',
    name: 'ChatGLM (Zhipu AI)',
    type: 'chatglm',
    base_url: 'https://open.bigmodel.cn/api/paas/v4',
    description: 'ChatGLM API with thinking process support',
    supported_features: ['chat'],
    documentation_url: 'https://open.bigmodel.cn/dev/api',
    default_models: {
      chat: ['glm-4', 'glm-4-plus', 'glm-3-turbo']
    }
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'deepseek',
    base_url: 'https://api.deepseek.com/v1',
    description: 'DeepSeek API for code and reasoning',
    supported_features: ['chat'],
    documentation_url: 'https://platform.deepseek.com/api-docs',
    default_models: {
      chat: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner']
    }
  },
  siliconflow: {
    id: 'siliconflow',
    name: 'SiliconFlow',
    type: 'siliconflow',
    base_url: 'https://api.siliconflow.cn/v1',
    description: 'SiliconFlow API platform with various models',
    supported_features: ['chat', 'embedding'],
    documentation_url: 'https://docs.siliconflow.cn/docs',
    default_models: {
      chat: ['Qwen/Qwen2.5-7B-Instruct', 'meta-llama/Meta-Llama-3.1-8B-Instruct', 'THUDM/glm-4-9b-chat'],
      embedding: ['BAAI/bge-large-en-v1.5', 'BAAI/bge-base-zh-v1.5']
    }
  }
};

/**
 * Providers that support model discovery via API
 */
export const PROVIDERS_WITH_MODEL_DISCOVERY = ['openai', 'chatglm', 'deepseek', 'siliconflow'];

/**
 * Default timeout for model discovery requests (in milliseconds)
 */
export const MODEL_DISCOVERY_TIMEOUT = 10000;

/**
 * Helper function to check if a provider supports model discovery
 */
export function supportsModelDiscovery(providerType: string): boolean {
  return PROVIDERS_WITH_MODEL_DISCOVERY.includes(providerType);
}

/**
 * Helper function to get predefined models for a provider
 */
export function getPredefinedModels(providerType: string): string[] {
  const provider = PREDEFINED_PROVIDERS[providerType];
  if (!provider) return [];

  const models: string[] = [];

  if (provider.default_models.chat) {
    models.push(...provider.default_models.chat);
  }

  if (provider.default_models.embedding) {
    models.push(...provider.default_models.embedding);
  }

  if (provider.default_models.rerank) {
    models.push(...provider.default_models.rerank);
  }

  return [...new Set(models)]; // Remove duplicates
}

/**
 * Helper function to get predefined models for a specific feature type
 */
export function getPredefinedModelsForFeature(providerType: string, feature: string): string[] {
  const provider = PREDEFINED_PROVIDERS[providerType];
  if (!provider?.default_models[feature as keyof typeof provider.default_models]) {
    return [];
  }

  return provider.default_models[feature as keyof typeof provider.default_models] || [];
}