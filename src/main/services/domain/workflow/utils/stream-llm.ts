/**
 * LLM Streaming Utility
 *
 * PURPOSE:
 * Provides a unified abstraction for streaming vs non-streaming LLM calls in workflow nodes.
 * Handles both token-by-token streaming and complete response invocation based on config.
 *
 * DESIGN:
 * - Single function for both streaming and non-streaming modes
 * - Reuses existing createChunkEmitter for token emission
 * - Explicit === true check for stream mode (undefined/false both use invoke)
 * - Returns complete content for both modes (nodes need full response)
 *
 * USAGE:
 * ```typescript
 * const streamMode = config.configurable?.llmStreamMode as boolean | undefined;
 * const content = await streamLLM({
 *   model,
 *   messages,
 *   config,
 *   streamMode,
 * });
 * // No manual emitter calls - streamLLM handles it
 * ```
 *
 * PHILOSOPHY:
 * - Consistent pattern across all user-facing nodes
 * - Streaming behavior controlled by single config
 * - Backward compatible (undefined = non-streaming)
 * - Minimal code changes in nodes
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { createChunkEmitter, generateId } from './chunk-emitter';

/**
 * Options for streamLLM helper
 */
export interface StreamLLMOptions {
  /** LLM model instance to use for generation */
  model: BaseChatModel;
  /** Messages to send to the LLM */
  messages: BaseMessage[];
  /** LangGraph config with writer for chunk emission */
  config: LangGraphRunnableConfig;
  /** Optional message ID (generated if not provided) */
  messageId?: string;
  /** Enable streaming mode (explicit === true check) */
  streamMode?: boolean;
}

/**
 * Streams or invokes an LLM based on streamMode configuration.
 *
 * STREAMING PATH (streamMode === true):
 * 1. Generates unique message ID
 * 2. Emits text-start chunk
 * 3. Streams tokens via model.stream()
 * 4. Emits text-delta for each token
 * 5. Emits text-end chunk
 * 6. Returns complete accumulated content
 *
 * NON-STREAMING PATH (streamMode !== true):
 * 1. Invokes model.invoke() for complete response
 * 2. Emits text-start, text-delta (full content), text-end chunks (if writer available)
 * 3. Returns complete content
 *
 * NOTE: When config.writer is available, streamLLM handles all chunk emission.
 * Callers should NOT manually emit after calling this function when writer is present.
 *
 * @param options - StreamLLMOptions containing model, messages, config, and stream mode
 * @returns Complete LLM response content as string
 *
 * @example
 * ```typescript
 * const streamMode = config.configurable?.llmStreamMode as boolean | undefined;
 * const content = await streamLLM({
 *   model: await deps.providerFactory.getModel(),
 *   messages: formattedMessages,
 *   config,
 *   streamMode,
 * });
 * // No manual emitter calls needed - streamLLM handles it
 * ```
 */
export async function streamLLM(options: StreamLLMOptions): Promise<string> {
  const { model, messages, config, streamMode } = options;
  const messageId = options.messageId ?? generateId('msg');

  // Check if config.writer is available for chunk emission
  const hasWriter = !!config.writer;

  // Explicit === true check (undefined, false both use invoke)
  // This ensures only explicit true enables streaming
  if (streamMode === true) {
    if (!hasWriter) {
      throw new Error(
        'Streaming mode requires config.writer to be available. ' +
        'This node must be called with streaming enabled (stream() not invoke()).'
      );
    }
    const emitter = createChunkEmitter(config);
    emitter.textStart(messageId);

    let fullContent = '';
    const stream = await model.stream(messages);

    for await (const chunk of stream) {
      const delta = chunk.content ?? '';
      if (typeof delta === 'string') {
        fullContent += delta;
        emitter.textDelta(messageId, delta);
      }
    }

    emitter.textEnd(messageId);
    return fullContent;
  }

  // Non-streaming: invoke and optionally emit as single chunk
  const response = await model.invoke(messages);
  const content = String(response.content ?? '');

  if (hasWriter) {
    const emitter = createChunkEmitter(config);
    emitter.textStart(messageId);
    emitter.textDelta(messageId, content);
    emitter.textEnd(messageId);
  }

  return content;
}
