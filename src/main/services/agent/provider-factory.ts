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

type ProviderImplementation = {
  createModel: (settings: ProviderSettings) => BaseLanguageModel;
  createEmbeddings: (settings: ProviderSettings) => Embeddings;
};

const isRemoteProvider = (providerType: string) =>
  ['openai', 'openai-compatible', 'chatglm', 'deepseek'].includes(providerType);

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
  local: {
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

  if (!apiKey) {
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
    if (isRemoteProvider(settings.providerType) && !settings.apiKey) {
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
    if (isRemoteProvider(settings.providerType) && !settings.apiKey) {
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
    const model = await getModel('rerank');
    return {
      settings: {
        providerName: 'rerank',
        model: 'rerank-model',
      },
      rerank: async (query: string, documents: string[]) => {
        const modelInstance = model.model;
        const prompt = `
Query: ${query}

Documents:
${documents.map((doc, i) => `${i + 1}. ${doc}`).join('\n')}

Rank these documents by relevance to the query. Return a JSON array of scores from 0-1.
        `.trim();

        const response = await modelInstance.invoke([{ role: 'user', content: prompt }]);
        const content = typeof response === 'string' ? response : response?.content || '[]';

        try {
          const scores = JSON.parse(content) as number[];
          const indices = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
          return {
            indices,
            scores: indices.map((i) => scores[i]),
          };
        } catch {
          const scores = documents.map(() => 1.0);
          const indices = scores.map((_, i) => i);
          return {
            indices,
            scores,
          };
        }
      },
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
