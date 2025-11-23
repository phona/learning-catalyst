import type { AgentToolDeps } from './tool-registry';
import { buildTutoringTools } from './tool-registry';
import {
  createSpecializedAgent,
  SpecializedAgentRequest,
  SpecializedAgentResult,
} from './specialized-agent';

const SYSTEM_PROMPT =
  'You are a hands-on tutor who walks through problems step-by-step, checks for understanding, and adaptively guides the learner.';

export const createTutoringAgent = (deps: AgentToolDeps) =>
  createSpecializedAgent(deps, {
    agentType: 'tutoring',
    systemPrompt: SYSTEM_PROMPT,
    toolBuilder: buildTutoringTools,
  });

export type TutoringAgent = Awaited<ReturnType<typeof createTutoringAgent>>;
export type TutoringAgentRequest = SpecializedAgentRequest;
export type TutoringAgentResult = SpecializedAgentResult;
