/**
 * Practice Subgraph Node: REMEDIATE_PRACTICE
 *
 * Provides targeted re-teaching when knowledge gaps are detected.
 * This node addresses specific areas where the student is struggling.
 *
 * Responsibilities:
 * 1. Identify specific knowledge gaps from failed attempts
 * 2. Provide alternative explanations or teaching approaches
 * 3. Use different teaching strategies than initial instruction
 * 4. Focus on foundational concepts that may be missing
 * 5. Prepare student to resume practice with better understanding
 *
 * Implementation Notes:
 * - Uses providerFactory directly (no agent manager layer)
 * - Provides chunk streaming for real-time UI feedback
 * - Routes back to ASK_QUESTION after remediation
 *
 * This replaces the main workflow's remediate.ts node by integrating
 * remediation logic directly into the PRACTICE subgraph.
 */

import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { WorkflowDeps } from '../../../state';
import { PracticeAnnotation } from '../state';
import { createChunkEmitter, generateId } from '../../../utils/chunk-emitter';
import type { PracticeState } from '../types';

interface RemediationContext {
  topic: string;
  mastery: number;
  failureStreak: number;
  gaps: string[];
  hintsUsed: number;
  focusConcepts: string[];
}

/**
 * Creates targeted remediation prompt
 */
function createRemediationPrompt(context: RemediationContext): string {
  const gapList = context.gaps.length > 0 ? context.gaps.join(', ') : 'foundational concepts';

  return `You are a skilled tutor providing targeted remediation. The student is struggling with "${context.topic}" and needs alternative explanations.

Current Status:
- Topic: ${context.topic}
- Current mastery: ${(context.mastery * 100).toFixed(0)}%
- Consecutive failures: ${context.failureStreak}
- Knowledge gaps: ${gapList}
- Focus concepts: ${context.focusConcepts.join(', ')}

Provide a re-teaching message that:
1. Identifies the specific gaps in understanding
2. Provides a fresh explanation using a different approach
3. Uses analogies, examples, or visualizations if helpful
4. Breaks complex concepts into smaller, digestible pieces
5. Confirms understanding before moving on
6. Encourages the student and builds confidence

Keep it concise (不超过200 words) but comprehensive enough to address the gaps.`;
}

/**
 * Extracts key concepts from practice state for remediation focus
 */
function extractFocusConcepts(practice: PracticeState, mastery: number): string[] {
  const concepts = [...practice.focusConcepts];

  // Add related concepts if mastery is low
  if (mastery < 0.5 && practice.relatedConcepts.length > 0) {
    concepts.push(...practice.relatedConcepts.slice(0, 2));
  }

  // Ensure we have at least one concept to focus on
  if (concepts.length === 0 && practice.currentQuestion) {
    // Fallback: extract key terms from the question
    const words = practice.currentQuestion.split(' ').filter(w => w.length > 4);
    concepts.push(...words.slice(0, 3));
  }

  return concepts;
}

/**
 * Remediation Node for Practice Subgraph
 *
 * Provides targeted re-teaching based on identified knowledge gaps.
 * Routes back to ASK_QUESTION after delivering remediation.
 */
export const remediatePracticeNode =
  (deps: WorkflowDeps) =>
    async (state: typeof PracticeAnnotation.State, _config: LangGraphRunnableConfig) => {
      const emitter = createChunkEmitter(_config);
      const practice = state.practice!;
      const mastery = state.mastery ?? 0;
      const failureStreak = practice.failureStreak ?? 0;

      deps.loggerService.info('remediatePracticeNode: providing remediation', {
        topic: state.topic,
        mastery,
        failureStreak,
        gaps: practice.focusConcepts,
      });

      // Extract focus concepts for remediation
      const focusConcepts = extractFocusConcepts(practice, mastery);

      // Create targeted remediation message
      const model = await deps.providerFactory.getModel();
      const prompt = createRemediationPrompt({
        topic: state.topic,
        mastery,
        failureStreak,
        gaps: practice.focusConcepts,
        hintsUsed: practice.hintsGiven,
        focusConcepts,
      });

      const messages = [
        { role: 'system' as const, content: 'You are an expert tutor specializing in clear explanations.' },
        { role: 'user' as const, content: prompt },
      ];

      const response = await model.invoke(messages);
      const content = String(response.content ?? '');

      // Stream remediation message to user
      const messageId = generateId('msg');
      emitter.textStart(messageId);
      emitter.textDelta(messageId, content);
      emitter.textEnd(messageId);

      deps.loggerService.info('remediatePracticeNode: remediation delivered', {
        topic: state.topic,
        contentLength: content.length,
        focusConcepts,
      });

      // Update practice state for next round
      return {
        messages: [new AIMessage(content)],
        practice: {
          ...practice,
          needsRemediation: false,
          // Reset counters for fresh start after remediation
          hintsGiven: 0,
          conversationTurns: 0,
          // Keep focus concepts for next question generation
          focusConcepts,
        },
      };
    };
