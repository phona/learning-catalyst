/**
 * Teach Subgraph Module
 *
 * Exports the teach subgraph for use in the main workflow.
 *
 * Flow:
 * ```
 * EXPLAIN → (interrupt) → CLASSIFY_RESPONSE
 *   → question/confused → HANDLE_QUESTION → (loop to CLASSIFY_RESPONSE)
 *   → ready → ASSESS_UNDERSTANDING → mastered? END : EXPLAIN
 *   → needs_more → EXPLAIN (loop)
 * ```
 */

// Subgraph factory and types
export { createTeachSubgraph, TeachNodeName } from './graph';
export type { TeachSubgraph } from './graph';

// State and types
export { TeachAnnotation, teachStateReducer } from './state';
export type { TeachSubgraphState } from './state';
export { DEFAULT_TEACH_STATE } from './types';
export type { TeachIntent, TeachState } from './types';

// Individual nodes (for testing)
export { explainNode } from './nodes/explain';
export { classifyResponseNode } from './nodes/classifyResponse';
export { handleQuestionNode } from './nodes/handleQuestion';
export { assessUnderstandingNode } from './nodes/assessUnderstanding';
