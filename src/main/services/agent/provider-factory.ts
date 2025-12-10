// import { BaseLanguageModel, type Embeddings } from '@langchain/core';
// Temporarily commented out due to module resolution issues
type BaseLanguageModel = any;
type Embeddings = any;
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import type { ConfigService, ConfigPath } from '@/main/services/core/config/config-service';
import type { ProviderType, ProviderConfig } from '@/shared/types/config';
import { createIPCError, IPC_ERROR_CODES } from '@/shared/types/ipc-error';
import {
  resolveProviderSettings,
  clampMaxTokens,
  type ProviderSettings as ResolvedProviderSettings,
} from './provider-utils';

export type ProviderSettings = ResolvedProviderSettings;

interface SiliconFlowRerankResult {
  results: Array<{
    document: {
      text: string;
    };
    index: number;
    relevance_score: number;
  }>;
  tokens?: {
    input_tokens: number;
    output_tokens: number;
  };
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

const isRemoteProvider = (providerType: string) =>
  ['openai', 'openai-compatible', 'chatglm', 'deepseek', 'siliconflow'].includes(providerType);

const requiresApiKey = (providerType: string) =>
  ['openai', 'chatglm', 'deepseek', 'siliconflow'].includes(providerType);

const makeChatModel = (settings: ProviderSettings) =>
  new ChatOpenAI({
    modelName: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    apiKey: settings.apiKey,
    maxRetries: 1,
    timeout: 20_000,
    // LangChain v1 expects custom endpoints inside configuration
    configuration: settings.baseUrl ? { baseURL: settings.baseUrl } : undefined,
  });

const makeOpenAIEmbeddings = (settings: ProviderSettings) =>
  new OpenAIEmbeddings({
    apiKey: settings.apiKey,
    configuration: settings.baseUrl ? { baseURL: settings.baseUrl } : undefined,
    model: settings.model,
  });

const makeSiliconFlowReranker = (settings: ProviderSettings): Reranker => ({
  rerank: async (query: string, documents: string[]): Promise<{
    indices: number[];
    scores: number[];
  }> => {
    console.log(`[SiliconFlow Reranker] Using model: ${settings.model} at ${settings.baseUrl}`);

    const response = await fetch(`${settings.baseUrl}/rerank`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.model,
        query,
        documents,
        top_n: documents.length,
        return_documents: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SiliconFlow Reranker] API error for model ${settings.model}:`, errorText);
      throw new Error(`SiliconFlow rerank API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result: SiliconFlowRerankResult = await response.json();
    const sortedResults = [...result.results].sort((a, b) => b.relevance_score - a.relevance_score);
    const indices = sortedResults.map(r => r.index);
    const scores = sortedResults.map(r => r.relevance_score);

    console.log(`[SiliconFlow Reranker] Successfully ranked ${documents.length} documents`);

    return {
      indices,
      scores,
    };
  },
});

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

const normalizeSettings = (raw: ProviderConfig): ProviderSettings => {
  const providerType = raw.providerType as ProviderType;
  const model = raw.model ?? 'gpt-4o';
  const apiKey = raw.apiKey;
  const temperature = raw.temperature ?? 0.7;
  const desiredMaxTokens = raw.maxTokens ?? 10240;
  const maxTokens = clampMaxTokens(desiredMaxTokens, providerType, model);
  const providerName = (raw as any).providerName ?? raw.providerType;

  if (!apiKey && requiresApiKey(providerType)) {
    throw createIPCError({
      type: 'CONFIG_ERROR',
      code: IPC_ERROR_CODES.provider.missingApiKey,
      message: `API key is required for provider ${providerName}`,
      details: { provider: providerName },
    });
  }

  return {
    providerName,
    providerType,
    model,
    apiKey,
    baseUrl: raw.baseUrl as string | undefined,
    temperature,
    maxTokens,
  };
};

export const createProviderFactory = (configService: ConfigService) => {
  const modelCache = new Map<string, { model: BaseLanguageModel; settings: ProviderSettings }>();
  const embeddingsCache = new Map<string, Embeddings>();

  const resolveSettings = async (configKey?: string): Promise<ProviderSettings> => {
    if (!configKey) {
      return resolveProviderSettings(configService);
    }

    // Use the provider name to construct the proper config path
    const providerConfigPath = configKey ? (`ai.providers.${configKey}` as ConfigPath) : undefined;
    const raw = (providerConfigPath ? await configService.get(providerConfigPath) : undefined) as
      | ProviderConfig
      | undefined;
    if (!raw) {
      return resolveProviderSettings(configService);
    }

    return normalizeSettings(raw);
  };

  const getCacheKey = (settings: ProviderSettings) => `${settings.providerType}:${settings.model}`;

  const getModel = async (configKey?: string) => {
    const settings = await resolveSettings(configKey);
    if (requiresApiKey(settings.providerType) && !settings.apiKey) {
      throw createIPCError({
        type: 'CONFIG_ERROR',
        code: IPC_ERROR_CODES.provider.authRequired,
        message: `API key is required to use provider "${settings.providerName}".`,
        details: { provider: settings.providerName },
      });
    }
    const cacheKey = getCacheKey(settings);
    if (modelCache.has(cacheKey)) {
      return modelCache.get(cacheKey)!;
    }
    const impl = PROVIDER_IMPLEMENTATIONS[settings.providerType];
    if (!impl) {
      throw createIPCError({
        type: 'CONFIG_ERROR',
        code: IPC_ERROR_CODES.provider.unsupportedConfig,
        message: `Unsupported provider: ${settings.providerType}`,
        details: { providerType: settings.providerType },
      });
    }
    const model = impl.createModel(settings);
    const entry = { model, settings };
    modelCache.set(cacheKey, entry);
    return entry;
  };

  const getEmbeddings = async (configKey?: string) => {
    const config = await configService.getConfig();
    const embConfig = config?.ai?.modelTypes?.embedding;
    if (!embConfig?.provider || !embConfig?.model) {
      throw createIPCError({
        type: 'CONFIG_ERROR',
        code: IPC_ERROR_CODES.provider.missingConfig,
        message: 'Embedding model configuration is required. Please configure ai.modelTypes.embedding.',
        details: { section: 'ai.modelTypes.embedding' },
      });
    }
    const providerName = embConfig.provider.toLowerCase();
    const provider = config?.ai?.providers?.[providerName];
    if (!provider) {
      throw createIPCError({
        type: 'CONFIG_ERROR',
        code: IPC_ERROR_CODES.provider.missingConfig,
        message: `Embedding provider "${providerName}" is not configured.`,
        details: { providerName },
      });
    }
    const settings = {
      providerName,
      providerType: provider.providerType,
      model: embConfig.model,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      temperature: 0,
      maxTokens: 0,
    } as ProviderSettings;
    if (requiresApiKey(settings.providerType) && !settings.apiKey) {
      throw createIPCError({
        type: 'CONFIG_ERROR',
        code: IPC_ERROR_CODES.provider.authRequired,
        message: `API key is required to use embedding provider "${settings.providerName}".`,
        details: { provider: settings.providerName },
      });
    }
    const cacheKey = `${getCacheKey(settings)}:emb:${settings.model}`;
    if (embeddingsCache.has(cacheKey)) {
      return embeddingsCache.get(cacheKey)!;
    }
    const impl = PROVIDER_IMPLEMENTATIONS[settings.providerType];
    if (!impl) {
      throw createIPCError({
        type: 'CONFIG_ERROR',
        code: IPC_ERROR_CODES.provider.unsupportedConfig,
        message: `Unsupported provider for embeddings: ${settings.providerType}`,
        details: { providerType: settings.providerType },
      });
    }
    const embeddings = impl.createEmbeddings(settings);
    embeddingsCache.set(cacheKey, embeddings);
    return embeddings;
  };

  const getEmbeddingModel = async () => {
    const embeddings = await getEmbeddings('embedding');
    return {
      settings: {
        providerName: 'embedding',
        model: 'embedding-model',
        embeddingDims: 1536,
      },
      embed: async (text: string): Promise<number[]> => {
        const result = await embeddings.embedQuery(text);
        return result;
      },
      embedBatch: async (texts: string[]): Promise<number[][]> => {
        const result = await embeddings.embedDocuments(texts);
        return result;
      },
    };
  };

  const getRerankModel = async () => {
    const config = await configService.getConfig();
    const rerankConfig = config?.ai?.modelTypes?.rerank;

    if (!rerankConfig?.provider || !rerankConfig?.model) {
      throw createIPCError({
        type: 'CONFIG_ERROR',
        code: IPC_ERROR_CODES.provider.missingConfig,
        message: 'Rerank model configuration is required. Please configure ai.modelTypes.rerank.',
        details: { section: 'ai.modelTypes.rerank' },
      });
    }

    const providerName = rerankConfig.provider.toLowerCase();
    const provider = config?.ai?.providers?.[providerName];

    if (!provider) {
      throw createIPCError({
        type: 'CONFIG_ERROR',
        code: IPC_ERROR_CODES.provider.missingConfig,
        message: `Rerank provider "${providerName}" is not configured.`,
        details: { providerName },
      });
    }

    const providerConfigPath = `ai.providers.${providerName}` as ConfigPath;
    const raw = await configService.get(providerConfigPath) as ProviderConfig | undefined;

    if (!raw) {
      throw createIPCError({
        type: 'CONFIG_ERROR',
        code: IPC_ERROR_CODES.provider.missingConfig,
        message: `Provider "${providerName}" configuration not found.`,
        details: { providerName },
      });
    }

    // Merge provider config with model type config to get the complete settings
    const settings = normalizeSettings({
      ...raw,
      model: rerankConfig.model,  // Use the model from modelTypes.rerank.model
    });
    const impl = PROVIDER_IMPLEMENTATIONS[settings.providerType];

    if (!impl) {
      throw createIPCError({
        type: 'CONFIG_ERROR',
        code: IPC_ERROR_CODES.provider.unsupportedConfig,
        message: `Unsupported provider for rerank: ${settings.providerType}`,
        details: { providerType: settings.providerType },
      });
    }

    if (!impl.createReranker) {
      throw new Error(`Model "${settings.model}" does not support reranking. Please configure a rerank-capable model.`);
    }

    console.log(`[ProviderFactory] Initializing reranker for provider: ${providerName}, model: ${settings.model}`);

    const reranker = impl.createReranker(settings);
    return {
      settings: {
        providerName,
        model: settings.model,
      },
      rerank: reranker.rerank,
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
