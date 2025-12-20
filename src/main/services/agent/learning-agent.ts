import type { AgentToolDeps } from './tool-registry';
import { buildLearningTools } from './tool-registry';
import {
  createSpecializedAgent,
  SpecializedAgentRequest,
  SpecializedAgentResult,
} from './specialized-agent';

const SYSTEM_PROMPT =
  'You are a supportive learning assistant. ' +
  'Collect context and explain concepts conversationally. ' +
  'Do NOT create session plans or call planning tools. ' +
  'If the user explicitly asks for a plan/blueprint/todo list, ' +
  'tell them you will hand off to the planner agent; ' +
  'otherwise continue with explanations, examples, and next steps.';

export const createLearningAgent = (deps: AgentToolDeps) =>
  createSpecializedAgent(deps, {
    agentType: 'learning',
    systemPrompt: SYSTEM_PROMPT,
    toolBuilder: buildLearningTools,
  });

export type LearningAgent = Awaited<ReturnType<typeof createLearningAgent>>;
export type LearningAgentRequest = SpecializedAgentRequest;
export type LearningAgentResult = SpecializedAgentResult;
