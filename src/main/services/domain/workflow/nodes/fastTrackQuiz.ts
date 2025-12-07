/**
 * Workflow Node: FAST TRACK QUIZ (Diagnostic Assessment)
 *
 * Mermaid Mapping (Line 13): "Practice Agent: Generate Diagnostic Assessment"
 * Part of Path A: Fast Track Assessment
 *
 * Flow Context:
 * - Triggered after: OfferSkip (Orchestrator: Offer: Skip to Quiz?) - when "Yes"
 * - Triggers: PresentDiag (Practice Agent: Present Diagnostic Quiz)
 * - Note: DiagAssess is shorthand for Diagnostic Assessment
 *
 * Purpose:
 * Generates a diagnostic quiz to quickly assess user's actual knowledge by:
 * 1. Creating a short, focused quiz targeting the specific topic
 * 2. Using AI to generate appropriate diagnostic questions
 * 3. Providing immediate feedback on user's true understanding
 * 4. Determining if user can skip to advanced content
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
 * 3. DiagAssess (this node) → PresentDiag
 * 4. WaitDiag → Grade
 * 5. CheckMastery → Complete or StandardStart
 *
 * Diagnostic Assessment Goals:
 * - Verify self-reported confidence with objective measure
 * - Identify specific knowledge gaps
 * - Make data-driven decision about learning path
 * - Save time for users who already know the material
 *
 * Outputs:
 * - messages: Assistant message with diagnostic quiz
 * - practicePrompt: The quiz content for later evaluation
 *
 * Note:
 * This is the "test" in "study → assess → review" loop
 * Provides objective data to complement subjective confidence
 */

import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';

export const fastTrackQuizNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  const { model } = await deps.providerFactory.getModel('chat');
  const prompt = `Create a short diagnostic quiz for topic: ${state.topic}. Return plain text prompt to ask the user.`;
  const res = await model.invoke(prompt as any);
  const content = String((res as any)?.content ?? res ?? '');
  return {
    messages: [{ role: 'assistant', content }],
    practicePrompt: content,
  };
};
