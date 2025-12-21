/**
 * Practice Subgraph Node: CLASSIFY_INTENT
 *
 * Analyzes user response to determine their intent:
 * - answer_attempt: User is trying to answer the question
 * - hint_request: User wants help/hints
 * - clarification: User asks what the question means
 * - thinking_aloud: User is reasoning but not answering yet
 * - give_up: User wants to skip or doesn't know
 * - off_topic: Unrelated response
 *
 * This node routes the flow to either grading or conversation handling.
 */

import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { WorkflowDeps } from '../../../state';
import { PracticeAnnotation } from '../state';
import type { UserIntent } from '../types';

/**
 * Intent classification prompt template
 */
const INTENT_CLASSIFICATION_TEMPLATE = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an intent classifier for an educational Q&A system.
Analyze the user's response to a practice question and determine their intent.

Return ONLY one of these exact values:
- answer_attempt: User is providing an answer (even if partial, unsure, or wrong)
- hint_request: User asks for help, hints, or examples
- clarification: User asks what the question means or wants more context
- thinking_aloud: User is reasoning/exploring but not giving a final answer
- give_up: User says they don't know, want to skip, or give up
- off_topic: Response is unrelated to the question

Be generous with "answer_attempt" - if the user is making any effort to answer, classify it as such.
Only use "thinking_aloud" if they explicitly say they're still thinking.`,
  ],
  [
    'user',
    `Question: {question}
User response: {userResponse}

What is the user's intent? Reply with ONLY the intent label.`,
  ],
]);

/**
 * Keywords for quick intent detection (fallback/validation)
 */
const INTENT_KEYWORDS: Record<UserIntent, string[]> = {
  hint_request: ['hint', 'help', 'clue', 'example', 'can you help', 'give me a hint', 'stuck'],
  clarification: [
    'what do you mean',
    'unclear',
    'don\'t understand the question',
    'what is',
    'explain',
    'confused about the question',
  ],
  give_up: [
    'don\'t know',
    'no idea',
    'skip',
    'give up',
    'pass',
    'next question',
    'i quit',
    'can\'t answer',
  ],
  thinking_aloud: ['let me think', 'thinking', 'hmm', 'maybe', 'i\'m not sure but', 'working on it'],
  off_topic: [], // Detected by AI, hard to keyword match
  answer_attempt: [], // Default if nothing else matches
};

/**
 * Detect intent using keyword matching (fast path)
 */
function detectIntentByKeywords(response: string): UserIntent | null {
  const lowerResponse = response.toLowerCase();

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some((keyword) => lowerResponse.includes(keyword))) {
      return intent as UserIntent;
    }
  }

  return null;
}

/**
 * Parse intent from AI response
 */
function parseIntent(aiResponse: string): UserIntent {
  const normalized = aiResponse.toLowerCase().trim();

  const validIntents: UserIntent[] = [
    'answer_attempt',
    'hint_request',
    'clarification',
    'thinking_aloud',
    'give_up',
    'off_topic',
  ];

  for (const intent of validIntents) {
    if (normalized.includes(intent)) {
      return intent;
    }
  }

  // Default to answer_attempt (be generous)
  return 'answer_attempt';
}

/**
 * Classify Intent Node
 *
 * Uses AI to classify user intent, with keyword fallback for common cases.
 */
export const classifyIntentNode =
  (deps: WorkflowDeps) =>
    async (state: typeof PracticeAnnotation.State, _config: LangGraphRunnableConfig) => {
      const startTime = Date.now();
      const userResponse = state.userAnswer ?? '';
      const question = state.practice?.currentQuestion ?? state.practicePrompt ?? '';

      deps.loggerService.debug('classifyIntentNode: start', {
        responseLength: userResponse.length,
        questionLength: question.length,
      });

      // Fast path: empty response
      if (!userResponse.trim()) {
        deps.loggerService.debug('classifyIntentNode: empty response');
        return {
          practice: { userIntent: 'give_up' as UserIntent },
        };
      }

      // Fast path: keyword detection
      const keywordIntent = detectIntentByKeywords(userResponse);
      if (keywordIntent && keywordIntent !== 'answer_attempt') {
        deps.loggerService.debug('classifyIntentNode: keyword match', { intent: keywordIntent });
        return {
          practice: { userIntent: keywordIntent },
        };
      }

      // AI classification for nuanced cases
      try {
        const model = await deps.providerFactory.getModel();
        const messages = await INTENT_CLASSIFICATION_TEMPLATE.formatMessages({
          question,
          userResponse,
        });

        const response = await model.invoke(messages);
        const intent = parseIntent(String(response.content ?? ''));

        const duration = Date.now() - startTime;
        deps.loggerService.info('classifyIntentNode: complete', {
          intent,
          durationMs: duration,
        });

        return {
          practice: { userIntent: intent },
        };
      } catch (error) {
        deps.loggerService.error('classifyIntentNode: AI classification failed', { error });
        // Fallback: assume answer attempt
        return {
          practice: { userIntent: 'answer_attempt' as UserIntent },
        };
      }
    };
