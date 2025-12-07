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
- If level is missing, FIRST call "assessment_assistant" with goal + concepts (+priorLevel if known). The assessment agent fetches its own evidence; you just pass goal/concepts in the tool call message.
- After assessment returns a level, call "learning_planner_assistant" with topic/goal/level/timeAvailable/constraints.
- If assessment returns level "unknown" or fails, ask the user for level or more practice evidence; do NOT call the planner without level.

Other routing:
- Explanations: "learning_assistant".
- Coaching/guidance: "tutoring_assistant".
- Mastery checks: "assessment_assistant".

Always include the user goal/concepts when asking assessment to run. Avoid redundant tool calls. Summarize final results for the user.`;

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
