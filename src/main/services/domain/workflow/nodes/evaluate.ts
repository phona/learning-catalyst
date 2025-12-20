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
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { ChatPromptTemplate } from '@langchain/core/prompts';

/**
 * Default mastery score when parsing fails
 */
const DEFAULT_MASTERY = 0.5;

/**
 * Chat prompt template for evaluating user answers
 */
const EVALUATION_TEMPLATE = ChatPromptTemplate.fromMessages([
  ['system', 'You are an expert learning evaluator. Provide fair, constructive feedback.'],
  [
    'human',
    [
      "Grade the user's answer for topic: {topic}",
      'Question: {question}',
      'Answer: {answer}',
      '',
      'Return "Score: NN%" only, where NN is a number from 0-100.',
    ].join('\n'),
  ],
]);

/**
 * Evaluates user's practice answer using AI assessment
 *
 * @param deps - Workflow dependencies
 * @param state - Current workflow state
 * @param config - LangGraph configuration
 * @returns Evaluation results with mastery score, attempt count, and feedback messages
 */
export const evaluateNode =
  (deps: WorkflowDeps) =>
  async (state: typeof WorkflowStateAnnotation.State, config: LangGraphRunnableConfig) => {
    const startTime = Date.now();

    // Debug: Node start
    deps.loggerService.debug('evaluateNode: start', {
      topic: state.topic,
      hasPracticePrompt: !!state.practicePrompt,
      hasUserAnswer: !!state.userAnswer,
      previousMastery: state.mastery,
      previousAttemptCount: state.attemptCount,
    });

    const model = await deps.providerFactory.getModel();
    const question = state.practicePrompt ?? '';
    const answer = state.userAnswer ?? '';

    // Debug: Input validation
    deps.loggerService.debug('evaluateNode: input validation', {
      questionLength: question.length,
      answerLength: answer.length,
    });

    // Format the evaluation prompt using ChatPromptTemplate
    const messages = await EVALUATION_TEMPLATE.formatMessages({
      topic: state.topic,
      question,
      answer,
    });

    const res = await model.invoke(messages);
    const content = String(res.content ?? res ?? '');
    const mastery = parseScore(content) ?? state.mastery ?? DEFAULT_MASTERY;
    const attemptCount = (state.attemptCount ?? 0) + 1;

    // Debug: Final result
    const duration = Date.now() - startTime;
    deps.loggerService.debug('evaluateNode: complete', {
      topic: state.topic,
      mastery,
      masteryPercent: Math.round(mastery * 100),
      attemptCount,
      feedbackLength: content.length,
      durationMs: duration,
    });

    // Info: Evaluation completed
    deps.loggerService.info('evaluateNode: evaluation complete', {
      topic: state.topic,
      masteryPercent: Math.round(mastery * 100),
      attemptCount,
      outcome: mastery >= 0.9 ? 'pass' : 'continue',
      durationMs: duration,
    });

    return {
      mastery,
      attemptCount,
      messages: [
        new HumanMessage({
          response_metadata: {
            content,
          },
        }),
      ],
    };
  };
