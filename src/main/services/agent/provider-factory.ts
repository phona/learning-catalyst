import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { Embeddings } from '@langchain/core/embeddings';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import type { ConfigService } from '@/main/services/core/config/config-service';
import type { ProviderType, ProviderConfig } from '@/shared/types/config';
import { createIPCError, IPC_ERROR_CODES } from '@/shared/types/ipc-error';
import { clampMaxTokens, type ProviderSettings } from './provider-utils';

// ============================================================================
// TYPES
// ============================================================================

interface SiliconFlowRerankResult {
  results: Array<{
    document: { text: string };
    index: number;
    relevance_score: number;
  }>;
  tokens?: { input_tokens: number; output_tokens: number };
}

interface Reranker {
  rerank: (query: string, documents: string[]) => Promise<{
    indices: number[];
    scores: number[];
  }>;
}

type ProviderImplementation = {
  createModel: (settings: ProviderSettings) => BaseLanguageModel;
  createEmbeddings: (settings: ProviderSettings) => Embeddings;
  createReranker?: (settings: ProviderSettings) => Reranker;
};

// ============================================================================
// HELPERS - Simple, reusable functions
// ============================================================================

/**
 * Check if a provider requires an API key for authentication.
 * Local providers (like Ollama) don't need API keys, but cloud providers do.
 *
 * @param providerType - The provider type (e.g., "openai", "chatglm")
 * @returns true if the provider requires an API key
 */
const requiresApiKey = (providerType: string) =>
  ['openai', 'chatglm', 'deepseek', 'siliconflow'].includes(providerType);

/**
 * Generic cache helper - ONE implementation for all caching needs.
 * This avoids duplicating cache logic across getModel, getEmbeddings, etc.
 *
 * @param cache - The cache Map to check and update
 * @param key - Unique key for this cached item
 * @param factory - Async function to create the item if not in cache
 * @returns The cached or newly created item
 *
 * @example
 * // Without helper (duplicate code):
 * if (cache.has(key)) return cache.get(key);
 * const value = await createExpensiveObject();
 * cache.set(key, value);
 * return value;
 *
 * @example
 * // With helper (clean code):
 * return getOrCreate(cache, key, () => createExpensiveObject());
 */
async function getOrCreate<T>(
  cache: Map<string, T>,
  key: string,
  factory: () => Promise<T>
): Promise<T> {
  if (cache.has(key)) {
    return cache.get(key)!;
  }
  const value = await factory();
  cache.set(key, value);
  return value;
}

/**
 * Load and validate provider configuration from ai.providers.
 * Centralizes the config loading logic that's repeated in multiple places.
 *
 * @param configService - The config service to load from
 * @param providerName - Name of the provider to load (e.g., "openai", "chatglm")
 * @returns Object containing the full app config and the specific provider config
 * @throws CONFIG_ERROR if the provider is not found
 *
 * @example
 * const { config, provider } = await loadProviderConfig(configService, "openai");
 * // config = full app config
 * // provider = { providerType: "openai", apiKey: "...", model: "gpt-4o", ... }
 */
async function loadProviderConfig(
  configService: ConfigService,
  providerName: string
): Promise<{ config: any; provider: ProviderConfig }> {
  const config = await configService.getConfig();
  const provider = config?.ai?.providers?.[providerName];

  if (!provider) {
    throw createIPCError({
      type: 'CONFIG_ERROR',
      code: IPC_ERROR_CODES.provider.missingConfig,
      message: `Provider "${providerName}" not found in ai.providers`,
      details: { providerName },
    });
  }

  return { config, provider };
}

