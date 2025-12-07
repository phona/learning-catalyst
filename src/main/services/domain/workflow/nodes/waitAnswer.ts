/**
 * Workflow Node: WAIT ANSWER (Checkpoint)
 *
 * Mermaid Mapping (Line 15): "Wait for User Answers (checkpoint)"
 *                   and (Line 44): "Wait for User Answer (checkpoint)"
 * Part of Path A: Fast Track and Path B: Standard Learning Loop
 *
 * Flow Context:
 * Two usage contexts:
 * 1. Fast Track (Line 15):
 *    - Triggered after: PresentDiag (Practice Agent: Present Diagnostic Quiz)
 *    - Triggers: Grade (Assessment Agent: Grade & Analyze Gaps)
 *    - Timeout triggers: StrategyChange (Suggest Break / Handoff)
 *
 * 2. Standard Learning (Line 44):
 *    - Triggered after: PresentProblem (Practice Agent: Present Problem)
 *    - Triggers: Eval (Assessment Agent: Evaluate)
 *    - Timeout triggers: StrategyChange (Suggest Break / Handoff)
 *
 * Purpose:
 * Implements a checkpoint that pauses workflow to wait for user input by:
 * 1. Presenting the practice question or diagnostic quiz to the user
 * 2. Using LangGraph interrupt mechanism to pause execution
 * 3. Generating a unique question ID for tracking
 * 4. Waiting for user to provide answer
 * 5. Resuming workflow with user's answer
 *
 * Checkpoint Mechanism:
 * - Uses @langchain/langgraph interrupt() to pause workflow
 * - Allows async user interaction outside the graph
 * - Resumes when user submits answer
 * - Handles timeout scenarios (triggers circuit breaker)
 *
 * Outputs:
 * - userAnswer: The answer provided by the user
 * - messages: User message containing the answer
 *
 * Timeout Handling:
 * - If user doesn't respond within timeframe
 * - Triggers StrategyChange → breaker.ts (Circuit Breaker)
 * - Prevents workflow from hanging indefinitely
 *
 * Note:
 * This is a critical checkpoint node that creates natural stopping points
 * in the learning flow, allowing for human input and interaction
 */

import { randomUUID } from 'node:crypto';
import { interrupt } from '@langchain/langgraph';
import { WorkflowStateAnnotation } from '../state';
import { PROMPTS } from '../prompts';

export const waitAnswerNode = (_label: 'quiz' | 'practice') => async (state: typeof WorkflowStateAnnotation.State) => {
  const prompt = state.practicePrompt ?? PROMPTS.DEFAULT_WAIT_PROMPT;
  const questionId = randomUUID();
  const resumeVal = await interrupt({ type: 'await_user_input', prompt, questionId });
  const answer = typeof resumeVal === 'string' ? resumeVal : (resumeVal as any)?.answer ?? (resumeVal as any)?.content ?? '';
  return { userAnswer: answer, messages: [{ role: 'user', content: answer }] };
};
