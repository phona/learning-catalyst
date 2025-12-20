/**
 * Standalone Title Generation Service
 *
 * Simple title generation from message text
 * UI layer can call directly to update session titles
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { ProviderFactory } from '@/main/services/agent/provider-factory';
import type { LearningService } from '@/main/services/domain/learning/learning-service';
import { LoggerService } from '../../core/logger/logger-service';

// Template created once and reused
const TITLE_GENERATION_TEMPLATE = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful assistant that generates concise, meaningful titles for learning conversations.

Your task is to create a short, descriptive title (3-50 characters) that captures the essence of the user's question or topic.

Guidelines:
- Be concise and specific
- Focus on the main topic or question
- Use common words, avoid technical jargon when possible
- Make it scannable and informative
- Example: "Binary Search in Python" or "Understanding React Hooks"

If the message is unclear or too vague, create a general but relevant title.
`,
  ],
  ['human', 'User\'s message: """{userMessage}"""'],
]);

export interface TitleGenerationDeps {
  providerFactory: ProviderFactory;
  loggerService: LoggerService;
}

/**
 * Internal: Generate AI-powered title
 */
export const generateAITitle = async (
  messageText: string,
  deps: TitleGenerationDeps,
): Promise<string> => {
  const text = messageText.trim();

  // Get LLM model from provider factory
  const llm = await deps.providerFactory.getModel();

  // Create chain: template -> llm
  const chain = TITLE_GENERATION_TEMPLATE.pipe(llm);

  // Generate title using structured output
  const result = await chain.invoke({
    userMessage: text,
  });

  deps.loggerService.info('[TitleGeneration] Generated AI title:', result);
  if (typeof result === 'string') return result;
  if (Array.isArray(result.content)) return result.content.map(c => typeof c === 'string' ? c : c.text || '').join('');
  return String(result.content || '');
};
