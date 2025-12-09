/**
 * Workflow Node: EVALUATE
 *
 * Mermaid Mapping (Line 46): "Assessment Agent: Evaluate"
 * Part of Path B: Standard Learning Loop
 *
 * Flow Context:
 * - Triggered after: UserAnswer (User: Answer) which comes from WaitAnswer checkpoint
 * - Triggers: Branching based on evaluation result:
 *   - If Correct: MasteryCheck (Assessment Agent: Mastery Pulse Check?)
 *   - If Incorrect: LogFail (Orchestrator: Log Error) → Path C/D: Remediation
 *
 * Purpose:
 * Evaluates user's practice answer by:
 * 1. Collecting the question (practicePrompt) and user answer
 * 2. Using AI model to grade the response
 * 3. Parsing score from AI response (expects "Score: NN%" format)
 * 4. Calculating mastery percentage (0.0-1.0)
 * 5. Tracking attempt count for circuit breaker logic
 *
 * Outputs:
 * - mastery: Score from 0.0 to 1.0
 * - attemptCount: Incremented attempt counter
 * - messages: Assistant message with evaluation feedback
 *
 * Decision Impact:
 * - High mastery → Continue to next topic or complete
 * - Low mastery → Trigger remediation paths
 */

import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';
import { parseScore } from '../parse-score';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

export const evaluateNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  const { model } = await deps.providerFactory.getModel('chat');
  const question = state.practicePrompt ?? '';
  const answer = state.userAnswer ?? '';
  const prompt = `Grade the user's answer for topic: ${state.topic}. Question: ${question}. Answer: ${answer}. Return "Score: NN%" only.`;
  const res = await model.invoke([new HumanMessage(prompt)]);
  const content = String(res.content ?? res ?? '');
  const mastery = parseScore(content) ?? state.mastery ?? 0.5;
  const attemptCount = (state.attemptCount ?? 0) + 1;
  return { mastery, attemptCount, messages: [new AIMessage(content)] };
};
