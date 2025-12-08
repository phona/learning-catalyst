/**
 * Workflow Node: FAST TRACK QUIZ (Diagnostic Assessment)
 *
 * Mermaid Mapping (Line 13): "Practice Agent: Generate Diagnostic Assessment"
 * Part of Path A: Fast Track Assessment
 *
 * Flow Context:
 * - Triggered after: OfferSkip (Orchestrator: Offer: Skip to Quiz?) - when "Yes"
 * - Triggers: Grade (Assessment Agent: Grade & Analyze Gaps)
 * - Note: DiagAssess is shorthand for Diagnostic Assessment
 *
 * Purpose:
 * Generates a diagnostic quiz to quickly assess user's actual knowledge by:
 * 1. Creating a short, focused quiz targeting the specific topic
 * 2. Using AI to generate appropriate diagnostic questions
 * 3. Waiting for user response via interrupt
 * 4. Providing immediate feedback on user's true understanding
 * 5. Determining if user can skip to advanced content
 *
 * Fast Track Logic:
 * - Runs after confidence assessment shows high readiness
 * - Verifies confidence with actual performance
 * - If user performs well → Module Complete / Expert
 * - If gaps found → Update Learning Plan → Standard Learning
 *
 * Flow Progression:
 * 1. CheckConf (Confidence High?) → Yes
 * 2. OfferSkip → Yes
 * 3. DiagAssess (this node) → Grade
 * 4. CheckMastery → Complete or StandardStart
 *
 * Diagnostic Assessment Goals:
 * - Verify self-reported confidence with objective measure
 * - Identify specific knowledge gaps
 * - Make data-driven decision about learning path
 * - Save time for users who already know the material
 *
 * Outputs:
 * - messages: Assistant message with diagnostic quiz + user answer
 * - practicePrompt: The quiz content for grading
 * - userAnswer: User's response to the quiz
 *
 * Note:
 * This is the "test" in "study → assess → review" loop
 * Provides objective data to complement subjective confidence
 * Now includes interruption handling for user input
 */

import { randomUUID } from 'node:crypto';
import { interrupt } from '@langchain/langgraph';
import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';

export const fastTrackQuizNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  // Check if quiz already generated (detect resume)
  const hasGeneratedQuiz = state.practicePrompt &&
    (state.messages ?? []).some(m => (m as any).role === 'assistant' && (m as any).content === state.practicePrompt);

  if (!hasGeneratedQuiz) {
    // ========================================================================
    // PHASE 1: Generate Quiz
    // ========================================================================
    const { model } = await deps.providerFactory.getModel('chat');
    const prompt = `Create a short diagnostic quiz for topic: ${state.topic}. Return plain text prompt to ask the user.`;
    const res = await model.invoke(prompt as any);
    const quizContent = String((res as any)?.content ?? res ?? '');

    // Generate unique question ID for tracking
    const questionId = randomUUID();

    // Interrupt workflow to wait for user answer
    // Workflow will pause here and resume when user provides input
    const resumeValue = await interrupt({
      type: 'await_user_input',
      prompt: quizContent,
      questionId
    });

    // ========================================================================
    // PHASE 2: Extract Answer (after resume)
    // ========================================================================
    const answer = typeof resumeValue === 'string'
      ? resumeValue
      : (resumeValue as any)?.answer ?? (resumeValue as any)?.content ?? '';

    // Return quiz content, user answer, and tracking info
    return {
      messages: [
        { role: 'assistant', content: quizContent },
        { role: 'user', content: answer }
      ],
      practicePrompt: quizContent,
      userAnswer: answer,
    };
  }

  // ========================================================================
  // PHASE 3: Resume (quiz already shown and answered)
  // ========================================================================
  // This path shouldn't normally execute since interrupt() captures everything
  // But as a safety net, if we reach here, just pass through to next node
  return state;
};
