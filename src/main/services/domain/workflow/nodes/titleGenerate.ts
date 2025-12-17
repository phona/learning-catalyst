/**
 * Workflow Node: TITLE_GENERATE (AI-Powered Title Generator)
 *
 * Mermaid Mapping (Line 12): "Orchestrator: Generate Thread Title"
 * Runs once per thread after topic parsing
 *
 * Flow Context:
 * - Triggered after: TopicParse (when valid topic found)
 * - Triggers: Assess (Standard Learning Loop)
 *
 * Purpose:
 * Generates a meaningful, concise title for the thread using an LLM based on the
 * first user message. This replaces fragile hardcoded rules with intelligent
 * AI-powered title generation.
 *
 * Flow Progression:
 * 1. TopicParse → TitleGenerate (this node)
 * 2. TitleGenerate → Assess
 *
 * Title Generation Strategy:
 * - Extracts first user message from conversation
 * - Uses LLM to generate context-aware, meaningful title
 * - Enforces 3-50 character limit for optimal UI display
 * - Provides structured output via Zod schema
 * - Falls back gracefully on errors
 *
 * Outputs:
 * - sessionMetadata.title: Generated thread title
 * - Avoids regeneration if title already exists (thread resume)
 *
 * Technical Approach:
 * - Uses ChatPromptTemplate for reusable prompt
 * - Uses providerFactory.getModel() for LLM access
 * - StructuredOutputParser for type-safe title extraction
 * - Zod schema validation for output format
 * - System prompt for consistent title generation
 * - Error handling with fallback to "New Chat"
 */

import { WorkflowState } from '../state';
import type { WorkflowDeps } from '../state';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { HumanMessage } from '@langchain/core/messages';

// Title output schema
const TitleSchema = z.object({
  title: z.string().min(3).max(50),
});

// Template created once and reused (follows plan.ts pattern)
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

OUTPUT FORMAT:
{format_instructions}`,
  ],
  ['human', 'User\'s message: """{userMessage}"""'],
]);

export const titleGenerateNode = (deps: WorkflowDeps) => {
  return async (state: WorkflowState): Promise<WorkflowState> => {
    try {
      // Extract threadId from sessionMetadata (passed from TopicParse)
      const threadId = state.sessionMetadata?.threadId;

      // Skip if title already exists (thread resume scenario)
      const currentTitle = state.sessionMetadata?.title;
      if (currentTitle && currentTitle !== 'New Chat') {
        console.log('[TitleGenerate] Title already exists, skipping:', currentTitle);
        return state;
      }

      // Fallback Title Generation: Generate a simple title from the first user message
      // when the AI-powered title generation hasn't run yet (e.g., fast topic parsing).
      // This ensures sessions always have a meaningful title even if AI generation fails.
      // Uses basic truncation rather than LLM generation as a fallback.
      const shouldGenerateSimpleTitle =
        typeof threadId === 'string' &&
        threadId.length > 0 &&
        state.sessionMetadata?.title === 'New Chat';

      if (shouldGenerateSimpleTitle) {
        // Extract first user message for title generation
        const firstUserMessage = state.messages.find((msg) => msg instanceof HumanMessage);
        if (firstUserMessage) {
          const content = String(firstUserMessage.content);
          // Generate a concise title from the first message (simple truncation)
          const title = content.length > 50 ? `${content.slice(0, 47)}...` : content;
          console.log(`[TitleGenerate] Generated fallback title for thread ${threadId}: "${title}"`);

          // Persist title to learning_sessions table
          await deps.learningService.updateSessionTitle(threadId, title);

          // Update workflow state with the fallback title
          return {
            ...state,
            sessionMetadata: {
              ...state.sessionMetadata,
              title: title,
            },
          };
        }
      }

      // Extract first user message for AI-powered title generation
      const firstUserMessage = state.messages.find((msg) => msg instanceof HumanMessage);
      if (!firstUserMessage) {
        console.log('[TitleGenerate] No user message found, keeping default title');
        return {
          ...state,
          sessionMetadata: {
            ...state.sessionMetadata,
            title: 'New Chat',
          },
        };
      }

      // Extract text content from message (handles string or array content)
      const content = firstUserMessage.content;
      let text = '';

      if (typeof content === 'string') {
        text = content.trim();
      } else if (Array.isArray(content)) {
        const textPart = content.find((part) => {
          // Type guard for text content
          return typeof part === 'object' &&
                 part !== null &&
                 'type' in part &&
                 part.type === 'text';
        }) as { text: string } | undefined;
        if (textPart) {
          text = String(textPart.text).trim();
        }
      }

      if (!text) {
        console.log('[TitleGenerate] No text content found, keeping default title');
        return {
          ...state,
          sessionMetadata: {
            ...state.sessionMetadata,
            title: 'New Chat',
          },
        };
      }

      console.log('[TitleGenerate] Generating title for message:', text.substring(0, 100));

      // Get LLM model from provider factory (follows plan.ts pattern)
      const llm = await deps.providerFactory.getModel();

      // Create structured output parser with Zod schema
      const parser = StructuredOutputParser.fromZodSchema(TitleSchema);
      const formatInstructions = parser.getFormatInstructions()
        .replace(/Include the enclosing markdown codeblock:[\s\S]*?```/g, '')
        .replace(/```json[\s\S]*?```/g, '')
        .replace(/```/g, '')
        .trim();

      // Create chain: template -> llm -> parser (follows plan.ts pattern)
      const chain = TITLE_GENERATION_TEMPLATE.pipe(llm).pipe(parser);

      // Generate title using structured output
      const result = await chain.invoke({
        userMessage: text,
        format_instructions: formatInstructions,
      });

      // Validate and sanitize generated title
      let generatedTitle = result.title;
      if (!generatedTitle || generatedTitle.length < 3) {
        generatedTitle = 'New Chat';
      } else if (generatedTitle.length > 50) {
        generatedTitle = generatedTitle.substring(0, 50).trim();
      }

      console.log('[TitleGenerate] Generated title:', generatedTitle);

      // Persist the generated title to the database to ensure session titles
      // are available across application restarts and in the session list UI.
      // The threadId from sessionMetadata corresponds to the learning_sessions.id.
      if (typeof threadId === 'string' && threadId.length > 0) {
        await deps.learningService.updateSessionTitle(threadId, generatedTitle);
        console.log('[TitleGenerate] Title persisted to database for thread:', threadId);
      } else {
        console.warn('[TitleGenerate] No threadId in session metadata, skipping database persistence');
      }

      // Update workflow state with the generated title for downstream nodes
      const updatedState = {
        ...state,
        sessionMetadata: {
          ...state.sessionMetadata,
          title: generatedTitle,
        },
      };

      return updatedState;
    } catch (error) {
      console.error('[TitleGenerate] Error generating title:', error);
      // Return state with default title on error
      return {
        ...state,
        sessionMetadata: {
          ...state.sessionMetadata,
          title: 'New Chat',
        },
      };
    }
  };
};
