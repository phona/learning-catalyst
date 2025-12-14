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

import type { BaseMessage } from '@langchain/core/messages';
import type { NormalizedMessage, WorkflowNodeOutput } from './normalization';
import { convertToPlainMessage, toOpenAIMessage } from './normalization';
import { NODE_NAME_TO_OPENAI_ROLE } from './role-mapping';
import { NodeName } from '../types';

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
 * ================================================================================
 * NODE-TYPE-SPECIFIC EXTRACTORS
 * ================================================================================
 *
 * These extractors convert workflow node output state into meaningful tool input
 * and output data for the AI SDK protocol. Each workflow node has a specific data
 * structure, and these extractors ensure we pass the right data to the UI.
 *
 * DESIGN PRINCIPLE:
 * - Each node type knows what data it produces
 * - Extractors handle missing or malformed data gracefully
 * - Return structured data that the UI can render meaningfully
 * - Use TypeScript to enforce data structure contracts
 */

/**
 * Input data extracted from TOPIC_PARSE node state.
 */
interface TopicParseInput {
  query: string;
  threshold: number;
  limit: number;
}

/**
 * Output data from TOPIC_PARSE node.
 */
interface TopicParseOutput {
  topic: string;
  relatedTopics: string[];
  confidence: number;
  matches: Array<{ name: string; score: number }>;
}

/**
 * Input data from TEACH node (conversational, minimal input needed).
 */
interface TeachInput {
  topic: string;
  interactionNumber: number;
  mode: 'initial_explanation' | 'interactive_teaching';
}

/**
 * Output data from TEACH node.
 */
interface TeachOutput {
  content: string;
  interactionCount: number;
  understandingLevel: number;
  readyForPractice: boolean;
}

/**
 * Input data from PRACTICE node.
 */
interface PracticeInput {
  topic: string;
  focusConcepts: string[];
  relatedConcepts: string[];
  exerciseCount: number;
}

/**
 * Output data from PRACTICE node.
 */
interface PracticeOutput {
  practiceContent: string;
  exercises: Array<{
    id: string;
    title: string;
    description: string;
    hints: string[];
  }>;
}

/**
 * Input data from ASSESS node.
 */
interface AssessInput {
  topic: string;
  conceptIds: string[];
  limit: number;
}

/**
 * Output data from ASSESS node.
 */
interface AssessOutput {
  confidence: number;
  gaps: string[];
  passCount: number;
  partialCount: number;
  failCount: number;
  rubricAverage?: number;
}

/**
 * Input data from PLAN node.
 */
interface PlanInput {
  level: string;
  timeAvailable: number;
  primaryConcept: string;
}

/**
 * Output data from PLAN node.
 */
interface PlanOutput {
  sessionBlueprint: {
    blocks: Array<{
      type: string;
      title: string;
      description: string;
      duration: number;
    }>;
    totalDuration: number;
    primaryConcept: string;
  };
}

/**
 * Extract tool input data from a workflow node state.
 *
 * @param nodeName - Name of the workflow node
 * @param nodeState - Raw state from the workflow node
 * @returns Structured input data appropriate for the node type
 *
 * DESIGN:
 * - Returns meaningful parameters that were used to generate the output
 * - Helps UI understand what the tool was asked to do
 * - Different nodes have different input structures
 */
function extractToolInput(nodeName: string, nodeState: Record<string, unknown>): Record<string, unknown> {
  switch (nodeName) {
    case NodeName.TOPIC_PARSE: {
      const messages = nodeState.messages as Array<{ content: string }> | undefined;
      const lastUserMsg = messages?.[messages.length - 1]?.content ?? '';
      return {
        query: lastUserMsg || (nodeState.topic as string) || '',
        threshold: 0.6,
        limit: 10,
      } satisfies TopicParseInput;
    }

    case NodeName.TEACH: {
      const interactionCount = nodeState.interactionCount as number | undefined;
      const mode = interactionCount === 1 ? 'initial_explanation' : 'interactive_teaching';
      return {
        topic: nodeState.topic as string,
        interactionNumber: interactionCount ?? 0,
        mode,
      } satisfies TeachInput;
    }

    case NodeName.PRACTICE: {
      // Try to extract concepts from knowledge search
      const searchContext = nodeState.searchContext as Record<string, unknown> | undefined;
      const focusConcepts = (searchContext?.focusConcepts as string[]) || [];
      const relatedConcepts = (searchContext?.relatedConcepts as string[]) || [];

      return {
        topic: nodeState.topic as string,
        focusConcepts,
        relatedConcepts,
        exerciseCount: 3,
      } satisfies PracticeInput;
    }

    case NodeName.ASSESS: {
      const topic = nodeState.topic as string;
      const conceptIds = nodeState.conceptIds as string[] | undefined;

      return {
        topic,
        conceptIds: conceptIds || [],
        limit: 100,
      } satisfies AssessInput;
    }

    case NodeName.PLAN: {
      const sessionBlueprint = nodeState.sessionBlueprint as Record<string, unknown> | undefined;
      return {
        level: sessionBlueprint?.level as string || 'intermediate',
        timeAvailable: sessionBlueprint?.timeAvailable as number || 30,
        primaryConcept: nodeState.topic as string,
      } satisfies PlanInput;
    }

    default:
      // For unknown nodes, return basic info
      return {
        nodeName,
        timestamp: Date.now(),
      };
  }
}

