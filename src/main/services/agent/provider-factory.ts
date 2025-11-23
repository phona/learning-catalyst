// import { BaseLanguageModel, type Embeddings } from '@langchain/core';
// Temporarily commented out due to module resolution issues
type BaseLanguageModel = any;
type Embeddings = any;
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import type { ConfigService, ConfigPath } from '@/main/services/core/config/config-service';
import type { ProviderType } from '@/shared/types/config';
import { createIPCError } from '@/shared/types/ipc-error';
import {
  resolveProviderSettings,
  type ProviderSettings as ResolvedProviderSettings,
} from './provider-utils';

export type ProviderSettings = ResolvedProviderSettings;

type ProviderImplementation = {
  createModel: (settings: ProviderSettings) => BaseLanguageModel;
  createEmbeddings: (settings: ProviderSettings) => Embeddings;
};

const makeChatModel = (settings: ProviderSettings) =>
  new ChatOpenAI({
    modelName: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    openAIApiKey: settings.apiKey,
  });

const makeOpenAIEmbeddings = (settings: ProviderSettings) =>
  new OpenAIEmbeddings({
    openAIApiKey: settings.apiKey,
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

const normalizeSettings = (raw: Record<string, unknown>): ProviderSettings => {
  const providerType = (raw.provider_type ?? raw.provider ?? 'openai') as ProviderType;
  const model = (raw.model ?? raw.name ?? 'gpt-4o') as string;
  const apiKey = (raw.api_key ?? raw.apiKey ?? raw.openaiApiKey ?? raw.apiKey) as
    | string
    | undefined;
  const temperature = (raw.temperature ?? raw.temp ?? 0.7) as number;
  const maxTokens = (raw.max_tokens ?? raw.maxTokens ?? 2048) as number;
  const providerName = (raw.providerName ?? raw.provider ?? providerType) as string;

  if (!apiKey) {
    throw createIPCError({
      type: 'CONFIG_ERROR',
      code: 'provider.config.missing_api_key',
      message: `API key is required for provider ${providerName}`,
      needsSetup: true,
      action: 'openProviderSetup',
      details: { provider: providerName },
    });
  }

  return {
    providerName,
    providerType,
    model,
    apiKey,
    baseUrl: (raw.base_url ?? raw.baseUrl ?? undefined) as string | undefined,
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
    const raw = providerConfigPath ? await configService.get(providerConfigPath) : undefined;
    if (!raw || typeof raw !== 'object') {
      return resolveProviderSettings(configService);
    }

    return normalizeSettings(raw as Record<string, unknown>);
  };

  const getCacheKey = (settings: ProviderSettings) => `${settings.providerType}:${settings.model}`;

  const getModel = async (configKey?: string) => {
    const settings = await resolveSettings(configKey);
    const cacheKey = getCacheKey(settings);
    if (modelCache.has(cacheKey)) {
      return modelCache.get(cacheKey)!;
    }
    const impl = PROVIDER_IMPLEMENTATIONS[settings.providerType];
    if (!impl) {
      throw createIPCError({
        type: 'CONFIG_ERROR',
        code: 'provider.config.unsupported',
        message: `Unsupported provider: ${settings.providerType}`,
        needsSetup: true,
        action: 'openProviderSetup',
        details: { providerType: settings.providerType },
      });
    }
    const model = impl.createModel(settings);
    const entry = { model, settings };
    modelCache.set(cacheKey, entry);
    return entry;
  };

  const getEmbeddings = async (configKey?: string) => {
    const settings = await resolveSettings(configKey);
    const cacheKey = `${getCacheKey(settings)}:emb`;
    if (embeddingsCache.has(cacheKey)) {
      return embeddingsCache.get(cacheKey)!;
    }
    const impl = PROVIDER_IMPLEMENTATIONS[settings.providerType];
    if (!impl) {
      throw createIPCError({
        type: 'CONFIG_ERROR',
        code: 'provider.config.unsupported',
        message: `Unsupported provider for embeddings: ${settings.providerType}`,
        needsSetup: true,
        action: 'openProviderSetup',
        details: { providerType: settings.providerType },
      });
    }
    const embeddings = impl.createEmbeddings(settings);
    embeddingsCache.set(cacheKey, embeddings);
    return embeddings;
  };

  return {
    getModel,
    getEmbeddings,
  };
};

export type ProviderFactory = ReturnType<typeof createProviderFactory>;
