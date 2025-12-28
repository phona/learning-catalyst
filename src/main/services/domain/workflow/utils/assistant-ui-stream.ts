/**
 * AI SDK Streaming Protocol Utilities
 *
 * PURPOSE:
 * Converts LangGraph workflow node outputs to AI SDK Streaming Protocol format.
 * This enables seamless integration with @assistant-ui/react-ai-sdk components.
 *
 * AI SDK PROTOCOL:
 * See: @assistant-ui/react-ai-sdk runtime
 *
 * CHUNK TYPES:
 * - text-start/text-delta/text-end: Incremental assistant text
 * - tool-input-start/tool-input-delta/tool-input-available/tool-output-available: Tool execution
 * - error: Error message
 * - finish: End of stream
 *
 * DESIGN PRINCIPLE:
 * Pure functions that transform workflow state to stream chunks without side effects.
 * Simple, testable, and maintainable.
 *
 * WHY THIS EXISTS:
 * 1. LangGraph streams node outputs as { nodeName: state } pairs
 * 2. AI SDK expects SSE-formatted data stream chunks
 * 3. This utility bridges the gap between the two formats
 * 4. Ensures consistent protocol compliance across the application
 */

import { isInterruptEvent } from '../interrupt';

/**
 * AI SDK Streaming Protocol chunk types
 * Reference: @assistant-ui/react-ai-sdk runtime
 */
export type DataStreamChunkType =
  | 'text-start'
  | 'text-delta'
  | 'text-end'
  | 'tool-input-start'
  | 'tool-input-delta'
  | 'tool-input-available'
  | 'tool-output-available'
  | 'reasoning-start'
  | 'reasoning-delta'
  | 'reasoning-end'
  | 'error'
  | 'finish'
  | 'abort';

/**
 * Base chunk interface
 */
interface BaseChunk {
  type: DataStreamChunkType;
}

/**
 * Text start chunk - begins a text message
 */
export interface TextStartChunk extends BaseChunk {
  type: 'text-start';
  id: string;
}

/**
 * Text delta chunk - incremental assistant text
 */
export interface TextDeltaChunk extends BaseChunk {
  type: 'text-delta';
  id: string;
  delta: string;
}

/**
 * Text end chunk - ends a text message
 */
export interface TextEndChunk extends BaseChunk {
  type: 'text-end';
  id: string;
}

/**
 * Tool input start chunk - begins tool input
 */
export interface ToolInputStartChunk extends BaseChunk {
  type: 'tool-input-start';
  toolCallId: string;
  toolName: string;
}

/**
 * Tool input delta chunk - streaming tool arguments
 */
export interface ToolInputDeltaChunk extends BaseChunk {
  type: 'tool-input-delta';
  toolCallId: string;
  inputTextDelta: string;
}

/**
 * Tool input available chunk - arguments ready
 */
export interface ToolInputAvailableChunk extends BaseChunk {
  type: 'tool-input-available';
  toolCallId: string;
  toolName: string;
  input?: unknown;
}

/**
 * Tool output available chunk - tool execution complete
 *
 * REQUIRED FIELDS per AI SDK Protocol:
 * - toolCallId: Unique identifier for this tool invocation
 * - output: The actual result data from the tool execution
 *
 * This data is passed directly to tool renderers in the UI.
 * Structure depends on the specific workflow node type.
 *
 * Use discriminated union for success/error handling:
 * - Success: { ok: true, data: T }
 * - Error: { ok: false, error: { message: string } }
 */
export interface ToolOutputAvailableChunk extends BaseChunk {
  type: 'tool-output-available';
  toolCallId: string;
  output:
    | { ok: true; data: unknown }
    | { ok: false; error: { message: string } };
}

/**
 * Reasoning start chunk - begins reasoning stream
 */
export interface ReasoningStartChunk extends BaseChunk {
  type: 'reasoning-start';
  id: string;
}

/**
 * Reasoning delta chunk - streaming reasoning
 */
export interface ReasoningDeltaChunk extends BaseChunk {
  type: 'reasoning-delta';
  id: string;
  delta: string;
}

/**
 * Reasoning end chunk - ends reasoning stream
 */
export interface ReasoningEndChunk extends BaseChunk {
  type: 'reasoning-end';
  id: string;
}

