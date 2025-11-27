import { createAgent } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import type { ConfigService } from '@/main/services/core/config/config-service';
import type { ProviderSettings } from './provider-utils';
import { resolveProviderSettings } from './provider-utils';

const isRemoteProvider = (providerType: string) =>
  ['openai', 'openai-compatible', 'chatglm', 'deepseek'].includes(providerType);

const createChatModel = (settings: ProviderSettings) => {
  if (isRemoteProvider(settings.providerType) && !settings.apiKey) {
    throw new Error(`API key is required to use provider "${settings.providerName}".`);
  }
  return new ChatOpenAI({
    model: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    apiKey: settings.apiKey,
    configuration: settings.baseUrl ? { baseURL: settings.baseUrl } : undefined,
  });
};

export const createDomainAgent = async (deps: { configService: ConfigService }) => {
  const providerSettings = await resolveProviderSettings(deps.configService);
  const chatModel = createChatModel(providerSettings);

  const agent = createAgent({
    model: chatModel,
  });

  return agent;
};

export type DomainAgent = Awaited<ReturnType<typeof createDomainAgent>>;
