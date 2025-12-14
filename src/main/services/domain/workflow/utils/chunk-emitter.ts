/**
 * AI SDK Chunk Emitter Utility
 *
 * PURPOSE:
 * Provides a clean, type-safe way for workflow nodes to emit AI SDK streaming protocol
 * chunks directly via config.writer(). This enables nodes to have direct control over
 * their streaming output without translation layers or custom event schemas.
 *
 * PHILOSOPHY:
 * - Direct emission: Nodes emit exactly what the frontend expects
 * - Type safety: Full TypeScript coverage with proper types
 * - Zero translation: No intermediate event schemas or mapping
 * - Self-documenting: Clear chunk types and purposes
 *
 * USAGE PATTERN:
 * Nodes create an emitter with config.writer and use it to emit chunks:
 *
 * ```typescript
 * const emitter = createChunkEmitter(config);
 *
 * emitter.textStart(messageId);
 * emitter.toolInputStart(toolCallId, toolName);
 * emitter.toolInputAvailable(toolCallId, toolName, input);
 *
 * const result = await doWork();
 *
 * emitter.toolOutputAvailable(toolCallId, {
 *   ok: true,
 *   data: result
 * });
 *
 * emitter.textEnd(messageId);
 * ```
 *
 * AI SDK PROTOCOL:
 * - All messages use text envelope: text-start → [chunks] → text-end
 * - Tool messages: text-start → tool-input-start → tool-input-available → tool-output-available → text-end
 * - Assistant messages: text-start → text-delta → text-end
 * - Errors: error chunk (stops processing)
 * - Stream end: finish chunk
 */

import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import type {
  DataStreamChunk,
  TextStartChunk,
  TextDeltaChunk,
  TextEndChunk,
  ToolInputStartChunk,
  ToolInputAvailableChunk,
  ToolOutputAvailableChunk,
  ReasoningStartChunk,
  ReasoningDeltaChunk,
  ReasoningEndChunk,
  ErrorChunk,
  FinishChunk,
  AbortChunk
} from './assistant-ui-stream';

/**
 * Creates a chunk emitter bound to a specific config.writer instance.
 *
 * DESIGN:
 * - Factory pattern for creating emitter instances
 * - Each emitter is bound to one config.writer
 * - Methods return void (emit directly to writer)
 * - Type-safe chunk creation with proper AI SDK protocol
 *
 * @param config - LangGraphRunnableConfig with optional writer
 * @returns ChunkEmitter instance with type-safe emission methods
 *
 * @example
 * ```typescript
 * const emitter = createChunkEmitter(config);
 * emitter.textStart('msg-1');
 * emitter.textDelta('msg-1', 'Hello');
 * emitter.textEnd('msg-1');
 * ```
 */
export function createChunkEmitter(config: LangGraphRunnableConfig): ChunkEmitter {
  const writer = config.writer;

  /**
   * Emits a chunk via the writer function.
   *
   * @param chunk - Data stream chunk to emit
   */
  const emit = (chunk: DataStreamChunk): void => {
    writer(chunk as any);
  };

  // Throw if writer is not available - chunk emission requires streaming context
  if (!writer) {
    throw new Error(
      'ChunkEmitter requires a writer function in config. ' +
      'This node must be called with streaming enabled (stream() not invoke()).'
    );
  }

  return {
    textStart: (id: string): void => {
      emit({
        type: 'text-start',
        id
      } satisfies TextStartChunk);
    },

    textDelta: (id: string, delta: string): void => {
      emit({
        type: 'text-delta',
        id,
        delta
      } satisfies TextDeltaChunk);
    },

    textEnd: (id: string): void => {
      emit({
        type: 'text-end',
        id
      } satisfies TextEndChunk);
    },

    toolInputStart: (toolCallId: string, toolName: string): void => {
      emit({
        type: 'tool-input-start',
        toolCallId,
        toolName
      } satisfies ToolInputStartChunk);
    },

    toolInputAvailable: (
      toolCallId: string,
      toolName: string,
      input: unknown
    ): void => {
      emit({
        type: 'tool-input-available',
        toolCallId,
        toolName,
        input
      } satisfies ToolInputAvailableChunk);
    },

    toolOutputAvailable: (
      toolCallId: string,
      output: { ok: true; data: unknown } | { ok: false; error: { message: string } }
    ): void => {
      emit({
        type: 'tool-output-available',
        toolCallId,
        output
      } satisfies ToolOutputAvailableChunk);
    },

    reasoningStart: (id: string): void => {
      emit({
        type: 'reasoning-start',
        id
      } satisfies ReasoningStartChunk);
    },

    reasoningDelta: (id: string, delta: string): void => {
      emit({
        type: 'reasoning-delta',
        id,
        delta
      } satisfies ReasoningDeltaChunk);
    },

    reasoningEnd: (id: string): void => {
      emit({
        type: 'reasoning-end',
        id
      } satisfies ReasoningEndChunk);
    },

    error: (errorText: string): void => {
      emit({
        type: 'error',
        errorText
      } satisfies ErrorChunk);
    },

    finish: (): void => {
      emit({
        type: 'finish'
      } satisfies FinishChunk);
    },

    abort: (): void => {
      emit({
        type: 'abort'
      } satisfies AbortChunk);
    }
  };
}

