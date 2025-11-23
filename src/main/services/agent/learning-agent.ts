import type { AgentToolDeps } from './tool-registry';
import { buildLearningTools } from './tool-registry';
import {
  createSpecializedAgent,
  SpecializedAgentRequest,
  SpecializedAgentResult,
} from './specialized-agent';

const SYSTEM_PROMPT =
  'You are a supportive learning assistant. Help learners understand concepts, connect ideas, and recommend next steps.';

export const createLearningAgent = (deps: AgentToolDeps) =>
  createSpecializedAgent(deps, {
    agentType: 'learning',
    systemPrompt: SYSTEM_PROMPT,
    toolBuilder: buildLearningTools,
  });

export type LearningAgent = Awaited<ReturnType<typeof createLearningAgent>>;
export type LearningAgentRequest = SpecializedAgentRequest;
export type LearningAgentResult = SpecializedAgentResult;