/**
 * Error chunk - error message
 */
export interface ErrorChunk extends BaseChunk {
  type: 'error';
  errorText: string;
}

/**
 * Finish chunk - end of stream
 */
export interface FinishChunk extends BaseChunk {
  type: 'finish';
}

/**
 * Abort chunk - stream aborted
 */
export interface AbortChunk extends BaseChunk {
  type: 'abort';
}

/**
 * Union type of all data stream chunks
 */
export type DataStreamChunk =
  | TextStartChunk
  | TextDeltaChunk
  | TextEndChunk
  | ToolInputStartChunk
  | ToolInputDeltaChunk
  | ToolInputAvailableChunk
  | ToolOutputAvailableChunk
  | ReasoningStartChunk
  | ReasoningDeltaChunk
  | ReasoningEndChunk
  | ErrorChunk
  | FinishChunk
  | AbortChunk;

/**
 * Convert workflow node output to AI SDK Streaming Protocol chunks
 *
 * AI SDK PROTOCOL - ALL MESSAGES MUST USE TEXT ENVELOPE:
 * Every message must be wrapped in text-start/text-end envelope:
 * 1. text-start - begins the message envelope (with id)
 * 2. [optional tool chunks]
 * 3. [optional text-delta chunks]
 * 4. text-end - ends the message envelope (with id)
 *
 * ASSISTANT MESSAGES:
 * - Simple conversational text
 * - Structure: text-start → text-delta → text-end
 *
 * TOOL MESSAGES:
 * - Structured data/execution results
 * - Structure: text-start → tool-input-start → tool-input-delta → tool-input-available → tool-output-available → text-end
 * - Tools use toolName
 *
 * ERROR HANDLING:
 * - If node has 'error' field, returns single error chunk
 * - Errors stop further processing for that node
 *
 * @param nodeName - Node name as string (e.g., 'TOPIC_PARSE', 'ASSESS')
 * @param nodeState - State/output object from the workflow node
 * @returns Array of SSE-formatted strings ready for replyPort.postMessage()
 *
 * USAGE:
 * const chunks = toAssistantUIStream('Practice', { messages: [...], sessionBlueprint: {...} });
 * chunks.forEach(chunk => replyPort.postMessage(chunk));
 *
 * EXAMPLE OUTPUT:
 * // Assistant node:
 * [
 *   'data: {"type":"text-start","id":"msg-1"}\n\n',
 *   'data: {"type":"text-delta","id":"msg-1","delta":"Hello"}\n\n',
 *   'data: {"type":"text-end","id":"msg-1"}\n\n'
 * ]
 *
 * // Tool node:
 * [
 *   'data: {"type":"text-start","id":"msg-1"}\n\n',
 *   'data: {"type":"tool-input-start","toolName":"Practice"}\n\n',
 *   'data: {"type":"tool-input-delta","toolName":"Practice","inputTextDelta":"{}"}\n\n',
 *   'data: {"type":"tool-input-available","toolName":"Practice"}\n\n',
 *   'data: {"type":"tool-output-available","toolName":"Practice"}\n\n',
 *   'data: {"type":"text-end","id":"msg-1"}\n\n'
 * ]
 */
/**
 * Async generator function that converts workflow stream to AI SDK Streaming Protocol chunks
 *
 * Accepts the raw workflow stream from LangGraph.stream() and converts it to AI SDK protocol.
 * This version handles streamMode: ['messages', 'custom'] which can yield:
 * - Custom events: ['custom', DataStreamChunk]
 * - Messages: ['messages', StreamMessageOutput]
 *
 * PHILOSOPHY:
 * - Direct pass-through for custom events (already AI SDK chunks)
 * - Translation for messages (convert to AI SDK chunks)
 * - Zero unnecessary processing or transformation
 *
 * AI SDK PROTOCOL - ALL MESSAGES MUST USE TEXT ENVELOPE:
 * Every message must be wrapped in text-start/text-end envelope:
 * 1. text-start - begins the message envelope (with id)
 * 2. [optional tool chunks]
 * 3. [optional text-delta chunks]
 * 4. text-end - ends the message envelope (with id)
 *
 * @param workflowStream - AsyncIterable from workflowGraph.stream() with streamMode: ['messages', 'custom']
 * @returns AsyncGenerator yielding SSE-formatted strings ready for replyPort.postMessage()
 *
 * USAGE:
 * for await (const chunk of toAssistantUIStream(workflowStream)) {
 *   replyPort.postMessage(chunk);
 * }
 *
 * STREAM CONTENT:
 * - Custom events: Already formatted AI SDK chunks, pass through directly
 * - Messages: Need conversion from LangChain format to AI SDK format
 *
 * EXAMPLE OUTPUT:
 * 'data: {"type":"text-start","id":"msg-0"}\n\n'
 * 'data: {"type":"text-delta","id":"msg-0","delta":"Hello"}\n\n'
 * 'data: {"type":"text-end","id":"msg-0"}\n\n'
 */
