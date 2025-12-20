/**
 * Practice Subgraph
 *
 * A conversational practice flow that handles:
 * - Question generation
 * - Intent classification (answer vs hints vs clarification)
 * - Conversation handling (hints, clarifications, encouragement)
 * - Answer grading
 * - Failure detection and circuit breaking
 * - Targeted remediation
 *
 * Flow:
 * ```
 * ASK_QUESTION → CLASSIFY_INTENT
 *   → answer_attempt → GRADE_ANSWER → FAILURE_DETECTOR
 *     → success → END
 *     → circuit_breaker → CIRCUIT_BREAKER → END
 *     → needs_remediation → REMEDIATE_PRACTICE → ASK_QUESTION
 *     → continue → ASK_QUESTION
 *   → other intents → HANDLE_CONVERSATION → (loop back to CLASSIFY_INTENT)
 *   → give_up (in HANDLE_CONVERSATION) → END
 * ```
 *
 * Enhanced with failure handling:
 * - detectFailure: Analyzes mastery and failure patterns
 * - circuitBreaker: Provides support when user struggles excessively
 * - remediatePractice: Re-teaches gaps before continuing
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import type { WorkflowDeps } from '../../state';
import { PracticeAnnotation } from './state';
import { askQuestionNode } from './nodes/askQuestion';
import { classifyIntentNode } from './nodes/classifyIntent';
import { handleConversationNode } from './nodes/handleConversation';
import { gradeAnswerNode } from './nodes/gradeAnswer';
import { detectFailureNode } from './nodes/detectFailure';
import { circuitBreakerNode } from './nodes/circuitBreaker';
import { remediatePracticeNode } from './nodes/remediatePractice';

/**
 * Practice subgraph node names
 */
export enum PracticeNodeName {
  ASK_QUESTION = 'AskQuestion',
  CLASSIFY_INTENT = 'ClassifyIntent',
  HANDLE_CONVERSATION = 'HandleConversation',
  GRADE_ANSWER = 'GradeAnswer',
  FAILURE_DETECTOR = 'FailureDetector',
  CIRCUIT_BREAKER = 'CircuitBreaker',
  REMEDIATE_PRACTICE = 'RemediatePractice',
}

/**
 * Create the practice subgraph
 *
 * This graph is used as a node in the main workflow graph.
 * It shares the same state annotation as the parent graph.
 *
 * @param deps - Workflow dependencies (services, factories, etc.)
 * @returns Compiled practice subgraph
 */
export const createPracticeSubgraph = (deps: WorkflowDeps) => {
  const graph = new StateGraph(PracticeAnnotation)
    // Add nodes
    .addNode(PracticeNodeName.ASK_QUESTION, askQuestionNode(deps))
    .addNode(PracticeNodeName.CLASSIFY_INTENT, classifyIntentNode(deps))
    .addNode(PracticeNodeName.HANDLE_CONVERSATION, handleConversationNode(deps))
    .addNode(PracticeNodeName.GRADE_ANSWER, gradeAnswerNode(deps))
    .addNode(PracticeNodeName.FAILURE_DETECTOR, detectFailureNode(deps))
    .addNode(PracticeNodeName.CIRCUIT_BREAKER, circuitBreakerNode(deps))
    .addNode(PracticeNodeName.REMEDIATE_PRACTICE, remediatePracticeNode(deps))

    // Entry: Start with asking a question
    .addEdge(START, PracticeNodeName.ASK_QUESTION)

    // After asking, classify the user's response
    .addEdge(PracticeNodeName.ASK_QUESTION, PracticeNodeName.CLASSIFY_INTENT)

    // After grading, analyze for failures
    .addEdge(PracticeNodeName.GRADE_ANSWER, PracticeNodeName.FAILURE_DETECTOR)

    // After failure detection, route appropriately
    .addConditionalEdges(
      PracticeNodeName.FAILURE_DETECTOR,
      (state) => {
        const practice = state.practice!;

        // Success - exit the practice subgraph
        if (practice.isComplete && !practice.shouldCircuitBreak) {
          return END;
        }

        // Circuit breaker triggered - provide support then exit
        if (practice.shouldCircuitBreak) {
          return PracticeNodeName.CIRCUIT_BREAKER;
        }

        // Needs remediation - re-teach then continue
        if (practice.needsRemediation) {
          return PracticeNodeName.REMEDIATE_PRACTICE;
        }

        // Continue practice with next question
        return PracticeNodeName.ASK_QUESTION;
      },
      {
        [END]: END,
        [PracticeNodeName.CIRCUIT_BREAKER]: PracticeNodeName.CIRCUIT_BREAKER,
        [PracticeNodeName.REMEDIATE_PRACTICE]: PracticeNodeName.REMEDIATE_PRACTICE,
        [PracticeNodeName.ASK_QUESTION]: PracticeNodeName.ASK_QUESTION,
      }
    )

    // After circuit breaker, exit the subgraph
    .addEdge(PracticeNodeName.CIRCUIT_BREAKER, END)

    // After remediation, continue with next question
    .addEdge(PracticeNodeName.REMEDIATE_PRACTICE, PracticeNodeName.ASK_QUESTION)

    // Route based on classified intent
    .addConditionalEdges(
      PracticeNodeName.CLASSIFY_INTENT,
      (state) => {
        const intent = state.practice?.userIntent;

        // If user is attempting to answer, grade it
        if (intent === 'answer_attempt') {
          return PracticeNodeName.GRADE_ANSWER;
        }

        // All other intents go to conversation handler
        return PracticeNodeName.HANDLE_CONVERSATION;
      },
      {
        [PracticeNodeName.GRADE_ANSWER]: PracticeNodeName.GRADE_ANSWER,
        [PracticeNodeName.HANDLE_CONVERSATION]: PracticeNodeName.HANDLE_CONVERSATION,
      }
    )

    // After conversation handling, either exit or loop back
    .addConditionalEdges(
      PracticeNodeName.HANDLE_CONVERSATION,
      (state) => {
        // If user gave up or practice is complete, exit
        if (state.practice?.isComplete) {
          return END;
        }

        // Otherwise, classify the new response
        return PracticeNodeName.CLASSIFY_INTENT;
      },
      {
        [END]: END,
        [PracticeNodeName.CLASSIFY_INTENT]: PracticeNodeName.CLASSIFY_INTENT,
      }
    );

  // Compile WITHOUT checkpointer - parent graph handles checkpointing
  return graph.compile();
};

export type PracticeSubgraph = ReturnType<typeof createPracticeSubgraph>;
