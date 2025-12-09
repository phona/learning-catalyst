/**
 * Workflow Node: GRADE QUIZ
 *
 * Mermaid Mapping (Line 16): "Assessment Agent: Grade & Analyze Gaps"
 * Part of Path A: Fast Track Assessment
 *
 * Flow Context:
 * - Triggered after: WaitDiag (Wait for User Answers checkpoint)
 * - Triggers: CheckMastery (Orchestrator: Mastery > 90%?)
 *
 * Purpose:
 * Grades the diagnostic quiz and analyzes knowledge gaps by:
 * 1. Collecting the diagnostic quiz question and user's answer
 * 2. Using AI to grade the response against the topic
 * 3. Parsing the score from AI feedback (expects "Score: NN%" format)
 * 4. Calculating mastery percentage (0.0-1.0)
 * 5. Preparing for mastery threshold decision
 *
 * Fast Track Decision Point:
 * - Grading results feed into CheckMastery decision
 * - If mastery >= 90% → Module Complete / Expert
 * - If mastery < 90% → Update Learning Plan (Gap-Focused)
 *
 * Flow Progression:
 * 1. DiagAssess → PresentDiag → WaitDiag
 * 2. WaitDiag -- Answer --> Grade (this node)
 * 3. CheckMastery:
 *    - If Yes → Complete
 *    - If No → PlanUpdate → StandardStart
 *
 * Diagnostic Analysis Goals:
 * - Identify specific knowledge gaps revealed by quiz
 * - Provide objective measure of understanding
 * - Make data-driven decision about learning path
 * - Personalize subsequent learning based on results
 *
 * Outputs:
 * - mastery: Score from 0.0 to 1.0
 * - messages: Assistant message with grading feedback
 *
 * Note:
 * Similar to evaluate.ts but specific to diagnostic context
 * Part of the "test" phase in "study → assess → review" loop
 * Determines if user can skip standard learning path
 */

import type { WorkflowDeps } from '../state';
import { parseScore } from '../parse-score';
import { WorkflowStateAnnotation } from '../state';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

export const gradeQuizNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  const { model } = await deps.providerFactory.getModel('chat');
  const question = state.practicePrompt ?? '';
  const answer = state.userAnswer ?? '';
  const gradingPrompt = `Grade the user's answer for topic: ${state.topic}. Question: ${question}. Answer: ${answer}. Return "Score: NN%" only.`;
  const res = await model.invoke([new HumanMessage(gradingPrompt)]);
  const content = String(res.content ?? res ?? '');
  const mastery = parseScore(content) ?? 0.5;
  return { mastery, messages: [new AIMessage(content)] };
};
