import type { ConfigService } from '@/main/services/core/config/config-service';
import type { AppConfig, ProviderType } from '@/shared/types';
import type { IPCErrorPayload, IPCError } from '@/shared/types/ipc-error';
import { createIPCError, IPCErrorException } from '@/shared/types/ipc-error';

export type ProviderSettings = {
  providerName: string;
  providerType: ProviderType;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
};

const PROVIDER_OUTPUT_CAP: Record<ProviderType, number> = {
  openai: 16384,
  'openai-compatible': 16384,
  chatglm: 12000,
  deepseek: 16384,
  siliconflow: 12000,
};

const detectModelCap = (model?: string): number | undefined => {
  if (!model) return undefined;
  const lower = model.toLowerCase();
  if (lower.includes('128k') || lower.includes('200k')) return 65536;
  if (lower.includes('64k')) return 32768;
  if (lower.includes('32k')) return 16384;
  if (lower.includes('16k')) return 12000;
  return undefined;
};

export const clampMaxTokens = (
  requested: number,
  providerType: ProviderType,
  model?: string,
): number => {
  const baseCap = PROVIDER_OUTPUT_CAP[providerType] ?? 12000;
  const modelCap = detectModelCap(model);
  const cap = Math.max(baseCap, modelCap ?? baseCap);
  return Math.min(requested, cap);
};

export const SUPPORTED_LANGCHAIN_PROVIDERS: ProviderType[] = ['openai', 'openai-compatible'];

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  providerName: 'openai',
  providerType: 'openai',
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
  baseUrl: 'https://api.openai.com/v1',
  temperature: 0.4,
  maxTokens: 10240,
};

const requireChatConfig = (): IPCErrorPayload => {
  return createIPCError({
    type: 'CONFIG_ERROR',
    code: 'provider.config.chat_missing',
    message:
      'Chat model configuration is missing. Please configure a provider before starting an agent.',
    details: { section: 'ai.modelTypes.chat' },
  });
};

const missingProviderConfigError = (providerName: string): IPCErrorPayload => {
  return createIPCError({
    type: 'CONFIG_ERROR',
    code: 'provider.config.missing',
    message: `Provider "${providerName}" is not configured yet. Set up your provider credentials in the settings.`,
    details: { providerName },
  });
};

export const resolveProviderSettings = async (
  configService: ConfigService,
): Promise<ProviderSettings> => {
  const config = await configService.getConfig();
  if (!config?.ai?.modelTypes?.chat?.provider || !config?.ai?.modelTypes?.chat?.model) {
    throw requireChatConfig();
  }

  const chatConfig = config.ai.modelTypes.chat;
  if (!chatConfig?.provider) {
    throw requireChatConfig();
  }

  const providerName = chatConfig.provider.toLowerCase();
  const providerConfig = config.ai.providers?.[providerName];

  if (!providerConfig) {
    throw missingProviderConfigError(providerName);
  }

  // apiKey may be empty/undefined; no aliases or env fallback
  const resolvedApiKey = providerConfig.apiKey;

  if (!providerConfig.providerType) {
    throw createIPCError({
      type: 'CONFIG_ERROR',
      code: 'provider.config.missing_provider_type',
      message: `Provider "${providerName}" is missing providerType.`,
      details: { providerName },
    });
  }

  const providerType = providerConfig.providerType as ProviderType;
  const model = chatConfig.model; // no fallback to defaults
  const baseUrl = providerConfig.baseUrl;
  const temperature = chatConfig.temperature ?? DEFAULT_PROVIDER_SETTINGS.temperature;
  const desiredMaxTokens = chatConfig.maxTokens ?? DEFAULT_PROVIDER_SETTINGS.maxTokens;
  const maxTokens = clampMaxTokens(desiredMaxTokens, providerType, model);

  return {
    providerName,
    providerType,
    model,
    apiKey: resolvedApiKey,
    baseUrl,
    temperature,
    maxTokens,
  };
};

export const buildLearnerPrompt = async (
  basePrompt: string,
  configService: ConfigService,
): Promise<string> => {
  const config = await configService.getConfig();
  if (!config?.learning) {
    return basePrompt;
  }

  const learningPrefs = config.learning;
  const details = [
    learningPrefs.learningStyle && `Learning style: ${learningPrefs.learningStyle}`,
    learningPrefs.difficulty && `Difficulty preference: ${learningPrefs.difficulty}`,
    learningPrefs.personalizationEnabled && 'Personalize responses based on learner preferences',
    learningPrefs.preferredExplanationLength &&
      `Preferred explanation length: ${learningPrefs.preferredExplanationLength}`,
  ]
    .filter(Boolean)
    .join('. ');

  return details ? `${basePrompt}\n${details}` : basePrompt;
};

export const needsAgentRebuild = (oldConfig: AppConfig, newConfig: AppConfig): boolean => {
  const oldChat = oldConfig.ai.modelTypes?.chat;
  const newChat = newConfig.ai.modelTypes?.chat;

  return (
    oldChat?.provider !== newChat?.provider ||
    oldChat?.model !== newChat?.model ||
    oldConfig.ai.providers[oldChat?.provider || '']?.apiKey !==
      newConfig.ai.providers[newChat?.provider || '']?.apiKey ||
    oldConfig.ai.providers[oldChat?.provider || '']?.baseUrl !==
      newConfig.ai.providers[newChat?.provider || '']?.baseUrl
  );
};
