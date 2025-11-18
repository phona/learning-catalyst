import type { AgentToolDeps } from './tool-registry';
import { buildAssessmentTools } from './tool-registry';
import { createSpecializedAgent, SpecializedAgentRequest, SpecializedAgentResult } from './specialized-agent';

const SYSTEM_PROMPT =
  'You are an assessment specialist. Provide structured questions, evaluate answers, and deliver feedback.';

export const createAssessmentAgent = (deps: AgentToolDeps) =>
  createSpecializedAgent(deps, {
    agentType: 'assessment',
    systemPrompt: SYSTEM_PROMPT,
    toolBuilder: buildAssessmentTools
  });

export type AssessmentAgent = Awaited<ReturnType<typeof createAssessmentAgent>>;
export type AssessmentAgentRequest = SpecializedAgentRequest;
export type AssessmentAgentResult = SpecializedAgentResult;
