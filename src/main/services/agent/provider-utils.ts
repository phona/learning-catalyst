import type { ConfigService } from '@/main/services/core/config/config-service';
import type { AppConfig, ProviderType } from '@/shared/types';
import type { IPCErrorPayload } from '@/shared/types/ipc-error';
import { createIPCError } from '@/shared/types/ipc-error';

// ============================================================================
// TYPES
// ============================================================================

export type ProviderSettings = {
  providerName: string;
  providerType: ProviderType;
  model: string;
  apiKey?: string | undefined;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
  embeddingDimensions?: number;
  timeout: number;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const PROVIDER_OUTPUT_CAP: Record<ProviderType, number> = {
  openai: 16384,
  'openai-compatible': 16384,
  chatglm: 12000,
  deepseek: 16384,
  siliconflow: 12000,
};

const SUPPORTED_LANGCHAIN_PROVIDERS: ProviderType[] = ['openai', 'openai-compatible'];

// ============================================================================
// UTILITIES
// ============================================================================

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

// ============================================================================
// ERROR HELPERS
// ============================================================================

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

// ============================================================================
// RESOLVE PROVIDER SETTINGS
// ============================================================================

export const resolveProviderSettings = async (
  configService: ConfigService,
): Promise<ProviderSettings> => {
  const config = await configService.getConfig();
  if (!config?.ai?.modelTypes?.chat?.provider || !config?.ai?.modelTypes?.chat?.model) {
    throw requireChatConfig();
  }

  const chatConfig = config.ai.modelTypes.chat;
  const providerName = chatConfig.provider?.toLowerCase();
  const providerConfig = providerName ? config.ai.providers?.[providerName] : undefined;

  if (!providerConfig || !providerName) {
    throw missingProviderConfigError(providerName || 'unknown');
  }

  if (!providerConfig.providerType) {
    throw createIPCError({
      type: 'CONFIG_ERROR',
      code: 'provider.config.missing_provider_type',
      message: `Provider "${providerName}" is missing providerType.`,
      details: { providerName },
    });
  }

  const providerType = providerConfig.providerType as ProviderType;
  const model = chatConfig.model!; // validated above
  const baseUrl = providerConfig.baseUrl;
  const temperature = chatConfig.temperature ?? 0.7;
  const desiredMaxTokens = chatConfig.maxTokens ?? 10240;
  const maxTokens = clampMaxTokens(desiredMaxTokens, providerType, model);
  const embeddingDimensions = config.ai.embeddingDimensions ?? 1536;

  // Determine timeout: use parsing.chatTimeoutSeconds if available, otherwise performance.requestTimeout
  const timeoutSeconds = config.parsing?.chatTimeoutSeconds ?? config.performance?.requestTimeout ?? 30;
  const timeoutMs = timeoutSeconds * 1000;

  const settings: ProviderSettings = {
    providerName: providerName!,
    providerType,
    model,
    apiKey: providerConfig.apiKey,
    baseUrl,
    temperature,
    maxTokens,
    embeddingDimensions,
    timeout: timeoutMs,
  };

  return settings;
};

// ============================================================================
// LEARNING PROMPT BUILDER
// ============================================================================

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

// ============================================================================
// CONFIG CHANGE DETECTION
// ============================================================================

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
