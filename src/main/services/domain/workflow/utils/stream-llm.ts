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
 * - Returns complete response content (and optional reasoning) for both modes
 *
 * USAGE:
 * ```typescript
 * const streamMode = config.configurable?.llmStreamMode as boolean | undefined;
 * const { content, reasoning } = await streamLLM({
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
 * - Backward compatible streaming toggle (undefined = non-streaming)
 * - Minimal code changes in nodes
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AIMessageChunk, BaseMessage, ContentBlock } from '@langchain/core/messages';
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
 * Result of a streamLLM call.
 *
 * - `content`: The user-visible response text.
 * - `reasoning`: Optional model reasoning/thinking text (if provided via content blocks).
 */
export interface StreamLLMResult {
  content: string;
  reasoning?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTextBlock(block: unknown): block is ContentBlock.Text {
  return (
    isObject(block) &&
    block.type === 'text' &&
    typeof (block as Record<string, unknown>).text === 'string'
  );
}

function isReasoningBlock(block: unknown): block is ContentBlock.Reasoning {
  return (
    isObject(block) &&
    block.type === 'reasoning' &&
    typeof (block as Record<string, unknown>).reasoning === 'string'
  );
}

/**
 * Extract reasoning text from LangChain content blocks.
 *
 * Returns:
 * - `undefined` when no reasoning blocks exist
 * - `''` when reasoning blocks exist but are empty
 */
function extractReasoning(chunk: Pick<AIMessageChunk, 'content'>): string | undefined {
  const { content } = chunk;

  if (!Array.isArray(content)) {
    return undefined;
  }

  let sawReasoning = false;
  let reasoning = '';

  for (const block of content) {
    if (isReasoningBlock(block)) {
      sawReasoning = true;
      reasoning += block.reasoning;
    }
  }

  return sawReasoning ? reasoning : undefined;
}

/**
 * Extract user-visible text from LangChain content.
 */
function extractText(chunk: Pick<AIMessageChunk, 'content'>): string {
  const { content } = chunk;

  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  let text = '';
  for (const block of content) {
    if (isTextBlock(block)) {
      text += block.text;
    }
  }

  return text;
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
 * @returns Object containing `content` and optional `reasoning`
 *
 * @example
 * ```typescript
 * const streamMode = config.configurable?.llmStreamMode as boolean | undefined;
 * const { content, reasoning } = await streamLLM({
 *   model: await deps.providerFactory.getModel(),
 *   messages: formattedMessages,
 *   config,
 *   streamMode,
 * });
 * // No manual emitter calls needed - streamLLM handles it
 * ```
 */
export async function streamLLM(options: StreamLLMOptions): Promise<StreamLLMResult> {
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
    let fullReasoning = '';
    let reasoningStarted = false;
    let reasoningEnded = false;
    const stream = await model.stream(messages);

    for await (const chunk of stream) {
      const reasoningDelta = extractReasoning(chunk);
      if (reasoningDelta !== undefined) {
        if (!reasoningStarted) {
          emitter.reasoningStart(messageId);
          reasoningStarted = true;
        }

        fullReasoning += reasoningDelta;
        if (reasoningDelta.length > 0) {
          emitter.reasoningDelta(messageId, reasoningDelta);
        }
      }

      const textDelta = extractText(chunk);
      if (textDelta.length > 0) {
        if (reasoningStarted && !reasoningEnded && reasoningDelta === undefined) {
          emitter.reasoningEnd(messageId);
          reasoningEnded = true;
        }
        fullContent += textDelta;
        emitter.textDelta(messageId, textDelta);
      }
    }

    if (reasoningStarted && !reasoningEnded) {
      emitter.reasoningEnd(messageId);
    }
    emitter.textEnd(messageId);
    return {
      content: fullContent,
      reasoning: reasoningStarted ? fullReasoning : undefined,
    };
  }

  // Non-streaming: invoke and optionally emit as single chunk
  const response = await model.invoke(messages);
  const content = extractText(response);
  const reasoningDelta = extractReasoning(response);

  if (hasWriter) {
    const emitter = createChunkEmitter(config);
    emitter.textStart(messageId);

    if (reasoningDelta !== undefined) {
      emitter.reasoningStart(messageId);
      if (reasoningDelta.length > 0) {
        emitter.reasoningDelta(messageId, reasoningDelta);
      }
      emitter.reasoningEnd(messageId);
    }

    emitter.textDelta(messageId, content);
    emitter.textEnd(messageId);
  }

  return {
    content,
    reasoning: reasoningDelta !== undefined ? reasoningDelta : undefined,
  };
}