/**
 * Extract tool output data from a workflow node state.
 *
 * @param nodeName - Name of the workflow node
 * @param nodeState - Raw state from the workflow node
 * @returns Structured output data appropriate for the node type
 *
 * DESIGN:
 * - Returns the actual results produced by the node
 * - This is what gets displayed in the tool UI
 * - Different nodes return different result structures
 */
function extractToolOutput(nodeName: string, nodeState: Record<string, unknown>): Record<string, unknown> {
  switch (nodeName) {
    case NodeName.TOPIC_PARSE: {
      const messages = nodeState.messages as Array<{ content: string }> | undefined;
      const messageText = messages?.[0]?.content ?? '';
      const topic = nodeState.topic as string | undefined;

      // Parse related topics from message text
      const relatedMatch = messageText.match(/Related:\s*(.+)$/m);
      const relatedTopics = relatedMatch?.[1]?.split(',').map(t => t.trim()) || [];

      return {
        ok: true,
        data: {
          topic: topic || 'Unknown',
          relatedTopics,
          confidence: 0.9,
          matches: relatedTopics.map(name => ({ name, score: 0.85 })),
        },
      } satisfies { ok: true; data: TopicParseOutput };
    }

    case NodeName.TEACH: {
      const messages = nodeState.messages as Array<{ content: string }> | undefined;
      const content = messages?.[0]?.content ?? '';
      const interactionCount = nodeState.interactionCount as number | undefined;
      const understandingLevel = nodeState.understandingLevel as number | undefined;
      const readyForPractice = nodeState.readyForPractice as boolean | undefined;

      return {
        ok: true,
        data: {
          content,
          interactionCount: interactionCount ?? 0,
          understandingLevel: understandingLevel ?? 0,
          readyForPractice: readyForPractice ?? false,
        },
      } satisfies { ok: true; data: TeachOutput };
    }

    case NodeName.PRACTICE: {
      const messages = nodeState.messages as Array<{ content: string }> | undefined;
      const practiceContent = messages?.[0]?.content ?? '';
      const practicePrompt = nodeState.practicePrompt as string | undefined;

      // Parse exercises from content (simplified)
      // In production, this might be more structured
      const exerciseCount = 3;
      const exercises = Array.from({ length: exerciseCount }, (_, i) => ({
        id: `exercise-${i + 1}`,
        title: `Exercise ${i + 1}`,
        description: `Practice problem ${i + 1}`,
        hints: [`Hint ${i + 1}A`, `Hint ${i + 1}B`],
      }));

      return {
        ok: true,
        data: {
          practiceContent: practicePrompt || practiceContent,
          exercises,
        },
      } satisfies { ok: true; data: PracticeOutput };
    }

    case NodeName.ASSESS: {
      const messages = nodeState.messages as Array<{ content: string }> | undefined;
      const messageText = messages?.[0]?.content ?? '';
      const confidence = nodeState.confidence as number | undefined;
      const gaps = nodeState.gaps as string[] | undefined;

      // Parse confidence from message
      const confidenceMatch = messageText.match(/Confidence:\s*(\d+)%/);
      const confidencePercent = confidenceMatch?.[1] ? parseInt(confidenceMatch[1], 10) / 100 : confidence ?? 0.5;

      return {
        ok: true,
        data: {
          confidence: confidencePercent,
          gaps: gaps || [],
          passCount: 0,
          partialCount: 0,
          failCount: 0,
          rubricAverage: confidencePercent,
        },
      } satisfies { ok: true; data: AssessOutput };
    }

    case NodeName.PLAN: {
      const sessionBlueprint = nodeState.sessionBlueprint as Record<string, unknown> | undefined;

      return {
        ok: true,
        data: {
          sessionBlueprint: {
            blocks: (sessionBlueprint?.blocks as Array<Record<string, unknown>>) || [],
            totalDuration: sessionBlueprint?.totalDuration as number || 30,
            primaryConcept: nodeState.topic as string,
          },
        },
      } satisfies { ok: true; data: PlanOutput };
    }

    default:
      // For unknown nodes, return the raw state with messages
      const messages = nodeState.messages as Array<{ content: string }> | undefined;
      return {
        ok: true,
        data: {
          content: messages?.[0]?.content ?? '',
          rawState: nodeState,
        },
      } satisfies { ok: true; data: Record<string, unknown> };
  }
}

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
 * Each workflow chunk may contain multiple nodes, which are processed independently.
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
 * - If node has 'error' field, yields single error chunk
 * - Errors stop further processing for that node
 * - If tool has 'error' field, yields tool-output-error instead of tool-output-available
 *
 * @param workflowStream - AsyncIterable from workflowGraph.stream() (yields Record<string, WorkflowNodeOutput>)
 * @returns AsyncGenerator yielding SSE-formatted strings ready for replyPort.postMessage()
 *
 * USAGE:
 * for await (const chunk of toAssistantUIStream(workflowStream)) {
 *   replyPort.postMessage(chunk);
 * }
 *
 * EXAMPLE OUTPUT:
 * // Processing stream with 2 nodes (TEACH, Practice):
 * 'data: {"type":"text-start","id":"msg-TEACH-0"}\n\n'
 * 'data: {"type":"text-delta","id":"msg-TEACH-0","delta":"Hello"}\n\n'
 * 'data: {"type":"text-end","id":"msg-TEACH-0"}\n\n'
 * 'data: {"type":"text-start","id":"msg-Practice-0"}\n\n'
 * 'data: {"type":"tool-input-start","toolName":"Practice"}\n\n'
 * 'data: {"type":"tool-input-delta","toolName":"Practice","inputTextDelta":"{}"}\n\n'
 * 'data: {"type":"tool-input-available","toolName":"Practice"}\n\n'
 * 'data: {"type":"tool-output-available","toolName":"Practice"}\n\n'
 * 'data: {"type":"text-end","id":"msg-Practice-0"}\n\n'
 */
