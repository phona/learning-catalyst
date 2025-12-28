import type { ProviderFactory } from '@/main/services/agent/provider-factory';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import type { RunnableConfig } from '@langchain/core/runnables';
import { generateAITitle } from './title-generation';
import type { LoggerService } from '../../core/logger/logger-service';
import {
  getPendingInterruptDetails,
  getPendingInterruptPrompt,
} from '@/main/services/domain/workflow/pending-interrupt';
import type { ChatMessage } from './chat-message-types';
import { getCheckpointIdFromTupleConfig, getCreatedAtFromMetadata } from './checkpoint-readers';
import { convertToChatMessage } from './message-converter';

function shouldAppendInterruptPrompt(formattedMessages: ChatMessage[], prompt: string): boolean {
  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) return false;

  const lastMessage = formattedMessages.at(-1);
  return !(
    lastMessage?.role === 'assistant' &&
    (lastMessage.content ?? '').trim() === normalizedPrompt
  );
}

export const createChatService = ({
  providerFactory,
  loggerService,
  checkpointSaver,
}: {
  providerFactory: ProviderFactory;
  loggerService: LoggerService;
  checkpointSaver: Pick<BaseCheckpointSaver, 'getTuple'>;
}) => {
  const serviceLogger = loggerService.child({ service: 'chat' });

  return {
    /**
     * Generate session title using AI based on first message
     * @param messageText - The initial message to generate title from
     * @returns Generated title string
     */
    generateTitle: async (messageText: string): Promise<string> => {
      return generateAITitle(messageText, { providerFactory, loggerService: serviceLogger });
    },

    /**
     * Retrieve complete message history for a chat session
     *
     * This method reads messages from LangGraph checkpoints where they are stored
     * as accumulated state. Since messages use a reducer pattern (append-only),
     * the latest checkpoint contains the complete conversation history.
     *
     * @param sessionId - Thread/session identifier
     * @returns Array of messages in chronological order
     * @throws Error if checkpoint retrieval fails
     */
    getMessages: async (sessionId: string): Promise<ChatMessage[]> => {
      serviceLogger.info('Retrieving message history', { sessionId });

      // Build checkpoint query configuration
      const checkpointConfig: RunnableConfig = {
        configurable: {
          thread_id: sessionId,
          checkpoint_ns: '',
        },
      };

      const latestTuple = await checkpointSaver.getTuple(checkpointConfig);

      // No checkpoints means no messages yet
      if (!latestTuple) {
        serviceLogger.debug('No checkpoints found for session', { sessionId });
        return [];
      }

      // Messages accumulate via reducer - latest checkpoint has complete history
      // Messages are stored in channel_values.messages (LangGraph state structure)
      const checkpointId = getCheckpointIdFromTupleConfig(latestTuple.config);
      const channelValues = (latestTuple.checkpoint?.channel_values ?? {}) as Record<string, unknown>;
      const rawMessages = Array.isArray(channelValues.messages) ? channelValues.messages : [];
      serviceLogger.debug('Messages found in latest checkpoint', {
        sessionId,
        rawMessages,
        messageCount: rawMessages.length,
      });

      // Convert checkpoint messages directly to ChatMessage format
      // Handles both serialized checkpoint format and class instances
      const formattedMessages: ChatMessage[] = rawMessages.map((msg, index) =>
        convertToChatMessage(
          msg,
          index,
          sessionId,
          latestTuple.metadata as unknown as Record<string, unknown> | undefined,
          checkpointId,
        ),
      );

      const interruptPrompt = getPendingInterruptPrompt(latestTuple);

      if (interruptPrompt && shouldAppendInterruptPrompt(formattedMessages, interruptPrompt)) {
        const interruptDetails = getPendingInterruptDetails(latestTuple);
        const nextIndex = formattedMessages.length;
        formattedMessages.push({
          id: `${sessionId}-${nextIndex}`,
          role: 'assistant',
          content: interruptPrompt,
          ...(interruptDetails?.reasoning
            ? { reasoning_content: interruptDetails.reasoning }
            : {}),
          timestamp: getCreatedAtFromMetadata(latestTuple.metadata) ?? new Date().toISOString(),
          tool_calls: [],
          metadata: {
            checkpoint_id: checkpointId,
            message_index: nextIndex,
            invalid_tool_calls: [],
          },
        });
      }

      serviceLogger.info('Message history retrieved', {
        sessionId,
        messageCount: formattedMessages.length,
      });

      return formattedMessages;
    },
  };
};
