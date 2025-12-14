/**
 * Workflow Node: COMPLETE (with AI SDK Chunk Emission)
 *
 * Mermaid Mapping (Line 19): "Orchestrator: Module Complete / Expert"
 * Terminal Node - End of Learning Journey
 *
 * PHILOSOPHY:
 * - Dual emission: chunks for real-time UI streaming + messages for LangGraph history
 * - Direct AI SDK chunk emission for immediate user feedback
 *
 * Flow Context:
 * - Triggered after: CheckMastery (Orchestrator: Mastery > 90%?) - when "Yes"
 * - Alternative trigger: NextTopic (Orchestrator: More Topics?) - when "No"
 * - This is the SUCCESS terminal state
 *
 * Purpose:
 * Marks successful completion of the learning module by:
 * 1. Generating a completion summary using pre-defined prompts
 * 2. Emitting completion chunks for immediate celebration
 * 3. Celebrating the learner's achievement
 * 4. Providing a sense of accomplishment and progress
 * 5. Signaling the end of the current learning session
 *
 * Outputs:
 * - messages: Assistant message with completion summary and congratulations (for LangGraph history)
 * - chunks: text-start, text-delta, text-end (for real-time UI streaming)
 *
 * Flow Termination:
 * - This node represents successful mastery of the topic
 * - No further workflow transitions occur
 * - User can either:
 *   a) Start a new module (return to Start)
 *   b) End the session
 *
 * Success Criteria:
 * - Mastery score >= 90%
 * - All learning objectives achieved
 * - Ready for advancement or completion
 */

import { WorkflowStateAnnotation } from '../state';
import { AIMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { createChunkEmitter, generateId } from '../utils/chunk-emitter';


const COMPLETE_SUMMARY = 'Great work! You have completed this topic. Want to schedule a spaced review?';

export const completeNode = () => async (
  state: typeof WorkflowStateAnnotation.State,
  config: LangGraphRunnableConfig
) => {
  const emitter = createChunkEmitter(config);
  const summary = COMPLETE_SUMMARY;

  /**
   * EMIT COMPLETION CHUNKS:
   * Stream the completion celebration to the user
   */
  const messageId = generateId('msg');
  emitter.textStart(messageId);
  emitter.textDelta(messageId, summary);
  emitter.textEnd(messageId);

  return { messages: [new AIMessage(summary)] };
};
