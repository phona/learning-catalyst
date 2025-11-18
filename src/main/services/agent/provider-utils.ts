import type { ConfigService } from '@/main/services/core/config/config-service';
import type { AppConfig, ProviderType } from '@/shared/types/config';
import type { IPCErrorPayload } from '@/shared/types/ipc-error';
import { createIPCError } from '@/shared/types/ipc-error';

export type ProviderSettings = {
  providerName: string;
  providerType: ProviderType;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
};

export const SUPPORTED_LANGCHAIN_PROVIDERS: ProviderType[] = ['openai', 'openai-compatible'];

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  providerName: 'openai',
  providerType: 'openai',
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
  baseUrl: 'https://api.openai.com/v1',
  temperature: 0.4,
  maxTokens: 2048
};

const requireChatConfig = (): IPCErrorPayload => {
  return createIPCError({
    type: 'CONFIG_ERROR',
    code: 'provider.config.chat_missing',
    message: 'Chat model configuration is missing. Please configure a provider before starting an agent.',
    needsSetup: true,
    action: 'openProviderSetup',
    details: { section: 'ai.model_types.chat' }
  });
};

const missingProviderConfigError = (providerName: string): IPCErrorPayload => {
  return createIPCError({
    type: 'CONFIG_ERROR',
    code: 'provider.config.missing',
    message: `Provider "${providerName}" is not configured yet. Set up your provider credentials in the settings.`,
    needsSetup: true,
    action: 'openProviderSetup',
    details: { providerName }
  });
};

const missingApiKeyError = (providerName: string): IPCErrorPayload => {
  return createIPCError({
    type: 'CONFIG_ERROR',
    code: 'provider.config.missing_api_key',
    message: `API key for provider "${providerName}" is required. Provide a valid key in the settings.`,
    needsSetup: true,
    action: 'openProviderSetup',
    details: { providerName }
  });
};

export const resolveProviderSettings = async (configService: ConfigService): Promise<ProviderSettings> => {
  const config = await configService.getConfig();
  if (!config?.ai) {
    throw requireChatConfig();
  }

  const chatConfig = config.ai.model_types?.chat;
  if (!chatConfig) {
    throw requireChatConfig();
  }

  const providerName = (chatConfig.provider ?? DEFAULT_PROVIDER_SETTINGS.providerName).toLowerCase();
  const providerConfig = config.ai.providers?.[providerName];

  const providerType = (providerConfig?.provider_type ?? providerConfig?.type ?? DEFAULT_PROVIDER_SETTINGS.providerType) as ProviderType;
  const resolvedApiKey = providerConfig?.api_key ?? (providerConfig as any)?.apiKey ?? DEFAULT_PROVIDER_SETTINGS.apiKey;

  if (!providerConfig && !resolvedApiKey) {
    throw missingProviderConfigError(providerName);
  }

  if (!resolvedApiKey) {
    throw missingApiKeyError(providerName);
  }

  const model =
    chatConfig.model ??
    providerConfig?.model ??
    providerConfig?.models?.[0] ??
    DEFAULT_PROVIDER_SETTINGS.model;
  const baseUrl =
    providerConfig?.base_url ?? (providerConfig as any)?.baseUrl ?? DEFAULT_PROVIDER_SETTINGS.baseUrl;
  const temperature =
    chatConfig.temperature ??
    providerConfig?.temperature ??
    DEFAULT_PROVIDER_SETTINGS.temperature;
  const maxTokens =
    chatConfig.max_tokens ?? providerConfig?.max_tokens ?? DEFAULT_PROVIDER_SETTINGS.maxTokens;

  return {
    providerName,
    providerType,
    model,
    apiKey: resolvedApiKey,
    baseUrl,
    temperature,
    maxTokens
  };
};

export const buildLearnerPrompt = async (basePrompt: string, configService: ConfigService): Promise<string> => {
  const config = await configService.getConfig();
  if (!config?.learning) {
    return basePrompt;
  }

  const learningPrefs = config.learning;
  const details = [
    learningPrefs.learning_style && `Learning style: ${learningPrefs.learning_style}`,
    learningPrefs.difficulty && `Difficulty preference: ${learningPrefs.difficulty}`,
    learningPrefs.personalization_enabled && 'Personalize responses based on learner preferences',
    learningPrefs.preferred_explanation_length && `Preferred explanation length: ${learningPrefs.preferred_explanation_length}`
  ]
    .filter(Boolean)
    .join('. ');

  return details ? `${basePrompt}\n${details}` : basePrompt;
};

export const needsAgentRebuild = (oldConfig: AppConfig, newConfig: AppConfig): boolean => {
  const oldChat = oldConfig.ai.model_types?.chat;
  const newChat = newConfig.ai.model_types?.chat;
  
  return (
    oldChat?.provider !== newChat?.provider ||
    oldChat?.model !== newChat?.model ||
    oldConfig.ai.providers[oldChat?.provider || '']?.api_key !==
    newConfig.ai.providers[newChat?.provider || '']?.api_key ||
    oldConfig.ai.providers[oldChat?.provider || '']?.base_url !==
    newConfig.ai.providers[newChat?.provider || '']?.base_url
  );
};
