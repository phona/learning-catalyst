/**
 * Teach Subgraph
 *
 * A conversational teaching flow that handles:
 * - Initial explanation
 * - Intent classification (question/ready/confused/needs_more)
 * - Question handling
 * - Understanding assessment
 *
 * Flow:
 * ```
 * EXPLAIN → (interrupt) → CLASSIFY_RESPONSE
 *   → question/confused → HANDLE_QUESTION → (loop to CLASSIFY_RESPONSE)
 *   → ready → ASSESS_UNDERSTANDING → mastered? END : EXPLAIN
 *   → needs_more → EXPLAIN (loop)
 * ```
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import type { WorkflowDeps } from '../../state';
import { TeachAnnotation } from './state';
import { explainNode } from './nodes/explain';
import { classifyResponseNode } from './nodes/classifyResponse';
import { handleQuestionNode } from './nodes/handleQuestion';
import { assessUnderstandingNode } from './nodes/assessUnderstanding';

/**
 * Teach subgraph node names
 */
export enum TeachNodeName {
  EXPLAIN = 'Explain',
  CLASSIFY_RESPONSE = 'ClassifyResponse',
  HANDLE_QUESTION = 'HandleQuestion',
  ASSESS_UNDERSTANDING = 'AssessUnderstanding',
}

/**
 * Create the teach subgraph
 *
 * This graph is used as a node in the main workflow graph.
 * Uses its own TeachAnnotation with shared keys for auto-mapping.
 *
 * @param deps - Workflow dependencies (services, factories, etc.)
 * @returns Compiled teach subgraph
 */
export const createTeachSubgraph = (deps: WorkflowDeps) => {
  const graph = new StateGraph(TeachAnnotation)
    // Add nodes
    .addNode(TeachNodeName.EXPLAIN, explainNode(deps))
    .addNode(TeachNodeName.CLASSIFY_RESPONSE, classifyResponseNode(deps))
    .addNode(TeachNodeName.HANDLE_QUESTION, handleQuestionNode(deps))
    .addNode(TeachNodeName.ASSESS_UNDERSTANDING, assessUnderstandingNode(deps))

    // Entry: Start with explanation
    .addEdge(START, TeachNodeName.EXPLAIN)

    // After explaining, classify user response
    .addEdge(TeachNodeName.EXPLAIN, TeachNodeName.CLASSIFY_RESPONSE)

    // After handling question, loop back to classify
    .addEdge(TeachNodeName.HANDLE_QUESTION, TeachNodeName.CLASSIFY_RESPONSE)

    // Route based on classified intent
    .addConditionalEdges(
      TeachNodeName.CLASSIFY_RESPONSE,
      (state) => {
        const intent = state.teach?.teachIntent;

        switch (intent) {
        case 'ready':
          return TeachNodeName.ASSESS_UNDERSTANDING;
        case 'question':
        case 'confused':
          return TeachNodeName.HANDLE_QUESTION;
        case 'needs_more':
          return TeachNodeName.EXPLAIN;
        default:
          // Default to handling as a question
          return TeachNodeName.HANDLE_QUESTION;
        }
      },
      {
        [TeachNodeName.ASSESS_UNDERSTANDING]: TeachNodeName.ASSESS_UNDERSTANDING,
        [TeachNodeName.HANDLE_QUESTION]: TeachNodeName.HANDLE_QUESTION,
        [TeachNodeName.EXPLAIN]: TeachNodeName.EXPLAIN,
      }
    )

    // After assessment, either exit (mastered) or loop back to explain
    .addConditionalEdges(
      TeachNodeName.ASSESS_UNDERSTANDING,
      (state) => {
        // Mastered → exit subgraph
        if (state.teach?.mastered) {
          return END;
        }

        // Max rounds reached → exit anyway
        if (state.teach?.teachingRound >= (state.teach?.maxRounds ?? 5)) {
          return END;
        }

        // Continue teaching with identified gaps
        return TeachNodeName.EXPLAIN;
      },
      {
        [END]: END,
        [TeachNodeName.EXPLAIN]: TeachNodeName.EXPLAIN,
      }
    );

  // Compile WITHOUT checkpointer - parent graph handles checkpointing
  return graph.compile();
};

export type TeachSubgraph = ReturnType<typeof createTeachSubgraph>;
