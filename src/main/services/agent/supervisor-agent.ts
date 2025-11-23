import type { AgentToolDeps } from './tool-registry';
import {
  createSpecializedAgent,
  SpecializedAgentRequest,
  SpecializedAgentResult,
} from './specialized-agent';
import type { AgentType } from './types';
import type { SpecializedAgent } from './specialized-agent';
import { buildSupervisorTools } from './supervisor-tools';

const SYSTEM_PROMPT =
  'You are a supervisor. Choose the tool that best fits the user request, call it, and summarize the output for the user.';

export const createSupervisorAgent = (
  deps: AgentToolDeps,
  agents: Record<Exclude<AgentType, 'supervisor'>, SpecializedAgent>,
) =>
  createSpecializedAgent(deps, {
    agentType: 'supervisor',
    systemPrompt: SYSTEM_PROMPT,
    toolBuilder: () => buildSupervisorTools(deps, agents),
  });

export type SupervisorAgent = Awaited<ReturnType<typeof createSupervisorAgent>>;
export type SupervisorAgentRequest = SpecializedAgentRequest;
export type SupervisorAgentResult = SpecializedAgentResult;
