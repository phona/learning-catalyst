import type { AgentToolDeps } from './tool-registry';
import {
  createSpecializedAgent,
  SpecializedAgentRequest,
  SpecializedAgentResult,
} from './specialized-agent';
import type { AgentType } from './types';
import type { SpecializedAgent } from './specialized-agent';
import { buildSupervisorTools } from './supervisor-tools';

const SYSTEM_PROMPT = `You are the supervisor. Route work to the right sub‑agent with minimal tool calls.

Planning (plan/session/blueprint/path/todos):
- Use level ONLY (novice|intermediate|advanced). Never use "difficulty".
- If level is missing, use the workflow assess node to analyze user readiness and determine level.
- After assessment returns a level, use the workflow plan node to create a session blueprint.
- If assessment returns level "unknown" or fails, ask the user for level or more practice evidence; do NOT plan without level.

Other routing:
- Explanations: "learning_assistant".
- Coaching/guidance: "tutoring_assistant".
- Mastery checks are now handled by the workflow assess node.

Always include the user goal/concepts when routing work. Avoid redundant tool calls. Summarize final results for the user.`;

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
