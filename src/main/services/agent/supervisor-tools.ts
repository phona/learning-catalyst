import { tool } from 'langchain';
import type { ToolRegistry, AgentToolDeps } from './tool-registry';
import { buildKnowledgeTools } from './tool-registry';
import { formatMessages, pickAssistantMessage } from './specialized-agent';
import type { SpecializedAgent } from './specialized-agent';
import type { AgentType } from './types';

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
  assessment:
    'Constructs and evaluates quizzes/exercises, interprets responses via rubrics, and outputs structured feedback for mastery checks.',
  practice:
    'Generates practice challenges or drills that reinforce the learner’s recent concepts, monitors attempts, and surfaces retry suggestions.',
};

const createAgentTool = (agentName: Exclude<AgentType, 'supervisor'>, agent: SpecializedAgent) =>
  tool(
    async (rawInput: string) => {
      const payload = parseJsonInput<SupervisorToolInput>(rawInput, {
        conversationId: undefined,
        topic: undefined,
        userId: undefined,
        messages: undefined,
        content: rawInput,
      });

      const inboundMessages = payload.messages?.filter((entry) => Boolean(entry?.content)) ?? [];
      const formattedMessages =
        inboundMessages.length > 0
          ? formatMessages(inboundMessages, payload.topic)
          : formatMessages([{ role: 'user', content: payload.content ?? rawInput }], payload.topic);

      const result = await agent.invoke({
        messages: formattedMessages,
        conversationId: payload.conversationId,
        topic: payload.topic,
        userId: payload.userId,
      });

      const assistantMessage = pickAssistantMessage(result.messages ?? []);
      return assistantMessage?.content ?? `Agent ${agentName} returned no response.`;
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
