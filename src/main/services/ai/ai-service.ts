import { ILogger } from '../types';
import type { AppConfig, ProviderType } from '@/shared/types/config';

// Extended provider type to include local providers
type ExtendedProviderType = ProviderType | 'local' | 'ollama' | 'deepseek' | 'chatglm';
import type {
  ModelProvider,
  ModelConfig,
  ChatCompletionParams,
  ChatCompletionResult,
  EmbeddingParams,
  EmbeddingResult,
  ModelType
} from './ai-types';
import { createOpenAIService } from './providers/openai-provider';
import { createChatGLMService } from './providers/chatglm-provider';
import { createDeepSeekService } from './providers/deepseek-provider';
import { createLocalModelService } from './providers/local-model-provider';
import { createIPCError } from '@/shared/types/ipc-error';

export type AiService = {
  chatCompletion: (params: ChatCompletionParams) => Promise<ChatCompletionResult>;
  getModelPreset: (presetId: string) => ModelConfig;
  getProviders: () => Record<string, ModelProvider>;
  getAvailableModels: () => ModelType[];
};

type AiServiceDeps = {
  loggerService: any;
  config: AppConfig;
};

const resolveProviderApiKey = (
  providerType: ProviderType | undefined,
  providers: AppConfig['ai']['providers']
): string => {
  if (!providerType) {
    return 'local-dev';
  }

  const entry = Object.values(providers ?? {}).find(
    (provider) => provider.provider_type === providerType
  );

  return (entry?.api_key ?? (entry as any)?.apiKey) || 'local-dev';
};

const buildModelPresets = (config: AppConfig): Record<string, ModelConfig> => {
  const chatDefaults = config.ai.model_types.chat ?? {};
  const chatProvider = chatDefaults.provider as ProviderType | undefined;

  const basePreset: ModelConfig = {
    provider: chatProvider ?? 'openai',
    model: chatDefaults.model ?? 'llama-3.1-70b',
    apiKey: resolveProviderApiKey(chatProvider, config.ai.providers),
    temperature: chatDefaults.temperature ?? 0.3,
    maxTokens: chatDefaults.max_tokens ?? 1024
  };

  return {
    default: basePreset,
    'content.analysis': {
      provider: 'local' as ExtendedProviderType,
      model: 'llama-3.1-70b',
      apiKey: resolveProviderApiKey('local', config.ai.providers),
      temperature: 0.2,
      maxTokens: 2048
    },
    'knowledge.extraction': {
      provider: 'local' as ExtendedProviderType,
      model: 'llama-3.1-70b',
      apiKey: resolveProviderApiKey('local', config.ai.providers),
      temperature: 0.15,
      maxTokens: 2048
    },
    'learning.plan': {
      provider: 'local' as ExtendedProviderType,
      model: 'llama-3.1-70b',
      apiKey: resolveProviderApiKey('local', config.ai.providers),
      temperature: 0.35,
      maxTokens: 3072
    },
    'chat.reply': {
      provider: chatProvider ?? 'openai',
      model: chatDefaults.model ?? 'gpt-4o',
      apiKey: resolveProviderApiKey(chatProvider ?? 'openai', config.ai.providers),
      temperature: 0.7,
      maxTokens: 4096
    }
  };
};

export const createAIService = ({ loggerService, config }: AiServiceDeps): AiService => {
  const serviceLogger = loggerService.child({ service: 'ai' });

  const openAIService = createOpenAIService({ loggerService });
  const chatGLMService = createChatGLMService({ loggerService });
  const deepSeekService = createDeepSeekService({ loggerService });
  const localModelService = createLocalModelService({ loggerService });

  const providers: Record<string, ModelProvider> = {
    openai: openAIService,
    chatglm: chatGLMService,
    deepseek: deepSeekService,
    local: localModelService,
    ollama: localModelService
  };

  const availableModels: ModelType[] = [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      maxTokens: 128000,
      description: "OpenAI's most advanced model, optimized for speed and cost",
      pricing: {
        inputCost: 5.0,
        outputCost: 15.0
      }
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      maxTokens: 128000,
      description: "OpenAI's advanced model with 128K context window",
      pricing: {
        inputCost: 10.0,
        outputCost: 30.0
      }
    },
    {
      id: 'chatglm-pro',
      name: 'ChatGLM Pro',
      provider: 'chatglm',
      maxTokens: 32768,
      description: "Zhipu AI's high-accuracy model for complex reasoning",
      pricing: {
        inputCost: 0.5,
        outputCost: 0.5
      }
    },
    {
      id: 'deepseek-coder',
      name: 'DeepSeek Coder',
      provider: 'deepseek',
      maxTokens: 16384,
      description: 'Specialized model for coding tasks',
      pricing: {
        inputCost: 0.14,
        outputCost: 0.28
      }
    },
    {
      id: 'llama-3.1-70b',
      name: 'Llama 3.1 70B',
      provider: 'local' as ExtendedProviderType,
      maxTokens: 131072,
      description: "Meta's Llama 3.1 model (70B parameters)"
    },
    {
      id: 'mistral-nemo',
      name: 'Mistral Nemo',
      provider: 'local' as ExtendedProviderType,
      maxTokens: 131072,
      description: "Mistral AI's high-quality model"
    }
  ];

  const modelPresets = buildModelPresets(config);

  const logModelSelection = (presetId: string, preset: ModelConfig) => {
    serviceLogger.debug('Model preset selected', { presetId, model: preset.model });
  };

  const runChatCompletion = async (params: ChatCompletionParams): Promise<ChatCompletionResult> => {
    serviceLogger.info('Chat completion requested', { model: params.modelConfig.model });
    const providerKey = (params.modelConfig.provider ?? params.modelConfig.model ?? '').toString().toLowerCase();
    const provider = providerKey ? providers[providerKey] : undefined;

    if (!provider) {
      throw createIPCError({
        type: 'CONFIG_ERROR',
        code: 'ai.provider.not_found',
        message: 'Requested AI provider is not available. Verify your provider settings or pick another model.',
        needsSetup: true,
        action: 'openProviderSetup',
        details: {
          requestedProvider: providerKey || params.modelConfig.model
        }
      });
    }

    return provider.chatCompletion(params);
  };

  const getModelPreset = (presetId: string): ModelConfig => {
    const preset = modelPresets[presetId] ?? modelPresets.default;
    logModelSelection(presetId, preset);
    return preset;
  };

  return {
    chatCompletion: runChatCompletion,
    getModelPreset,
    getProviders: () => providers,
    getAvailableModels: () => availableModels
  };
};

export type AIService = ReturnType<typeof createAIService>;
