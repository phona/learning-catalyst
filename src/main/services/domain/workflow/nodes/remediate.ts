/**
 * Workflow Node: REMEDIATE
 *
 * Mermaid Mapping (Line 67): "Learning Agent: Re-Teach Concept"
 * Part of Path C: Remediation (Missing Foundation)
 *
 * Flow Context:
 * - Triggered after: Recurse (Orchestrator: Recursive Execute Module Y)
 * - Triggers: PracticeStart (Practice Agent: Generate Problem)
 *
 * Purpose:
 * Re-teaches foundational concepts after detecting knowledge gaps by:
 * 1. Injecting prerequisite module content
 * 2. Using the Learning Agent to re-explain concepts
 * 3. Providing alternative teaching strategies
 * 4. Addressing the specific gaps identified in assessment
 *
 * Trigger Conditions:
 * - Occurs when CheckFoundation (Line 62) returns "Yes"
 * - Indicates missing prerequisite knowledge
 * - Requires recursive execution of prerequisite module
 *
 * Flow Progression:
 * 1. Missing foundation detected → InjectPrereq → Recurse
 * 2. Recurse completes → Re-teach the concept
 * 3. Return to practice with reinforced understanding
 *
 * Note:
 * This node delegates to the Learning Agent, similar to teach.ts,
 * but represents a specific remediation context after foundation injection
 */

import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';
import { AIMessage } from '@langchain/core/messages';

export const remediateNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  const res = await deps.agentManager.runAgent({
    agentType: 'learning',
    conversationId: 'workflow',
    messages: state.messages,
    topic: state.topic,
  });
  return { messages: [new AIMessage(res.content)] };
};
