import { createAgent } from 'langchain';
import type { AgentToolDeps, ToolRegistry } from './tool-registry';
import { buildLearnerPrompt, type ProviderSettings } from './provider-utils';

type AgentMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type SpecializedAgentRequest = {
  conversationId?: string;
  topic?: string;
  userId?: string;
  messages: AgentMessage[];
  systemPrompt?: string;
};

export type SpecializedAgentResult = {
  content: string;
  model: string;
  provider: string;
  agentType: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

type SpecializedAgentOptions = {
  agentType: string;
  systemPrompt: string;
  toolBuilder: (deps: AgentToolDeps) => ToolRegistry;
};

export const pickAssistantMessage = (messages: Array<{ role?: string; content?: string | Array<any> }>) => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const candidate = messages[i];
    if (!candidate?.role) continue;
    if (candidate.role === 'assistant' || candidate.role === 'ai') {
      if (typeof candidate.content === 'string') {
        return { role: candidate.role, content: candidate.content };
      }
      if (Array.isArray(candidate.content)) {
        const text = candidate.content
          .filter((block: any) => block?.type === 'text')
          .map((block: any) => block?.text ?? '')
          .join('');
        if (text) {
          return { role: candidate.role, content: text };
        }
      }
    }
  }
  return null;
};

export const formatMessages = (messages: AgentMessage[], topic?: string) => {
  const formatted = messages
    .filter((message) => Boolean(message.content?.trim()))
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'human',
      content: message.content.trim()
    }));

  if (!formatted.length) {
    formatted.push({
      role: 'human',
      content: topic ?? 'Let us explore a topic together.'
    });
  }

  return formatted;
};

const buildSystemPrompt = (basePrompt: string, deps: AgentToolDeps) => {
  return buildLearnerPrompt(basePrompt, deps.configService);
};

export const createSpecializedAgent = async (deps: AgentToolDeps, options: SpecializedAgentOptions) => {
  const promptBase = options.systemPrompt;
  const prompt = await buildSystemPrompt(promptBase, deps);
  const modelKey = `ai.${options.agentType}AgentModel`;
  const { model: chatModel, settings: providerSettings } = await deps.providerFactory.getModel(modelKey);
  const tools = Object.values(options.toolBuilder(deps));
  const agent = createAgent({
    model: chatModel,
    systemPrompt: prompt,
    tools
  });

  const specializedAgent = agent as SpecializedAgent;
  specializedAgent.providerSettings = providerSettings;

  return specializedAgent;
};

type LangChainAgent = ReturnType<typeof createAgent>;
export type SpecializedAgent = LangChainAgent & {
  providerSettings: ProviderSettings;
};