/**
 * Build ProviderSettings from provider configuration.
 * Consolidates the logic for converting ProviderConfig → ProviderSettings.
 *
 * This is simpler than before because:
 * - ConfigService already merged defaults, so we don't need to handle missing values
 * - We just extract and validate the values we need
 * - Max tokens are clamped to provider limits
 *
 * @param providerName - Name of the provider (for ProviderSettings.providerName)
 * @param provider - The provider config from ai.providers
 * @param config - The full app config (for embeddingDimensions, etc.)
 * @param modelTypeConfig - Optional model type config (chat/embedding/rerank) with model, temperature, maxTokens
 * @param modelOverride - Optional model name override (used for rerank which uses different model)
 * @returns ProviderSettings object ready for creating model instances
 *
 * @example
 * const settings = buildSettings("openai", providerConfig, appConfig, chatConfig);
 * // Returns: { providerName: "openai", providerType: "openai", model: "gpt-4o", ... }
 */
function buildSettings(
  providerName: string,
  provider: ProviderConfig,
  config: any,
  modelTypeConfig?: any,
  modelOverride?: string
): ProviderSettings {
  const providerType = provider.providerType as ProviderType;
  const model = modelOverride || modelTypeConfig?.model || provider.model!;
  const temperature = modelTypeConfig?.temperature ?? provider.temperature!;
  const maxTokens = clampMaxTokens(
    modelTypeConfig?.maxTokens ?? provider.maxTokens!,
    providerType,
    model
  );

  // Determine timeout: use parsing.chatTimeoutSeconds if available, otherwise performance.requestTimeout
  // Timeout is in seconds in config, but we need milliseconds for ChatOpenAI
  const timeoutSeconds = config.parsing?.chatTimeoutSeconds ?? config.performance?.requestTimeout ?? 30;
  const timeoutMs = timeoutSeconds * 1000;

  return {
    providerName,
    providerType,
    model,
    apiKey: provider.apiKey,
    baseUrl: provider.baseUrl,
    temperature,
    maxTokens,
    embeddingDimensions: config.ai.embeddingDimensions,
    timeout: timeoutMs,
  };
}

// ============================================================================
// MODEL CREATORS
// ============================================================================

const makeChatModel = (settings: ProviderSettings) =>
  new ChatOpenAI({
    modelName: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    apiKey: settings.apiKey,
    maxRetries: 1,
    timeout: settings.timeout,
    configuration: settings.baseUrl ? { baseURL: settings.baseUrl } : undefined,
  });

const makeOpenAIEmbeddings = (settings: ProviderSettings) =>
  new OpenAIEmbeddings({
    apiKey: settings.apiKey,
    configuration: settings.baseUrl ? { baseURL: settings.baseUrl } : undefined,
    model: settings.model,
    dimensions: settings.embeddingDimensions,
  });