/**
 * Chunk Emitter Interface
 *
 * Provides type-safe methods for emitting AI SDK protocol chunks.
 * Each method corresponds to a specific chunk type in the protocol.
 *
 * DESIGN PRINCIPLES:
 * - Void return type (emits directly)
 * - Type-safe parameters
 * - Self-documenting method names
 * - Follows AI SDK protocol structure
 */
export interface ChunkEmitter {
  /**
   * Starts a text message envelope.
   * REQUIRED for all messages (assistant and tool).
   *
   * @param id - Unique message identifier
   */
  textStart: (id: string) => void;

  /**
   * Emits incremental text content for assistant messages.
   * Used within text-start → text-end envelope.
   *
   * @param id - Message ID (must match text-start)
   * @param delta - Text content to add
   */
  textDelta: (id: string, delta: string) => void;

  /**
   * Ends a text message envelope.
   * REQUIRED to close text-start envelope.
   *
   * @param id - Message ID (must match text-start)
   */
  textEnd: (id: string) => void;

  /**
   * Starts tool input phase.
   * Used for tool messages to indicate tool invocation.
   *
   * @param toolCallId - Unique tool call identifier
   * @param toolName - Name of the tool/node
   */
  toolInputStart: (toolCallId: string, toolName: string) => void;

  /**
   * Indicates tool input is available.
   * Contains the parameters passed to the tool.
   *
   * @param toolCallId - Tool call ID (must match tool-input-start)
   * @param toolName - Tool name
   * @param input - Tool input parameters
   */
  toolInputAvailable: (
    toolCallId: string,
    toolName: string,
    input: unknown
  ) => void;

  /**
   * Indicates tool execution is complete.
   * Contains the tool result (success or error).
   *
   * @param toolCallId - Tool call ID (must match tool-input-start)
   * @param output - Tool execution result
   */
  toolOutputAvailable: (
    toolCallId: string,
    output: { ok: true; data: unknown } | { ok: false; error: { message: string } }
  ) => void;

  /**
   * Starts reasoning stream (for models that provide reasoning).
   *
   * @param id - Unique reasoning identifier
   */
  reasoningStart: (id: string) => void;

  /**
   * Emits incremental reasoning content.
   *
   * @param id - Reasoning ID (must match reasoning-start)
   * @param delta - Reasoning content
   */
  reasoningDelta: (id: string, delta: string) => void;

  /**
   * Ends reasoning stream.
   *
   * @param id - Reasoning ID (must match reasoning-start)
   */
  reasoningEnd: (id: string) => void;

  /**
   * Emits error chunk (fatal stream error).
   * Stops all further processing for this stream.
   *
   * @param errorText - Error message
   */
  error: (errorText: string) => void;

  /**
   * Emits finish chunk (normal stream completion).
   * Indicates successful end of stream.
   */
  finish: () => void;

