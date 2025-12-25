import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';
import { AIMessage, HumanMessage, isHumanMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { createChunkEmitter, generateId } from '../utils/chunk-emitter';

export const topicParseNode =
  (deps: WorkflowDeps) =>
    async (state: typeof WorkflowStateAnnotation.State, config: LangGraphRunnableConfig) => {
    // Extract threadId from config (passed from Assistant UI)
      const threadId = config.configurable?.thread_id;

      const messages = state.messages ?? [];
      const lastUserMsg = [...messages].reverse().find(HumanMessage.isInstance);
      const raw = lastUserMsg?.content ?? state.topic ?? '';
      const text = String(raw ?? '')
        .normalize('NFKC')
        .trim();

      // Basic validation - ensure we have some input
      if (!text) {
        deps.loggerService.error('[TopicParse] No message content found', { threadId, messages });
        return {
          error: "I didn't receive any message. What would you like to learn about?",
        };
      }

      const result = await deps.knowledgeService.findRelatedByPrompt(text, {
        limit: 10,
        threshold: 0.6,
      });

      // No matching concepts - topic not in our knowledge base, can't proceed
      if (result.matches.length === 0 || !result.matches[0]) {
        deps.loggerService.error(`[TopicParse] No concept matches found for query: "${text}"`);
        const errorMessage = `I couldn't find learning materials for "${text}". Try being more specific, like "Python programming" or try a different topic.`;
        return {
          error: errorMessage,
        };
      }

      const top = result.matches[0];

      // Get neighbor concepts (skip the first match which is the main topic)
      const neighbors = result.matches
        .slice(1, 4)
        .filter((m): m is NonNullable<typeof m> => m !== null)
        .map((m) => m.name);

      const msgText = neighbors.length
        ? `I'll help you learn about ${top.name}. Related topics: ${neighbors.join(', ')}`
        : `I'll help you learn about ${top.name}.`;
      // const emitter = createChunkEmitter(config);
      // const messageId = generateId('assess');
      // emitter.textStart(messageId);
      // emitter.textDelta(messageId, msgText);
      // emitter.textEnd(messageId);

      return {
        messages: [
          // new HumanMessage(msgText),
        ],
        topic: top.name,
        sessionMetadata: {
          ...state.sessionMetadata,
          threadId,
          title: state.sessionMetadata?.title || 'New Chat',
        },
      };
    };