export async function* toAssistantUIStream(
  workflowStream: AsyncIterable<[string, unknown]>
): AsyncGenerator<string, void, unknown> {
  const iterator = workflowStream[Symbol.asyncIterator]();
  let interrupted = false;
  let completed = false;

  try {
    while (true) {
      const { value, done } = await iterator.next();
      if (done) {
        completed = true;
        break;
      }

      const [eventType, data] = value;

      // Handle custom events (AI SDK chunks emitted directly from nodes)
      // Format: ['custom', DataStreamChunk]
      if (eventType === 'custom' && data && typeof data === 'object' && 'type' in data) {
        yield formatSSE(data as DataStreamChunk);
        continue;
      }

      // Interrupt is a turn boundary: end iteration immediately so the handler can emit `finish`
      // and close the stream without waiting for resume.
      if (eventType !== 'custom' && isInterruptEvent(data)) {
        interrupted = true;
        break;
      }

      // Ignore all other non-custom events (messages/updates noise).
    }
  } finally {
    if (interrupted) {
      // End UI stream now, but wait one tick before canceling upstream
      // so post-interrupt checkpoint writes can finish.
      deferIteratorCloseForInterrupt(iterator);
    } else if (!completed) {
      await closeIteratorNow(iterator);
    }
  }
}

/**
 * Format a chunk as SSE (Server-Sent Events)
 *
 * Adds the required 'data: ' prefix and double newline separator
 *
 * @param chunk - Data stream chunk
 * @returns SSE-formatted string: "data: {...}\n\n"
 *
 * EXAMPLE:
 * formatSSE({ type: 'text-delta', textDelta: 'Hello' })
 * // Returns: 'data: {"type":"text-delta","textDelta":"Hello"}\n\n'
 */
function formatSSE(chunk: DataStreamChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

function ignoreCancelError(_error: unknown): void {
  // Cleanup errors are not actionable here; keep stream stable.
}

async function closeIteratorNow(iterator: AsyncIterator<unknown>): Promise<void> {
  if (typeof iterator.return !== 'function') return;
  try {
    await iterator.return();
  } catch (error) {
    ignoreCancelError(error);
  }
}

function deferIteratorCloseForInterrupt(iterator: AsyncIterator<unknown>): void {
  if (typeof iterator.return !== 'function') return;
  setTimeout(() => {
    try {
      const result = iterator.return?.();
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        void (result as Promise<unknown>).catch(ignoreCancelError);
      }
    } catch (error) {
      ignoreCancelError(error);
    }
  }, 0);
}

/**
 * Create a finish chunk to end the stream
 *
 * @returns SSE-formatted finish chunk
 *
 * USAGE:
 * replyPort.postMessage(createFinishChunk());
 */
export function createFinishChunk(): string {
  return formatSSE({ type: 'finish' });
}

/**
 * Create an error chunk for stream-level errors
 *
 * Stream-level errors are fatal runtime/protocol/transport errors that abort the entire stream.
 * NOT used for tool failures (use tool-output-error for those).
 *
 * @param errorText - The error message
 * @returns SSE-formatted error chunk
 *
 * USAGE:
 * replyPort.postMessage(createErrorChunk('Failed to connect to AI provider'));
 */
export function createErrorChunk(errorText: string): string {
  return formatSSE({ type: 'error', errorText });
}

/**
 * Create an abort chunk for cancelled streams
 *
 * @returns SSE-formatted abort chunk
 *
 * USAGE:
 * replyPort.postMessage(createAbortChunk());
 */
export function createAbortChunk(): string {
  return formatSSE({ type: 'abort' });
}
