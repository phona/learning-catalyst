/**
 * Workflow Node: TEACH
 *
 * Mermaid Mapping (Line 35): "Learning Agent: Deliver Lesson Content"
 *              and (Line 67): "Learning Agent: Re-Teach Concept"
 * Part of Path B: Standard Learning Loop and Path C: Remediation
 *
 * Flow Context:
 * - Primary Use (Line 35):
 *   - Triggered after: SelectStrategy (Orchestrator: Select Strategy)
 *   - Triggers: Dialogue (User ↔ Learning Agent: Q&A / Clarify)
 * - Remediation Use (Line 67):
 *   - Triggered after: Recurse (Orchestrator: Recursive Execute Module Y)
 *   - Triggers: PracticeStart (Practice Agent: Generate Problem)
 *
 * Purpose:
 * Delivers personalized learning content through the Learning Agent, which:
 * - Adapts teaching strategy based on user profile (visual/text/interactive)
 * - Engages in conversational Q&A with the user
 * - Provides alternative explanations if concepts aren't grasped
 * - Builds knowledge through guided discovery
 *
 * Used in Two Scenarios:
 * 1. Standard Learning: Initial content delivery
 * 2. Remediation: Re-teaching after foundation gaps detected
 */

import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';
import { AIMessage } from '@langchain/core/messages';

export const teachNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  const res = await deps.agentManager.runAgent({
    agentType: 'learning',
    conversationId: 'workflow',
    messages: state.messages,
    topic: state.topic,
  });
  return { messages: [new AIMessage(res.content)] };
};
