/**
 * Workflow Node: BREAKER (Circuit Breaker)
 *
 * Mermaid Mapping (Lines 17, 47, 72): "Orchestrator: Suggest Break / Handoff"
 *                     and (Line 73): "Circuit Breaker / Exit"
 * Part of Path D: Circuit Breaker & Remediation
 *
 * Flow Context:
 * - Triggered in three scenarios:
 *   1. Line 17: After WaitDiag timeout (Fast Track diagnostic quiz)
 *   2. Line 47: After WaitAnswer timeout (Standard learning practice)
 *   3. Line 72: After CheckBreaker (Fail Count > 3) returns "Yes"
 *
 * Purpose:
 * Implements circuit breaker pattern to prevent infinite learning loops by:
 * 1. Detecting when user is stuck or failing repeatedly
 * 2. Suggesting a break or handoff to human assistance
 * 3. Using the Tutoring Agent for motivational support
 * 4. Protecting user from frustration and burnout
 *
 * Trigger Conditions:
 * - Multiple timeouts in user input
 * - Excessive failure count (>3 attempts)
 * - User appears stuck or overwhelmed
 *
 * Outputs:
 * - messages: Supportive message from Tutoring Agent
 * - Terminal state: Suggests ending session or seeking help
 *
 * Circuit Breaker Flow:
 * 1. CheckFoundation → No
 * 2. CheckBreaker → Fail Count > 3?
 * 3. If Yes → StrategyChange → EndFail (Circuit Breaker / Exit)
 *
 * Note:
 * Uses Tutoring Agent (not Learning Agent) to provide:
 * - Emotional support and motivation
 * - Suggestions for alternative approaches
 * - Recommendations to take breaks or seek help
 */

import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';
import { AIMessage } from '@langchain/core/messages';

export const breakerNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  const res = await deps.agentManager.runAgent({
    agentType: 'tutoring',
    conversationId: 'workflow',
    messages: state.messages,
    topic: state.topic,
  });
  return { messages: [new AIMessage(res.content)] };
};