  /**
   * Emits abort chunk (stream cancelled).
   * Indicates stream was intentionally stopped.
   */
  abort: () => void;
}

/**
 * Helper to generate unique IDs for messages and tool calls.
 *
 * PURPOSE:
 * Ensures unique identifiers across the stream to prevent conflicts.
 * Uses timestamp + random component for uniqueness.
 *
 * @param prefix - Prefix for the ID (e.g., 'msg', 'tool')
 * @returns Unique identifier string
 *
 * @example
 * const messageId = generateId('msg'); // 'msg-1704067200-abc123'
 * const toolCallId = generateId('tool'); // 'tool-1704067200-def456'
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Validates that a chunk has the required fields for its type.
 *
 * @param chunk - Chunk to validate
 * @returns true if chunk is valid
 *
 * @example
 * const chunk = { type: 'text-start', id: 'msg-1' };
 * if (isValidChunk(chunk)) {
 *   // Safe to emit
 * }
 */
export function isValidChunk(chunk: unknown): chunk is DataStreamChunk {
  if (typeof chunk !== 'object' || chunk === null) {
    return false;
  }

  const { type } = chunk as Record<string, unknown>;

  if (typeof type !== 'string') {
    return false;
  }

  const validTypes = [
    'text-start',
    'text-delta',
    'text-end',
    'tool-input-start',
    'tool-input-available',
    'tool-output-available',
    'reasoning-start',
    'reasoning-delta',
    'reasoning-end',
    'error',
    'finish',
    'abort'
  ];

  return validTypes.includes(type);
}

/**
 * Type guard to check if a chunk is a text chunk.
 *
 * @param chunk - Chunk to check
 * @returns true if chunk is text-related
 */
export function isTextChunk(
  chunk: DataStreamChunk
): chunk is TextStartChunk | TextDeltaChunk | TextEndChunk {
  return (
    chunk.type === 'text-start' ||
    chunk.type === 'text-delta' ||
    chunk.type === 'text-end'
  );
}

/**
 * Type guard to check if a chunk is a tool chunk.
 *
 * @param chunk - Chunk to check
 * @returns true if chunk is tool-related
 */
export function isToolChunk(
  chunk: DataStreamChunk
): chunk is
  | ToolInputStartChunk
  | ToolInputAvailableChunk
  | ToolOutputAvailableChunk {
  return (
    chunk.type === 'tool-input-start' ||
    chunk.type === 'tool-input-available' ||
    chunk.type === 'tool-output-available'
  );
}

/**
 * Type guard to check if a chunk indicates completion or error.
 *
 * @param chunk - Chunk to check
 * @returns true if chunk ends processing
 */
export function isTerminalChunk(
  chunk: DataStreamChunk
): chunk is ErrorChunk | FinishChunk | AbortChunk {
  return (
    chunk.type === 'error' ||
    chunk.type === 'finish' ||
    chunk.type === 'abort'
  );
}

/**
 * ADDING NEW CHUNK TYPES - Checklist
 *
 * When adding a new AI SDK chunk type:
 *
 * 1. Add type to DataStreamChunk union in assistant-ui-stream.ts
 * 2. Add interface for the chunk (e.g., MyChunk extends BaseChunk)
 * 3. Add method to ChunkEmitter interface
 * 4. Implement method in createChunkEmitter
 * 5. Add type guard if needed (isMyChunk)
 * 6. Add JSDoc comment explaining usage
 * 7. Add example to usage documentation
 *
 * Example:
 *
 * ```typescript
 * // 1. Add to union type
 * export type DataStreamChunk =
 *   | ...
 *   | MyChunk;
 *
 * // 2. Add interface
 * export interface MyChunk extends BaseChunk {
 *   type: 'my-chunk';
 *   data: unknown;
 * }
 *
 * // 3. Add to emitter interface
 * export interface ChunkEmitter {
 *   myChunk: (data: unknown) => void;
 * }
 *
 * // 4. Implement in factory
 * const emitter = {
 *   myChunk: (data: unknown) => {
 *     emit({ type: 'my-chunk', data } satisfies MyChunk);
 *   }
 * };
 * ```
 */