const makeSiliconFlowReranker = (settings: ProviderSettings): Reranker => ({
  rerank: async (query: string, documents: string[]) => {
    console.log(`[Reranker] Using ${settings.model} at ${settings.baseUrl}`);

    if (!documents.length) {
      throw new Error('No documents provided for reranking');
    }

    const validDocs = documents.filter(doc => doc && doc.trim().length > 0);
    if (!validDocs.length) {
      throw new Error('No valid documents provided for reranking');
    }

    const response = await fetch(`${settings.baseUrl}/rerank`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.model,
        query,
        documents: validDocs,
        top_n: validDocs.length,
        return_documents: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Rerank API error: ${response.status} ${errorText}`);
    }

    const result: SiliconFlowRerankResult = await response.json();
    const sortedResults = [...result.results].sort(
      (a, b) => b.relevance_score - a.relevance_score
    );

    return {
      indices: sortedResults.map(r => r.index),
      scores: sortedResults.map(r => r.relevance_score),
    };
  },
});

// ============================================================================
// PROVIDER IMPLEMENTATIONS
// ============================================================================

const PROVIDER_IMPLEMENTATIONS: Record<string, ProviderImplementation> = {
  openai: {
    createModel: makeChatModel,
    createEmbeddings: makeOpenAIEmbeddings,
  },
  chatglm: {
    createModel: makeChatModel,
    createEmbeddings: makeOpenAIEmbeddings,
  },
  deepseek: {
    createModel: makeChatModel,
    createEmbeddings: makeOpenAIEmbeddings,
  },
  siliconflow: {
    createModel: makeChatModel,
    createEmbeddings: makeOpenAIEmbeddings,
    createReranker: makeSiliconFlowReranker,
  },
  'openai-compatible': {
    createModel: makeChatModel,
    createEmbeddings: makeOpenAIEmbeddings,
  },
  ollama: {
    createModel: makeChatModel,
    createEmbeddings: makeOpenAIEmbeddings,
  },
};

// ============================================================================
// FACTORY - Simple, clear API
// ============================================================================

/**
 * Creates a provider factory for managing AI model instances.
 *
 * This factory provides a simple, unified interface for getting AI models
 * of different types (chat, embeddings, rerank) from various providers.
 *
 * Key features:
 * - 4 clear methods: getModel, getEmbeddings, getRerankModel, getEmbeddingModel
 * - Automatic caching - same model instance reused across calls
 * - Configuration validation - clear errors when config is missing
 * - Provider abstraction - same API works for OpenAI, ChatGLM, DeepSeek, etc.
 *
 * @param configService - The configuration service for loading provider settings
 * @returns Factory object with methods to get model instances
 *
 * @example
 * const factory = createProviderFactory(configService);
 * const model = await factory.getModel("openai");
 * const response = await model.invoke([{ role: "user", content: "Hello" }]);
 */
export const createProviderFactory = (configService: ConfigService) => {
  // Separate caches for each model type to avoid key conflicts
  // Cache key format: "model:openai", "emb:openai:gpt-4o", "rerank:siliconflow:rerank-model"
  const modelCache = new Map<string, BaseLanguageModel>();
  const embeddingsCache = new Map<string, Embeddings>();
  const rerankerCache = new Map<string, Reranker>();

  /**
   * Get a chat/LLM model for a provider.
   *
   * This is the main method for getting chat models. It:
   * 1. Uses the specified provider, or defaults to ai.modelTypes.chat
   * 2. Loads and validates the provider configuration
   * 3. Caches the model instance for reuse
   * 4. Returns the model ready to use
   *
   * @param providerName - Optional provider name (e.g., "openai", "chatglm").
   *                      If omitted, uses the default from ai.modelTypes.chat
   * @returns A LangChain BaseLanguageModel instance
   * @throws CONFIG_ERROR if provider not found, missing API key, or unsupported
   *
   * @example
   * // Get default chat model
   * const model = await getModel();
   *
   * @example
   * // Get specific provider
   * const model = await getModel("openai");
   * const response = await model.invoke([{ role: "user", content: "Hello" }]);
   */
  const getModel = async (providerName?: string) => {
    // If no provider specified, get default from ai.modelTypes.chat
    const config = await configService.getConfig();
    if (!providerName) {
      providerName = config.ai.modelTypes?.chat?.provider;
      if (!providerName) {
        throw createIPCError({
          type: 'CONFIG_ERROR',
          code: IPC_ERROR_CODES.provider.missingConfig,
          message: 'Default chat provider not configured. Set ai.modelTypes.chat.provider',
        });
      }
    }

    const chatConfig = config.ai.modelTypes?.chat;
    if (!chatConfig) {
      throw createIPCError({
        type: 'CONFIG_ERROR',
        code: IPC_ERROR_CODES.provider.missingConfig,
        message: 'Chat model config not found. Set ai.modelTypes.chat',
      });
    }

    const cacheKey = `model:${providerName}`;
    return getOrCreate(modelCache, cacheKey, async () => {
      // Load provider config (throws if not found)
      const { config: fullConfig, provider } = await loadProviderConfig(configService, providerName!);
      // Convert to ProviderSettings format using chat config
      const settings = buildSettings(providerName!, provider, fullConfig, chatConfig);

      // Validate API key for providers that need it (cloud providers, not local)
      if (requiresApiKey(settings.providerType) && !settings.apiKey) {
        throw createIPCError({
          type: 'CONFIG_ERROR',
          code: IPC_ERROR_CODES.provider.authRequired,
          message: `API key required for ${providerName}. Configure it in Settings.`,
        });
      }

      // Create model using the provider's implementation
      const impl = PROVIDER_IMPLEMENTATIONS[settings.providerType];
      if (!impl) {
        throw createIPCError({
          type: 'CONFIG_ERROR',
          code: IPC_ERROR_CODES.provider.unsupportedConfig,
          message: `Unsupported provider: ${settings.providerType}`,
          details: { providerType: settings.providerType },
        });
      }

      console.log("model", JSON.stringify(settings));
      return impl.createModel(settings);
    });
  };

  /**
   * Get embeddings model from ai.modelTypes.embedding
   */
  const getEmbeddings = async () => {
    const config = await configService.getConfig();
    const embConfig = config.ai.modelTypes?.embedding;

    console.log("embConfig", JSON.stringify(embConfig));
    if (!embConfig?.provider || !embConfig?.model) {
      throw createIPCError({
        type: 'CONFIG_ERROR',
        code: IPC_ERROR_CODES.provider.missingConfig,
        message: 'Embedding config missing. Set ai.modelTypes.embedding',
      });
    }

    // Validate embeddingDimensions is required
    if (!config.ai.embeddingDimensions) {
      throw createIPCError({
        type: 'CONFIG_ERROR',
        code: IPC_ERROR_CODES.provider.missingConfig,
        message: 'embeddingDimensions is required. Set ai.embeddingDimensions',
      });
    }

    const cacheKey = `emb:${embConfig.provider}:${embConfig.model}`;
    return getOrCreate(embeddingsCache, cacheKey, async () => {
      const { config: fullConfig, provider } = await loadProviderConfig(configService, embConfig.provider!);
      const settings = buildSettings(embConfig.provider!, provider, fullConfig, embConfig);

      if (requiresApiKey(settings.providerType) && !settings.apiKey) {
        throw createIPCError({
          type: 'CONFIG_ERROR',
          code: IPC_ERROR_CODES.provider.authRequired,
          message: `API key required for embeddings provider ${embConfig.provider}`,
        });
      }

      const impl = PROVIDER_IMPLEMENTATIONS[settings.providerType];
      if (!impl) {
        throw createIPCError({
          type: 'CONFIG_ERROR',
          code: IPC_ERROR_CODES.provider.unsupportedConfig,
          message: `Unsupported embeddings provider: ${settings.providerType}`,
        });
      }

      return impl.createEmbeddings(settings);
    });
  };

  /**
   * Get reranking model from ai.modelTypes.rerank
   */
  const getRerankModel = async () => {
    const config = await configService.getConfig();
    const rerankConfig = config.ai.modelTypes?.rerank;

    if (!rerankConfig?.provider || !rerankConfig?.model) {
      throw createIPCError({
        type: 'CONFIG_ERROR',
        code: IPC_ERROR_CODES.provider.missingConfig,
        message: 'Rerank config missing. Set ai.modelTypes.rerank',
      });
    }

    const cacheKey = `rerank:${rerankConfig.provider}:${rerankConfig.model}`;
    return getOrCreate(rerankerCache, cacheKey, async () => {
      const { config: fullConfig, provider } = await loadProviderConfig(configService, rerankConfig.provider!);
      const settings = buildSettings(rerankConfig.provider!, provider, fullConfig, rerankConfig, rerankConfig.model!);

      const impl = PROVIDER_IMPLEMENTATIONS[settings.providerType];
      if (!impl?.createReranker) {
        throw new Error(`Provider ${settings.providerType} doesn't support reranking`);
      }

      console.log(`[Factory] Initializing reranker: ${settings.model}`);
      return impl.createReranker(settings);
    });
  };

  /**
   * Get a simple embedding interface with embed/embedBatch methods
   */
  const getEmbeddingModel = async () => {
    const embeddings = await getEmbeddings();
    const config = await configService.getConfig();

    return {
      embed: (text: string) => embeddings.embedQuery(text),
      embedBatch: (texts: string[]) => embeddings.embedDocuments(texts),
      dimensions: config.ai.embeddingDimensions,
    };
  };

  return {
    getModel,
    getEmbeddings,
    getEmbeddingModel,
    getRerankModel,
  };
};

export type ProviderFactory = ReturnType<typeof createProviderFactory>;
