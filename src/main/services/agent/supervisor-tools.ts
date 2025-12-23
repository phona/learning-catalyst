import { tool, type Tool } from 'langchain';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { ToolRegistry, AgentToolDeps } from './tool-registry';
import { buildKnowledgeTools } from './tool-registry';
import type { AgentType } from './types';

// Helper functions that were previously in specialized-agent.ts
const formatMessages = (messages: any[], topic?: string): any[] => {
  if (topic && messages.length > 0) {
    // Add topic context if provided
    const contextMessage = new HumanMessage(`Topic: ${topic}`);
    return [contextMessage, ...messages];
  }
  return messages;
};

const pickAssistantMessage = (messages: any[]): AIMessage | undefined => {
  return messages.find(msg => msg._getType() === 'ai') as AIMessage | undefined;
};

// Basic SpecializedAgent interface
interface SpecializedAgent {
  invoke(input: { messages: HumanMessage[] | AIMessage[], conversationId?: string, topic?: string, userId?: string }): Promise<{ messages: HumanMessage[] | AIMessage[] }>;
}

type SupervisorToolInput = {
  conversationId?: string;
  topic?: string;
  userId?: string;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  content?: string;
};

const parseJsonInput = <T extends Record<string, unknown>>(raw: string, fallback: T): T => {
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return { ...fallback, ...(parsed as T) } as T;
    }
  } catch {
    if ('content' in fallback) {
      return { ...fallback, content: raw } as T;
    }
  }

  return fallback;
};

const agentDescriptions: Record<Exclude<AgentType, 'supervisor'>, string> = {
  learning:
    'Focuses on concept introduction, explanation, and analogy generation so the learner understands the current topic before moving forward.',
  tutoring:
    'Provides adaptive, multi-modal coaching, asking clarifying questions and encouraging reflection when a learner needs deeper support.',
  // practice - REMOVED (migrated to workflow node)
  // learning_planner - REMOVED (migrated to workflow plan node)
  // assessment - REMOVED (migrated to workflow assess node)
};

const createAgentTool = (agentName: Exclude<AgentType, 'supervisor'>, agent: SpecializedAgent): Tool<string> =>
  tool(
    async (rawInput: string): Promise<string> => {
      const payload = parseJsonInput<SupervisorToolInput>(rawInput, {
        conversationId: undefined,
        topic: undefined,
        userId: undefined,
        messages: undefined,
        content: rawInput,
      });

      const inboundMessages = payload.messages?.filter((entry) => Boolean(entry?.content)) ?? [];
      const langchainMessages = inboundMessages.map((msg) =>
        msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
      );
      const formattedMessages =
        inboundMessages.length > 0
          ? formatMessages(langchainMessages, payload.topic)
          : formatMessages([new HumanMessage(payload.content ?? rawInput)], payload.topic);

      const result = await agent.invoke({
        messages: formattedMessages,
        conversationId: payload.conversationId,
        topic: payload.topic,
        userId: payload.userId,
      });

      const assistantMessage = pickAssistantMessage(result.messages ?? []);
      const content = assistantMessage?.content;
      if (typeof content === 'string') {
        return content;
      }
      return `Agent ${agentName} returned no response.`;
    },
    {
      name: `${agentName}_assistant`,
      description: `Proxy to the ${agentName} agent for task-specific handling. ${agentDescriptions[agentName]}`,
    },
  );

export const buildSupervisorTools = (
  deps: AgentToolDeps,
  agents: Record<Exclude<AgentType, 'supervisor'>, SpecializedAgent>,
): ToolRegistry => {
  return Object.entries(agents).reduce<ToolRegistry>((registry, [name, agent]) => {
    const toolName = `${name}_assistant`;
    registry[toolName] = createAgentTool(name as Exclude<AgentType, 'supervisor'>, agent);
    return registry;
  }, {});
};
