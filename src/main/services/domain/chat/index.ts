import { LoggerService } from "../../core/logger/logger-service";
import { ILogger } from "../../types";
import { generateAITitle } from "./title-generation";
import { ProviderFactory } from "@/main/services/agent/provider-factory";
import type { SQLiteCheckpointSaver } from "@/main/services/core/checkpoints/SQLiteCheckpointSaver";
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";

/**
 * Display-ready message structure for chat history
 * Matches ChatHistoryMessage from shared API types
 */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  metadata?: {
    checkpoint_id?: string;
    message_index: number;
    run_id?: string;
    invalid_tool_calls?: any[];
    response_metadata?: Record<string, unknown>;
    // Tool-specific metadata (for ToolMessage)
    tool_call_id?: string;
    tool_name?: string;
    tool_status?: string;
    artifact?: any;
  };
}

/**
 * Direct converter from checkpoint format to ChatMessage format
 *
 * Checkpoints store messages as serialized objects:
 * {
 *   id: ["langchain_core", "messages", "HumanMessage"],
 *   kwargs: { content: "...", additional_kwargs: {}, response_metadata: {} },
 *   lc: 1,
 *   type: "constructor"
 * }
 */
function convertToChatMessage(
  msg: any,
  index: number,
  sessionId: string,
  checkpointMetadata?: Record<string, unknown>,
  checkpointId?: string
): ChatMessage {
  // Check if this is a serialized checkpoint message
  if (msg &&
      typeof msg === 'object' &&
      !Array.isArray(msg) &&
      Array.isArray(msg.id) &&
      msg.kwargs) {

    const messageType = msg.id[2]; // e.g., "HumanMessage", "AIMessage", "ToolMessage"
    const content = msg.kwargs.content;

    // Map ToolMessage to assistant role with tool metadata
    const role = messageType === 'HumanMessage' ? 'user'
      : messageType === 'ToolMessage' ? 'assistant'
      : 'assistant';

    return {
      id: `${sessionId}-${index}`,
      role,
      content: typeof content === 'string' ? content : JSON.stringify(content),
      timestamp: typeof checkpointMetadata?.created_at === 'string'
        ? checkpointMetadata.created_at
        : new Date().toISOString(),
      tool_calls: msg.kwargs.tool_calls,
      metadata: {
        checkpoint_id: checkpointId,
        message_index: index,
        run_id: msg.kwargs.id,
        invalid_tool_calls: msg.kwargs.invalid_tool_calls,
        response_metadata: msg.kwargs.response_metadata,
        // Tool-specific metadata
        tool_call_id: msg.kwargs.tool_call_id,
        tool_name: msg.kwargs.name,
        tool_status: msg.kwargs.status,
      },
    };
  }

  // Handle class instances (from memory)
  if (HumanMessage.isInstance(msg)) {
    return {
      id: `${sessionId}-${index}`,
      role: 'user',
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      timestamp: typeof checkpointMetadata?.created_at === 'string'
        ? checkpointMetadata.created_at
        : new Date().toISOString(),
      metadata: {
        checkpoint_id: checkpointId,
        message_index: index,
      },
    };
  } else if (msg instanceof AIMessage) {
    return {
      id: `${sessionId}-${index}`,
      role: 'assistant',
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      timestamp: typeof checkpointMetadata?.created_at === 'string'
        ? checkpointMetadata.created_at
        : new Date().toISOString(),
      tool_calls: msg.tool_calls,
      metadata: {
        checkpoint_id: checkpointId,
        message_index: index,
        invalid_tool_calls: msg.invalid_tool_calls,
      },
    };
  } else if (ToolMessage.isInstance(msg)) {
    console.log('ToolMessage', msg);
    return {
      id: `${sessionId}-${index}`,
      role: 'assistant',
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      timestamp: typeof checkpointMetadata?.created_at === 'string'
        ? checkpointMetadata.created_at
        : new Date().toISOString(),
      metadata: {
        checkpoint_id: checkpointId,
        message_index: index,
        tool_call_id: msg.tool_call_id,
        tool_name: msg.name,
        tool_status: msg.status,
        artifact: msg.artifact,
      },
    };
  }

  // Fallback for unknown types
  return {
    id: `${sessionId}-${index}`,
    role: 'assistant',
    content: 'Unknown message type',
    timestamp: new Date().toISOString(),
    metadata: {
      checkpoint_id: checkpointId,
      message_index: index,
    },
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
      const rawMessages = latestCheckpoint.checkpoint.channel_values?.messages ?? [];
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
          latestCheckpoint.metadata,
          latestCheckpoint.config.configurable?.checkpoint_id
        )
      );

      serviceLogger.info('Message history retrieved', {
        sessionId,
        messageCount: formattedMessages.length,
      });

      return formattedMessages;
    },
  };
};

export type ChatService = ReturnType<typeof createChatService>;
