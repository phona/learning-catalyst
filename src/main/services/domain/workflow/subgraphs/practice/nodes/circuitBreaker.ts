/**
 * Practice Subgraph Node: CIRCUIT_BREAKER
 *
 * Provides emotional support and guidance when user is struggling excessively.
 * This node is triggered after repeated failures to prevent frustration and burnout.
 *
 * Responsibilities:
 * 1. Acknowledge the user's effort and struggle
 * 2. Provide motivational support and encouragement
 * 3. Suggest taking a break or seeking alternative help
 * 4. Explain that struggling is part of learning
 * 5. Offer to resume later when ready
 *
 * Implementation Notes:
 * - Uses providerFactory directly (no agent manager layer)
 * - Provides chunk streaming for real-time UI feedback
 * - Routes to END after providing support
 *
 * This replaces the main workflow's breaker.ts node by integrating
 * circuit breaking logic directly into the PRACTICE subgraph.
 */

import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { WorkflowDeps } from '../../../state';
import { PracticeAnnotation } from '../state';
import { createChunkEmitter, generateId } from '../../../utils/chunk-emitter';
import { createAssistantMessageWithReasoning, getMessageReasoning } from '../../../utils/assistant-message';

interface CircuitBreakerContext {
  topic: string;
  failureStreak: number;
  mastery: number;
  hintsUsed: number;
}

/**
 * Creates supportive message for circuit breaker scenario
 */
function createCircuitBreakerPrompt(context: CircuitBreakerContext): string {
  return `You are a compassionate learning mentor. The student has been struggling with "${context.topic}" and needs encouragement.

Context:
- Topic: ${context.topic}
- Consecutive failures: ${context.failureStreak}
- Current mastery: ${(context.mastery * 100).toFixed(0)}%
- Hints used: ${context.hintsUsed}

Provide a supportive message that:
1. Acknowledges their effort and persistence
2. Normalizes struggle as part of learning
3. Suggests taking a break or trying a different approach
4. Offers encouragement to return when ready
5. Reminds them that understanding takes time

Keep it warm, encouraging, and不超过150 words.`;
}

/**
 * Circuit Breaker Node
 *
 * Provides emotional support when user is struggling excessively.
 * Routes to END after delivering supportive message.
 */
export const circuitBreakerNode =
  (deps: WorkflowDeps) =>
    async (state: typeof PracticeAnnotation.State, config: LangGraphRunnableConfig) => {
      const emitter = createChunkEmitter(config);
      const practice = state.practice!;
      const mastery = state.mastery ?? 0;
      const failureStreak = practice.failureStreak ?? 0;

      deps.loggerService.info('circuitBreakerNode: providing support', {
        topic: state.topic,
        failureStreak,
        mastery,
      });

      // Create supportive message using AI
      const model = await deps.providerFactory.getModel();
      const prompt = createCircuitBreakerPrompt({
        topic: state.topic,
        failureStreak,
        mastery,
        hintsUsed: practice.hintsGiven,
      });

      const messages = [
        { role: 'system' as const, content: 'You are a supportive learning mentor.' },
        { role: 'user' as const, content: prompt },
      ];

      const response = await model.invoke(messages);
      const content = String(response.content ?? '');
      const reasoning = getMessageReasoning(response);

      // Stream supportive message to user
      const messageId = generateId('msg');
      emitter.textStart(messageId);
      emitter.textDelta(messageId, content);
      emitter.textEnd(messageId);

      deps.loggerService.info('circuitBreakerNode: support delivered', {
        topic: state.topic,
        contentLength: content.length,
      });

      // Exit the practice subgraph with circuit breaker status
      return {
        messages: [
          createAssistantMessageWithReasoning(content, reasoning),
        ],
        practice: {
          ...practice,
          isComplete: true,
          shouldCircuitBreak: true,
        },
      };
    };
