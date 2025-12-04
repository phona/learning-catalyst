import type { AgentToolDeps } from './tool-registry';
import { buildLearningPlannerTools } from './tool-registry';
import {
  createSpecializedAgent,
  SpecializedAgentRequest,
  SpecializedAgentResult,
} from './specialized-agent';

const SYSTEM_PROMPT =
  'You are a learning planner subagent. Your job is to produce a SINGLE-SESSION plan (one sitting) with one primary concept. REQUIRE `level` (novice|intermediate|advanced). If level is missing, respond with an error telling supervisor to run the assessment agent first; do NOT guess. When level is present, call only the tool "session_blueprint" with { topic, goals, level, timeAvailable?, constraints?, allowExternal? }. Do not improvise steps outside the tool output. Return the tool JSON (fenced ```json ... ``` for the user) plus a concise human summary. Keep requests within the provided timeAvailable and level.';

export const createLearningPlannerAgent = (deps: AgentToolDeps) =>
  createSpecializedAgent(deps, {
    agentType: 'learning_planner',
    systemPrompt: SYSTEM_PROMPT,
    toolBuilder: buildLearningPlannerTools,
  });

export type LearningPlannerAgent = Awaited<ReturnType<typeof createLearningPlannerAgent>>;
export type LearningPlannerAgentRequest = SpecializedAgentRequest;
export type LearningPlannerAgentResult = SpecializedAgentResult;
