import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import type { ChatMessage } from './chat-message-types';
import { convertToolCall } from './tool-call-converter';

type SerializedCheckpointMessage = {
  id?: unknown;
  kwargs?: Record<string, unknown> & {
    content?: unknown;
    tool_calls?: unknown;
  };
};

/**
 * Direct converter from checkpoint format to ChatMessage format.
 *
 * Checkpoints store messages as serialized objects:
 * {
 *   id: ["langchain_core", "messages", "HumanMessage"],
 *   kwargs: { content: "...", additional_kwargs: {}, response_metadata: {} },
 *   lc: 1,
 *   type: "constructor"
 * }
 */
export function convertToChatMessage(
  msg: unknown,
  index: number,
  sessionId: string,
  checkpointMetadata: Record<string, unknown> | undefined,
  checkpointId?: string,
): ChatMessage {
  // Serialized checkpoint message
  const serialized = msg as SerializedCheckpointMessage | undefined;
  if (
    serialized &&
    typeof serialized === 'object' &&
    !Array.isArray(serialized) &&
    Array.isArray(serialized.id) &&
    typeof serialized.id[2] === 'string' &&
    serialized.kwargs &&
    typeof serialized.kwargs === 'object'
  ) {
    const messageType = serialized.id[2]; // e.g., "HumanMessage", "AIMessage", "ToolMessage"
    const content = serialized.kwargs.content;

    const role =
      messageType === 'HumanMessage'
        ? 'user'
        : messageType === 'ToolMessage'
          ? 'assistant'
          : 'assistant';

    return {
      id: `${sessionId}-${index}`,
      role,
      content: typeof content === 'string' ? content : JSON.stringify(content),
      timestamp:
        typeof checkpointMetadata?.created_at === 'string'
          ? checkpointMetadata.created_at
          : new Date().toISOString(),
      tool_calls: Array.isArray(serialized.kwargs.tool_calls)
        ? serialized.kwargs.tool_calls.map(convertToolCall)
        : undefined,
      metadata: {
        checkpoint_id: checkpointId,
        message_index: index,
        run_id: typeof serialized.kwargs.id === 'string' ? serialized.kwargs.id : undefined,
        invalid_tool_calls: Array.isArray(serialized.kwargs.invalid_tool_calls)
          ? (serialized.kwargs.invalid_tool_calls as unknown[])
          : undefined,
        response_metadata:
          serialized.kwargs.response_metadata && typeof serialized.kwargs.response_metadata === 'object'
            ? (serialized.kwargs.response_metadata as Record<string, unknown>)
            : undefined,
        tool_call_id:
          typeof serialized.kwargs.tool_call_id === 'string'
            ? serialized.kwargs.tool_call_id
            : undefined,
        tool_name: typeof serialized.kwargs.name === 'string' ? serialized.kwargs.name : undefined,
        tool_status:
          typeof serialized.kwargs.status === 'string' ? serialized.kwargs.status : undefined,
      },
    };
  }

  // Class instances (in-memory)
  if (HumanMessage.isInstance(msg)) {
    return {
      id: `${sessionId}-${index}`,
      role: 'user',
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      timestamp:
        typeof checkpointMetadata?.created_at === 'string'
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
      timestamp:
        typeof checkpointMetadata?.created_at === 'string'
          ? checkpointMetadata.created_at
          : new Date().toISOString(),
      tool_calls: Array.isArray(msg.tool_calls) ? msg.tool_calls.map(convertToolCall) : undefined,
      metadata: {
        checkpoint_id: checkpointId,
        message_index: index,
        invalid_tool_calls: Array.isArray(msg.invalid_tool_calls)
          ? (msg.invalid_tool_calls as unknown[])
          : undefined,
      },
    };
  } else if (ToolMessage.isInstance(msg)) {
    return {
      id: `${sessionId}-${index}`,
      role: 'assistant',
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      timestamp:
        typeof checkpointMetadata?.created_at === 'string'
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

