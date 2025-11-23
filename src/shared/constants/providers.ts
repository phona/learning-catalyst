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
  baseUrl: string;
  description: string;
  supportedFeatures: string[];
  documentationUrl: string;
  defaultModels: {
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
    baseUrl: 'https://api.openai.com/v1',
    description: 'Official OpenAI API with GPT models',
    supportedFeatures: ['chat', 'embedding', 'rerank'],
    documentationUrl: 'https://platform.openai.com/docs',
    defaultModels: {
      chat: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      embedding: ['text-embedding-ada-002', 'text-embedding-3-small', 'text-embedding-3-large'],
      rerank: ['text-davinci-003'],
    },
  },
  chatglm: {
    id: 'chatglm',
    name: 'ChatGLM (Zhipu AI)',
    type: 'chatglm',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    description: 'ChatGLM API with thinking process support',
    supportedFeatures: ['chat'],
    documentationUrl: 'https://open.bigmodel.cn/dev/api',
    defaultModels: {
      chat: ['glm-4', 'glm-4-plus', 'glm-3-turbo'],
    },
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    description: 'DeepSeek API for code and reasoning',
    supportedFeatures: ['chat'],
    documentationUrl: 'https://platform.deepseek.com/api-docs',
    defaultModels: {
      chat: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
    },
  },
  siliconflow: {
    id: 'siliconflow',
    name: 'SiliconFlow',
    type: 'siliconflow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    description: 'SiliconFlow API platform with various models',
    supportedFeatures: ['chat', 'embedding'],
    documentationUrl: 'https://docs.siliconflow.cn/docs',
    defaultModels: {
      chat: [
        'Qwen/Qwen2.5-7B-Instruct',
        'meta-llama/Meta-Llama-3.1-8B-Instruct',
        'THUDM/glm-4-9b-chat',
      ],
      embedding: ['BAAI/bge-large-en-v1.5', 'BAAI/bge-base-zh-v1.5'],
    },
  },
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

  if (provider.defaultModels.chat) {
    models.push(...provider.defaultModels.chat);
  }

  if (provider.defaultModels.embedding) {
    models.push(...provider.defaultModels.embedding);
  }

  if (provider.defaultModels.rerank) {
    models.push(...provider.defaultModels.rerank);
  }

  return [...new Set(models)];
}

/**
 * Helper function to get predefined models for a specific feature type
 */
export function getPredefinedModelsForFeature(providerType: string, feature: string): string[] {
  const provider = PREDEFINED_PROVIDERS[providerType];
  if (!provider?.defaultModels[feature as keyof typeof provider.defaultModels]) {
    return [];
  }

  return provider.defaultModels[feature as keyof typeof provider.defaultModels] || [];
}
