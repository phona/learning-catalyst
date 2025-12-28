/**
 * Practice Subgraph Node: GRADE_ANSWER
 *
 * Grades the user's answer attempt and provides feedback.
 * This is the exit point of the practice subgraph when user provides an answer.
 *
 * Responsibilities:
 * - Evaluate user's answer against the question
 * - Calculate mastery score
 * - Provide constructive feedback
 * - Update attempt count
 * - Clean up practice state for next round
 */

import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { WorkflowDeps } from '../../../state';
import { PracticeAnnotation } from '../state';
import { createChunkEmitter, generateId } from '../../../utils/chunk-emitter';
import { parseScore } from '../../../parse-score';
import { createAssistantMessageWithReasoning, getMessageReasoning } from '../../../utils/assistant-message';

/**
 * Grading prompt template
 */
const GRADING_TEMPLATE = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a supportive tutor grading practice answers.
Evaluate the answer and provide:
1. A score from 0-100
2. Constructive feedback
3. Encouragement

Be generous but accurate. Partial credit for partial understanding.
Format: Start with "Score: XX%" then provide feedback.`,
  ],
  [
    'user',
    `Topic: {topic}
Question: {question}
Key concepts: {concepts}

User's answer: {userAnswer}

Grade this answer:`,
  ],
]);

/**
 * Clamp a number to [0, 1] range
 */
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/**
 * Grade Answer Node
 *
 * Evaluates user's answer and provides feedback.
 */
export const gradeAnswerNode =
  (deps: WorkflowDeps) =>
    async (state: typeof PracticeAnnotation.State, config: LangGraphRunnableConfig) => {
      const emitter = createChunkEmitter(config);
      const startTime = Date.now();
      const practice = state.practice!;
      const question = practice.currentQuestion || state.practicePrompt || '';
      const userAnswer = state.userAnswer || '';

      deps.loggerService.debug('gradeAnswerNode: start', {
        topic: state.topic,
        questionLength: question.length,
        answerLength: userAnswer.length,
      });

      // Handle empty answer (shouldn't happen if classifyIntent works correctly)
      if (!userAnswer.trim()) {
        const emptyMessage = "I didn't receive an answer. Let's move on to the next practice!";

        const messageId = generateId('msg');
        emitter.textStart(messageId);
        emitter.textDelta(messageId, emptyMessage);
        emitter.textEnd(messageId);

        return {
          messages: [new AIMessage(emptyMessage)],
          mastery: 0,
          attemptCount: (state.practice.attemptCount ?? 0) + 1,
          practice: {
            isComplete: true,
            currentQuestion: '',
            userIntent: undefined,
            hintsGiven: 0,
            conversationTurns: 0,
          },
        };
      }

      // Grade the answer using AI
      const model = await deps.providerFactory.getModel();
      const messages = await GRADING_TEMPLATE.formatMessages({
        topic: state.topic,
        question,
        concepts: practice.focusConcepts.join(', '),
        userAnswer,
      });

      const response = await model.invoke(messages);
      const feedbackContent = String(response.content ?? '');
      const reasoning = getMessageReasoning(response);

      // Parse score from response
      const parsedScore = parseScore(feedbackContent);
      const mastery = clamp01(parsedScore ?? 0.5);

      // Emit feedback to user
      const messageId = generateId('msg');
      emitter.textStart(messageId);
      emitter.textDelta(messageId, feedbackContent);
      emitter.textEnd(messageId);

      // Update practice analytics
      const result = mastery >= 0.7 ? 'pass' : mastery >= 0.4 ? 'partial' : 'fail';
      await deps.practiceService.recordPracticeAttempt({
        taskId: `practice_grade_${Date.now()}`,
        conceptIds: [], // Would come from knowledge service in real impl
        result,
        timestamp: new Date().toISOString(),
      });

      const duration = Date.now() - startTime;
      deps.loggerService.info('gradeAnswerNode: complete', {
        topic: state.topic,
        mastery,
        result,
        hintsUsed: practice.hintsGiven,
        conversationTurns: practice.conversationTurns,
        durationMs: duration,
      });

      // Return updated state - clean up practice state for next round
      return {
        messages: [
          createAssistantMessageWithReasoning(feedbackContent, reasoning),
        ],
        mastery,
        attemptCount: (state.practice.attemptCount ?? 0) + 1,
        // Clear practice state for next question
        practice: {
          isComplete: true,
          currentQuestion: '',
          expectedAnswer: '',
          userIntent: undefined,
          hintsGiven: 0,
          conversationTurns: 0,
          focusConcepts: [],
          relatedConcepts: [],
        },
      };
    };
