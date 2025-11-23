import { createAgent } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import type { ConfigService } from '@/main/services/core/config/config-service';
import type { ProviderSettings } from './provider-utils';
import { resolveProviderSettings } from './provider-utils';

const createChatModel = (settings: ProviderSettings) => {
  return new ChatOpenAI({
    model: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    apiKey: settings.apiKey,
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
