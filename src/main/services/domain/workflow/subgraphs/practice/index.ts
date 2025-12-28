/**
 * Practice Subgraph Module
 *
 * Exports the practice subgraph for use in the main workflow.
 *
 * Flow:
 * ```
 * ASK_QUESTION → (interrupt) → CLASSIFY_INTENT
 *   → answer_attempt → GRADE_ANSWER → END
 *   → other intents → HANDLE_CONVERSATION → (loop back to CLASSIFY_INTENT)
 *   → give_up (in HANDLE_CONVERSATION) → END
 * ```
 */

// Subgraph factory and types
export { createPracticeSubgraph, PracticeNodeName } from './graph';
export type { PracticeSubgraph } from './graph';

// State and types
export { PracticeAnnotation, practiceStateReducer } from './state';
export type { PracticeSubgraphState } from './state';
export { DEFAULT_PRACTICE_STATE } from './types';
export type { UserIntent, PracticeState } from './types';

// Individual nodes (for testing)
export { askQuestionNode } from './nodes/askQuestion';
export { classifyIntentNode } from './nodes/classifyIntent';
export { handleConversationNode } from './nodes/handleConversation';
export { gradeAnswerNode } from './nodes/gradeAnswer';
