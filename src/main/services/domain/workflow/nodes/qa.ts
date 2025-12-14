/**
 * Workflow Node: QA (Question & Answer Checkpoint with AI SDK Chunk Emission)
 *
 * Mermaid Mapping (Line 36): "User ↔ Learning Agent: Q&A / Clarify"
 * Part of Path B: Standard Learning Loop - Teaching Phase
 *
 * PHILOSOPHY:
 * - Dual emission: chunks for real-time UI streaming + messages for LangGraph history
 * - Direct AI SDK chunk emission for immediate user feedback
 *
 * Flow Context:
 * - Triggered after: Deliver (Learning Agent: Deliver Lesson Content)
 * - Triggers: MicroCheck (Learning Agent: Quick Concept Check)
 *
 * Purpose:
 * Creates an interactive checkpoint for Q&A between user and Learning Agent by:
 * 1. Emitting checkpoint prompt chunks to encourage questions
 * 2. Allowing the user to ask clarifying questions
 * 3. Enabling the Learning Agent to provide additional explanations
 * 4. Building comprehension through dialogue
 *
 * Interactive Loop:
 * - User asks questions about the delivered content
 * - Learning Agent provides clarifications
 * - Continues until user indicates understanding
 *
 * Outputs:
 * - messages: Assistant message with Q&A checkpoint prompt (for LangGraph history)
 * - chunks: text-start, text-delta, text-end (for real-time UI streaming)
 *
 * Flow Progression:
 * 1. Deliver → QA Checkpoint (this node)
 * 2. User asks questions ↔ Learning Agent responds
 * 3. MicroCheck: Does user understand?
 *    - If No → AltExplain (Learning Agent: Explain Differently)
 *    - If Yes → PracticeStart (Practice Agent: Generate Problem)
 *
 * Note:
 * This node represents the conversational, interactive nature of learning
 * - Emphasizes dialogue over passive reception
 * - Allows for personalized clarification
 * - Builds confidence before moving to practice
 */

import { WorkflowStateAnnotation } from '../state';
import { AIMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { createChunkEmitter, generateId } from '../utils/chunk-emitter';

const QA_CHECKPOINT = 'Any questions before we practice?';

export const qaNode = () => async (
  state: typeof WorkflowStateAnnotation.State,
  config: LangGraphRunnableConfig
) => {
  const emitter = createChunkEmitter(config);
  const prompt = QA_CHECKPOINT;

  /**
   * EMIT QA CHECKPOINT CHUNKS:
   * Stream the prompt to encourage questions
   */
  const messageId = generateId('msg');
  emitter.textStart(messageId);
  emitter.textDelta(messageId, prompt);
  emitter.textEnd(messageId);

  return { messages: [new AIMessage(prompt)] };
};
