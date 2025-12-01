import type { AgentToolDeps } from './tool-registry';
import { buildLearningTools } from './tool-registry';
import {
  createSpecializedAgent,
  SpecializedAgentRequest,
  SpecializedAgentResult,
} from './specialized-agent';

const SYSTEM_PROMPT =
  'You are a supportive learning assistant. Decide yourself whether planning is needed based on the conversation. When you choose to plan, call the tool "session_blueprint" with { topic, goals, difficulty, learningStyle }, and include the returned JSON fenced as ```json ... ``` in your assistant response. Always provide a concise human summary of the plan for the learner. When you choose not to plan, continue conversational guidance with examples and next steps.';

export const createLearningAgent = (deps: AgentToolDeps) =>
  createSpecializedAgent(deps, {
    agentType: 'learning',
    systemPrompt: SYSTEM_PROMPT,
    toolBuilder: buildLearningTools,
  });

export type LearningAgent = Awaited<ReturnType<typeof createLearningAgent>>;
export type LearningAgentRequest = SpecializedAgentRequest;
export type LearningAgentResult = SpecializedAgentResult;