export async function* toAssistantUIStream(
  workflowStream: AsyncIterable<Record<string, WorkflowNodeOutput>>
): AsyncGenerator<string, void, unknown> {
  let globalMessageIndex = 0;

  // Generate a unique stream ID to prevent React StrictMode duplicate processing issues
  // This ensures toolCallId and messageId are globally unique per stream
  const streamId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // Iterate over the workflow stream
  for await (const chunk of workflowStream) {
    // Each chunk is a Record<string, WorkflowNodeOutput> with multiple nodes
    for (const [nodeName, nodeState] of Object.entries(chunk)) {
      // 1. Handle errors first - errors stop processing for this node
      if (nodeState.error && typeof nodeState.error === 'string') {
        const errorChunk: DataStreamChunk = {
          type: 'error',
          errorText: nodeState.error,
        };
        yield formatSSE(errorChunk);
        continue; // Skip to next node
      }

      // 2. Process messages from this node
      const messages = nodeState.messages || [];

      for (let messageIndex = 0; messageIndex < messages.length; messageIndex++) {
        // Normalize the message (convert from LangChain/LangGraph format)
        // Message should be a LangChain BaseMessage or compatible format
        const normalizedMessage: NormalizedMessage = convertToPlainMessage(
          messages[messageIndex] as BaseMessage,
          nodeName
        );

        // Convert to OpenAI format (strip internal metadata)
        const openaiMessage = toOpenAIMessage(normalizedMessage);

        // Determine chunk type based on node role
        const role = getNodeRole(nodeName);

        // Generate unique message ID for this message (global index for uniqueness across nodes)
        const messageId = `msg-${nodeName}-${globalMessageIndex}`;

        // Step 1: Start text envelope (REQUIRED for all messages)
        const textStartChunk: DataStreamChunk = {
          type: 'text-start',
          id: messageId,
        };
        yield formatSSE(textStartChunk);

        if (role === 'assistant') {
          // Assistant messages → just text content
          const content = typeof openaiMessage.content === 'string'
            ? openaiMessage.content
            : JSON.stringify(openaiMessage.content);

          // text-delta
          const textDeltaChunk: DataStreamChunk = {
            type: 'text-delta',
            id: messageId,
            delta: content,
          };
          yield formatSSE(textDeltaChunk);

        } else if (role === 'tool') {
          // Tool messages require tool chunks wrapped in text envelope
          const toolData = typeof openaiMessage.content === 'string'
            ? parseToolContent(openaiMessage.content)
            : openaiMessage.content;

          // Check if there's an error in the tool data
          const hasError = toolData && typeof toolData === 'object' && 'error' in toolData;
          const errorMessage = hasError ? String(toolData.error) : null;

          // Generate toolCallId (unique ID for this tool call)
          const toolCallId = `tool-${nodeName}-${globalMessageIndex}`;
          const toolName = nodeName;

          // Extract meaningful tool input data for this node type
          const toolInputData = extractToolInput(nodeName, nodeState);

          // tool-input-start (uses toolName only)
          const toolInputStartChunk: DataStreamChunk = {
            type: 'tool-input-start',
            toolCallId,
            toolName,
          };
          yield formatSSE(toolInputStartChunk);

          // tool-input-delta (uses toolCallId + inputTextDelta)
          // Send the complete input data as a single delta (not incremental)
          // const toolInputDeltaChunk: DataStreamChunk = {
          //   type: 'tool-input-delta',
          //   toolCallId,
          //   input: toolInputData,
          // };
          // yield formatSSE(toolInputDeltaChunk);

          // tool-input-available (uses toolName only)
          const toolInputAvailableChunk: DataStreamChunk = {
            type: 'tool-input-available',
            toolCallId,
            toolName,
            input: toolInputData,
          };
          yield formatSSE(toolInputAvailableChunk);

          // Always use tool-output-available (per AI SDK protocol)
          // Errors are encoded as data with ok: false
          const toolOutputAvailableChunk: DataStreamChunk = {
            type: 'tool-output-available',
            toolCallId,
            output: errorMessage
              ? {
                  ok: false,
                  error: { message: errorMessage },
                }
              : extractToolOutput(nodeName, nodeState),
          };
          yield formatSSE(toolOutputAvailableChunk);
        }

        // Step N: End text envelope (REQUIRED for all messages)
        const textEndChunk: DataStreamChunk = {
          type: 'text-end',
          id: messageId,
        };
        yield formatSSE(textEndChunk);

        // Increment global message index for next message
        globalMessageIndex++;
      }
    }
  }
}

