import { createAgent } from 'langchain';
import type { AgentToolDeps, ToolRegistry } from './tool-registry';
import { buildLearnerPrompt, type ProviderSettings } from './provider-utils';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';

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

type ContentBlock = {
  type?: string;
  text?: string;
  output_text?: string;
  input_text?: string;
};

export type AgentCandidateMessage = {
  role?: string;
  type?: string;
  content?: string | Array<ContentBlock | string>;
  text?: string;
};

const extractTextFromContentBlocks = (blocks: Array<ContentBlock | string>): string => {
  return blocks
    .map((block) => {
      if (typeof block === 'string') return block;
      if (!block) return '';
      if (typeof block.text === 'string') return block.text;
      if (typeof block.output_text === 'string') return block.output_text;
      if (typeof block.input_text === 'string') return block.input_text;
      return '';
    })
    .join('')
    .trim();
};

export const pickAssistantMessage = (messages: AgentCandidateMessage[]) => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const candidate = messages[i];
    if (!candidate) continue;

    const role = candidate.role ?? candidate.type;
    if (role !== 'assistant' && role !== 'ai') continue;

    const content = candidate.content;

    if (typeof content === 'string' && content.trim()) {
      return { role, content: content.trim() };
    }

    if (Array.isArray(content)) {
      const text = extractTextFromContentBlocks(content);

      if (text) {
        return { role, content: text };
      }
    }

    const fallbackText = candidate.text;
    if (typeof fallbackText === 'string' && fallbackText.trim()) {
      return { role, content: fallbackText.trim() };
    }
  }
  return null;
};

export const formatMessages = (messages: BaseMessage[], topic?: string) => {
  // Convert BaseMessage[] to AgentMessage format using instanceof for type checking
  const agentMessages: AgentMessage[] = messages.map((msg) => {
    // Determine role using instanceof (more reliable than private _getType method)
    const role = msg instanceof AIMessage ? 'ai' :
                 msg instanceof HumanMessage ? 'human' :
                 msg instanceof SystemMessage ? 'system' :
                 msg instanceof ToolMessage ? 'tool' : 'unknown';
    return {
      role: role === 'ai' ? 'assistant' : 'user',
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    };
  });

  const formatted = agentMessages
    .filter((message) => Boolean(message.content?.trim()))
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'human',
      content: message.content.trim(),
    }));

  if (!formatted.length) {
    formatted.push({
      role: 'human',
      content: topic ?? 'Let us explore a topic together.',
    });
  }

  return formatted;
};

const buildSystemPrompt = (basePrompt: string, deps: AgentToolDeps) => {
  return buildLearnerPrompt(basePrompt, deps.configService);
};

export const createSpecializedAgent = async (
  deps: AgentToolDeps,
  options: SpecializedAgentOptions,
) => {
  const promptBase = options.systemPrompt;
  const prompt = await buildSystemPrompt(promptBase, deps);
  const modelKey = `ai.${options.agentType}AgentModel`;
  const { model: chatModel, settings: providerSettings } =
    await deps.providerFactory.getModel(modelKey);
  const tools = Object.values(options.toolBuilder(deps));
  const agent = createAgent({
    model: chatModel,
    systemPrompt: prompt,
    tools,
  });

  const specializedAgent = agent as SpecializedAgent;
  specializedAgent.providerSettings = providerSettings;

  return specializedAgent;
};

type LangChainAgent = ReturnType<typeof createAgent>;
export type SpecializedAgent = LangChainAgent & {
  providerSettings: ProviderSettings;
};
