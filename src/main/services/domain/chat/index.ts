import { LoggerService } from "../../core/logger/logger-service";
import { ILogger } from "../../types";
import { generateAITitle } from "./title-generation";
import { ProviderFactory } from "@/main/services/agent/provider-factory";
import type { SQLiteCheckpointSaver } from "@/main/services/core/checkpoints/SQLiteCheckpointSaver";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";

/**
 * Display-ready message structure returned by getMessages
 */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata: {
    checkpoint_id?: string;
    message_index: number;
  };
}

export const createChatService = ({
  providerFactory,
  loggerService,
  checkpointSaver,
}: {
  providerFactory: ProviderFactory;
  loggerService: LoggerService;
  checkpointSaver: SQLiteCheckpointSaver;
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
      const checkpointConfig = {
        configurable: {
          thread_id: sessionId,
          checkpoint_ns: '',
        } as const,
      };

      // Collect all checkpoints for this thread
      const checkpoints: Array<{
        checkpoint: { channel_values?: { messages?: BaseMessage[] } };
        metadata: Record<string, unknown>;
        config: { configurable: { checkpoint_id?: string } };
      }> = [];

      for await (const checkpoint of checkpointSaver.list(checkpointConfig)) {
        checkpoints.push({
          checkpoint: checkpoint.checkpoint as { channel_values?: { messages?: BaseMessage[] } },
          metadata: checkpoint.metadata,
          config: checkpoint.config,
        });
      }

      // No checkpoints means no messages yet
      if (checkpoints.length === 0) {
        serviceLogger.debug('No checkpoints found for session', { sessionId });
        return [];
      }

      // Messages accumulate via reducer - latest checkpoint has complete history
      // Messages are stored in channel_values.messages (LangGraph state structure)
      const latestCheckpoint = checkpoints[0];
      const messages = latestCheckpoint.checkpoint.channel_values?.messages ?? [];

      // Convert LangChain messages to display format
      const formattedMessages: ChatMessage[] = messages.map((msg, index) => {
        const messageType = msg.constructor.name;

        return {
          id: `${sessionId}-${index}`,
          role: messageType === 'HumanMessage' ? 'user'
              : messageType === 'AIMessage' ? 'assistant'
              : 'system',
          content: typeof msg.content === 'string'
            ? msg.content
            : JSON.stringify(msg.content),
          timestamp: typeof latestCheckpoint.metadata?.created_at === 'string'
            ? latestCheckpoint.metadata.created_at
            : new Date().toISOString(),
          metadata: {
            checkpoint_id: latestCheckpoint.config.configurable?.checkpoint_id,
            message_index: index,
          },
        };
      });

      serviceLogger.info('Message history retrieved', {
        sessionId,
        messageCount: formattedMessages.length,
      });

      return formattedMessages;
    },
  };
};

export type ChatService = ReturnType<typeof createChatService>;