/**
 * Get the OpenAI role for a node by name
 *
 * @param nodeName - Node name as string
 * @returns 'assistant' or 'tool'
 */
function getNodeRole(nodeName: string): 'assistant' | 'tool' {
  // NODE_NAME_TO_OPENAI_ROLE uses NodeName enum as keys
  // We need to cast the string to the enum type
  return NODE_NAME_TO_OPENAI_ROLE[nodeName as keyof typeof NODE_NAME_TO_OPENAI_ROLE] || 'assistant';
}

/**
 * Parse tool content from a message
 *
 * Handles different content formats:
 * - JSON strings → parsed objects
 * - Plain strings → returned as-is
 * - Objects → returned as-is
 *
 * @param content - Message content
 * @returns Parsed content
 */
function parseToolContent(content: string | Record<string, unknown>): Record<string, unknown> {
  // If already an object, return it
  if (typeof content === 'object' && content !== null) {
    return content;
  }

  // Try to parse as JSON
  try {
    return JSON.parse(content as string);
  } catch {
    // If parsing fails, wrap in an object
    return { content };
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

/**
 * ADDING NEW NODES - Integration Checklist
 *
 * When adding a new workflow node, ensure proper role mapping:
 *
 * 1. Add node name to role-mapping.ts:
 *    [NodeName.NEW_NODE]: 'tool', // or 'assistant'
 *
 * 2. No changes needed to this utility - it auto-detects from role mapping
 *
 * 3. Choose role based on output:
 *    - 'assistant' for conversational (dialogue, explanations)
 *    - 'tool' for structured data (objects, arrays, formatted displays)
 *
 * EXAMPLES:
 *
 * Conversational node (creates text stream):
 * [NodeName.TEACH]: 'assistant'
 * // Output: { messages: [AIMessage('Let me explain...')] }
 * // Stream: [
 * //   {"type":"text-start","id":"msg-TEACH-0"},
 * //   {"type":"text-delta","id":"msg-TEACH-0","delta":"Let me explain..."},
 * //   {"type":"text-end","id":"msg-TEACH-0"}
 * // ]
 *
 * Structured node (creates tool stream with text envelope):
 * [NodeName.PRACTICE]: 'tool'
 * // Output: { messages: [AIMessage(JSON.stringify({ exercises: [...] }))] }
 * // Stream: [
 * //   {"type":"text-start","id":"msg-PRACTICE-0"},
 * //   {"type":"tool-input-start","toolName":"Practice"},
 * //   {"type":"tool-input-delta","toolCallId":"tool-Practice-0","inputTextDelta":"{}"},
 * //   {"type":"tool-input-available","toolName":"Practice"},
 * //   {"type":"tool-output-available","toolCallId":"tool-Practice-0"},
 * //   {"type":"text-end","id":"msg-PRACTICE-0"}
 * // ]
 *
 * AI SDK PROTOCOL REFERENCE:
 * - ALL messages must use text envelope: text-start → [chunks] → text-end
 * - Assistant messages: text-start → text-delta → text-end
 * - Tool messages: text-start → tool-input-start → tool-input-delta → tool-input-available → tool-output-available → text-end
 * - Schema: tool-input-start/available use 'toolName', tool-input-delta/output use 'toolCallId'
 * - Errors use: error with errorText field (not message)
 * - All chunks must include required fields for proper validation
 * - SSE framing: data: <JSON>\n\n
 */
