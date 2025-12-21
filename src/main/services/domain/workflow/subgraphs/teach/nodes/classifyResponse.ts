/**
 * Teach Subgraph Node: CLASSIFY_RESPONSE
 *
 * Analyzes user response to determine their intent:
 * - question: User asks about the topic
 * - ready: User is ready to practice
 * - confused: User expresses confusion
 * - needs_more: User wants deeper explanation
 * - off_topic: Unrelated response
 *
 * Routes the flow to appropriate handler.
 */

import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { WorkflowDeps } from '../../../state';
import { TeachAnnotation } from '../state';
import type { TeachIntent } from '../types';

/**
 * Intent classification prompt template
 */
const CLASSIFICATION_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an intent classifier for an educational teaching system.
Analyze the user's response to teaching content and determine their intent.

Return ONLY one of these exact values:
- question: User is asking a question about the topic
- ready: User understands and is ready to practice
- confused: User expresses confusion or doesn't understand
- needs_more: User wants more detail or deeper explanation
- off_topic: Response is unrelated to the topic

Be generous with classification:
- Any question mark or inquiry → question
- Positive understanding signals → ready
- Expressions of difficulty → confused
- Requests for elaboration → needs_more`,
  ],
  [
    'user',
    `Topic: {topic}
User response: "{userResponse}"

What is the user's intent? Reply with ONLY the intent label.`,
  ],
]);

/**
 * Keywords for quick intent detection (fast path)
 */
const INTENT_KEYWORDS: Record<TeachIntent, string[]> = {
  ready: [
    'understand',
    'got it',
    'makes sense',
    'clear now',
    'ready',
    'ready to practice',
    'i get it',
    'that helps',
    'thanks, i understand',
  ],
  confused: [
    "don't get",
    'confused',
    'confusing',
    'unclear',
    "don't understand",
    'lost',
    "doesn't make sense",
    'what do you mean',
    'huh',
    "i'm not sure",
  ],
  question: [
    'what is',
    'what are',
    'why does',
    'why is',
    'how does',
    'how do',
    'can you explain',
    'what about',
    'could you',
    'what if',
  ],
  needs_more: [
    'tell me more',
    'more detail',
    'elaborate',
    'go deeper',
    'more examples',
    'can you expand',
    'continue',
    'keep going',
  ],
  off_topic: [], // Detected by AI, hard to keyword match
};

/**
 * Detect intent using keyword matching (fast path)
 */
function detectIntentByKeywords(response: string): TeachIntent | null {
  const lowerResponse = response.toLowerCase();

  // Check keywords in priority order (confusion should override "understand" substring matches)
  for (const intent of ['confused', 'needs_more', 'ready', 'question'] as TeachIntent[]) {
    const keywords = INTENT_KEYWORDS[intent];
    if (keywords.some((keyword) => lowerResponse.includes(keyword))) {
      return intent;
    }
  }

  // Question marks are a strong signal *only* if we didn't match other intents (e.g., "Huh?")
  if (lowerResponse.includes('?')) {
    return 'question';
  }

  return null;
}

/**
 * Parse intent from AI response
 */
function parseIntent(aiResponse: string): TeachIntent {
  const normalized = aiResponse.toLowerCase().trim();

  const validIntents: TeachIntent[] = [
    'ready',
    'confused',
    'question',
    'needs_more',
    'off_topic',
  ];

  for (const intent of validIntents) {
    if (normalized.includes(intent.replace('_', ' ')) || normalized.includes(intent)) {
      return intent;
    }
  }

  // Default to question (be generous)
  return 'question';
}

/**
 * Classify Response Node
 *
 * Uses keyword matching for fast path, AI for nuanced cases.
 */
export const classifyResponseNode =
  (deps: WorkflowDeps) =>
    async (state: typeof TeachAnnotation.State, _config: LangGraphRunnableConfig) => {
      const startTime = Date.now();
      const userResponse = state.userAnswer ?? '';

      deps.loggerService.debug('teach:classifyResponse start', {
        responseLength: userResponse.length,
      });

      // Fast path: empty response → confused
      if (!userResponse.trim()) {
        deps.loggerService.debug('teach:classifyResponse empty response');
        return {
          teach: { teachIntent: 'confused' as TeachIntent },
        };
      }

      // Fast path: keyword detection
      const keywordIntent = detectIntentByKeywords(userResponse);
      if (keywordIntent) {
        deps.loggerService.debug('teach:classifyResponse keyword match', {
          intent: keywordIntent,
        });
        return {
          teach: { teachIntent: keywordIntent },
        };
      }

      // AI classification for nuanced cases
      try {
        const model = await deps.providerFactory.getModel();
        const messages = await CLASSIFICATION_PROMPT.formatMessages({
          topic: state.topic,
          userResponse,
        });

        const response = await model.invoke(messages);
        const intent = parseIntent(String(response.content ?? ''));

        const duration = Date.now() - startTime;
        deps.loggerService.info('teach:classifyResponse complete', {
          intent,
          durationMs: duration,
        });

        return {
          teach: { teachIntent: intent },
        };
      } catch (error) {
        deps.loggerService.error('teach:classifyResponse AI classification failed', { error });
        // Fallback: assume question
        return {
          teach: { teachIntent: 'question' as TeachIntent },
        };
      }
    };
