/**
 * Workflow Node: REMEDIATE (with AI SDK Chunk Emission)
 *
 * Mermaid Mapping (Line 67): "Learning Agent: Re-Teach Concept"
 * Part of Path C: Remediation (Missing Foundation)
 *
 * PHILOSOPHY:
 * - Dual emission: chunks for real-time UI streaming + messages for LangGraph history
 * - Direct AI SDK chunk emission for immediate user feedback
 *
 * Flow Context:
 * - Triggered after: Recurse (Orchestrator: Recursive Execute Module Y)
 * - Triggers: PracticeStart (Practice Agent: Generate Problem)
 *
 * Purpose:
 * Re-teaches foundational concepts after detecting knowledge gaps by:
 * 1. Calling Learning Agent to re-explain concepts
 * 2. Emitting chunks for real-time streaming of explanations
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
 * Outputs:
 * - messages: Assistant message with remediation content (for LangGraph history)
 * - chunks: text-start, text-delta, text-end (for real-time UI streaming)
 *
 * Note:
 * This node delegates to the Learning Agent, similar to teach.ts,
 * but represents a specific remediation context after foundation injection
 */

import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';
import { AIMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { createChunkEmitter, generateId } from '../utils/chunk-emitter';

export const remediateNode = (deps: WorkflowDeps) => async (
  state: typeof WorkflowStateAnnotation.State,
  config: LangGraphRunnableConfig
) => {
  const emitter = createChunkEmitter(config);

  const res = await deps.agentManager.runAgent({
    agentType: 'learning',
    conversationId: 'workflow',
    messages: state.messages,
    topic: state.topic,
  });

  /**
   * EMIT REMEDIATION CHUNKS:
   * Stream the re-teaching content to the user
   */
  const messageId = generateId('msg');
  emitter.textStart(messageId);
  emitter.textDelta(messageId, res.content);
  emitter.textEnd(messageId);

  return { messages: [new AIMessage(res.content)] };
};
