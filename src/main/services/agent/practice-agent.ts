import type { AgentToolDeps } from './tool-registry';
import { buildPracticeTools } from './tool-registry';
import {
  createSpecializedAgent,
  SpecializedAgentRequest,
  SpecializedAgentResult,
} from './specialized-agent';

const SYSTEM_PROMPT =
  'You are a practice coach. Provide actionable drills and walk through solutions so the learner can build confidence.';

export const createPracticeAgent = (deps: AgentToolDeps) =>
  createSpecializedAgent(deps, {
    agentType: 'practice',
    systemPrompt: SYSTEM_PROMPT,
    toolBuilder: buildPracticeTools,
  });

export type PracticeAgent = Awaited<ReturnType<typeof createPracticeAgent>>;
export type PracticeAgentRequest = SpecializedAgentRequest;
export type PracticeAgentResult = SpecializedAgentResult;
