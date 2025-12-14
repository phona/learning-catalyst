/**
 * Data Normalization Utilities
 *
 * PURPOSE:
 * Consolidates all data transformation logic that converts:
 * - LangGraph workflow results → OpenAI message format
 * - LangChain messages → Plain objects for AI SDK
 * - Workflow metadata → Message metadata
 *
 * This ensures consistent data transformation across the codebase and makes
 * the transformation logic reusable and testable.
 *
 * DESIGN PRINCIPLE:
 * Pure functions that transform data without side effects. Each function
 * takes input data and returns transformed output in a standardized format.
 *
 * WHY THIS EXISTS:
 * 1. Avoid code duplication - Same transformations used in multiple places
 * 2. Consistency - All message formatting follows same rules
 * 3. Testability - Pure functions are easy to unit test
 * 4. Maintainability - Changes in one place affect all usages
 * 5. Separation of concerns - Handler focuses on orchestration, not formatting
 */

import type { NodeName } from '../types';
import type { BaseMessage } from '@langchain/core/messages';
import type { MessageContent } from '@langchain/core/messages';

/**
 * Mapping from workflow node names to agent types for AI SDK metadata.
 *
 * This helps the frontend understand which agent generated each message,
 * enabling proper UI rendering and agent attribution.
 *
 * Agent types:
 * - 'assessment' - Analysis and evaluation nodes
 * - 'learning' - Teaching and explanation nodes
 * - 'practice' - Exercise and practice nodes
 * - 'tutoring' - Support and guidance nodes
 */
const NODE_NAME_TO_AGENT_TYPE: Readonly<Record<string, string>> = {
  // Assessment agents
  'Assess': 'assessment',
  'FastTrackQuiz': 'assessment',
  'GradeQuiz': 'assessment',
  'Evaluate': 'assessment',
  'MasteryCheck': 'assessment',

  // Learning agents
  'Teach': 'learning',
  'Remediate': 'learning',

  // Practice agents
  'Practice': 'practice',

  // Tutoring agents
  'QA': 'tutoring',
  'Breaker': 'tutoring',
  'Complete': 'tutoring',
} as const;

/**
 * Get agent type for a workflow node name.
 *
 * @param nodeName - Workflow node name (e.g., 'Assess', 'Practice')
 * @returns Agent type string (e.g., 'assessment', 'practice')
 *
 * USAGE:
 * const agentType = getAgentType('Practice');
 * // Returns: 'practice'
 *
 * FALLBACK:
 * Returns 'learning' if node name is not in the mapping
 */
export function getAgentType(nodeName: string): string {
  return NODE_NAME_TO_AGENT_TYPE[nodeName] || 'learning';
}

/**
 * Get agent type from NodeName enum.
 *
 * @param nodeName - NodeName enum value
 * @returns Agent type string
 *
 * USAGE:
 * const agentType = getAgentTypeFromNodeName(NodeName.PRACTICE);
 * // Returns: 'practice'
 */
export function getAgentTypeFromNodeName(nodeName: NodeName): string {
  return getAgentType(nodeName);
}

/**
 * Normalized message interface for AI SDK compatibility.
 *
 * All messages flowing through the system should conform to this structure
 * to ensure consistent handling across IPC boundaries.
 */
export interface NormalizedMessage {
  /** Message role: 'user', 'assistant', or 'tool' */
  role: 'user' | 'assistant' | 'tool';
  /** Message content (string or serialized object) */
  content: string;
  /** Optional agent type for UI attribution */
  agentType?: string;
  /** Optional workflow node that generated this message */
  workflowNode?: string;
  /** Optional additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Input message types that can be converted to NormalizedMessage.
 *
 * Supports:
 * - LangChain BaseMessage objects
 * - Plain message objects with role/content
 * - Serialized LangChain messages
 */
export type InputMessage = BaseMessage | {
  role: string;
  content: MessageContent;
  lc_serializable?: boolean;
  lc_kwargs?: {
    role: string;
    content: MessageContent;
  };
} | {
  role: string;
  content: MessageContent;
};

/**
 * LangChain message with lc_kwargs serialization.
 */
interface LangChainSerializedMessage {
  lc_serializable: boolean;
  lc_kwargs: {
    role: string;
    content: MessageContent;
  };
}

/**
 * Plain message object.
 */
interface PlainMessage {
  role: string;
  content: MessageContent;
  lc_serializable?: boolean;
  lc_kwargs?: never;
}

/**
 * Converts LangChain message objects to plain objects compatible with AI SDK.
 *
 * Handles LangChain's internal serialization format (lc_serializable, lc_kwargs)
 * and converts it to a standard plain object structure.
 *
 * TRANFORMATION:
 * LangChain message → NormalizedMessage
 *
 * Handles:
 * - LangChain serialized messages (lc_kwargs)
 * - Plain message objects
 * - String vs object content
 * - Metadata attachment (agentType, workflowNode)
 *
 * @param msg - LangChain message or plain message object
 * @param nodeName - Optional workflow node name for metadata
 * @returns Normalized message object
 *
 * USAGE:
 * const normalized = convertToPlainMessage(langchainMessage, 'Practice');
 * // Returns: { role: 'assistant', content: '...', agentType: 'practice', workflowNode: 'Practice' }
 */
export function convertToPlainMessage(
  msg: InputMessage,
  nodeName?: string
): NormalizedMessage {
  // Handle LangChain message objects with lc_serializable or lc_kwargs
  if (msg && typeof msg === 'object' && 'lc_kwargs' in msg && msg.lc_kwargs) {
    const result: NormalizedMessage = {
      role: msg.lc_kwargs.role as 'user' | 'assistant' | 'tool',
      content: typeof msg.lc_kwargs.content === 'string'
        ? msg.lc_kwargs.content
        : JSON.stringify(msg.lc_kwargs.content),
    };

    // Attach metadata if nodeName provided
    if (nodeName) {
      result.agentType = getAgentType(nodeName);
      result.workflowNode = nodeName;
    }

    return result;
  }

  // Handle plain message objects
  const plainMsg = msg as PlainMessage;
  const result: NormalizedMessage = {
    role: plainMsg.role as 'user' | 'assistant' | 'tool',
    content: typeof plainMsg.content === 'string'
      ? plainMsg.content
      : JSON.stringify(plainMsg.content),
  };

  // Attach metadata if nodeName provided
  if (nodeName) {
    result.agentType = getAgentType(nodeName);
    result.workflowNode = nodeName;
  }

  return result;
}

/**
 * Batch converts an array of messages to normalized format.
 *
 * @param messages - Array of messages to normalize
 * @param nodeName - Optional workflow node name for metadata
 * @returns Array of normalized messages
 *
 * USAGE:
 * const normalizedMessages = convertMessagesToPlain(messages, 'Practice');
 */
export function convertMessagesToPlain(
  messages: InputMessage[],
  nodeName?: string
): NormalizedMessage[] {
  return messages.map(msg => convertToPlainMessage(msg, nodeName));
}

/**
 * Workflow node output structure.
 */
export interface WorkflowNodeOutput {
  messages?: InputMessage[];
  [key: string]: unknown;
}

/**
 * Normalizes workflow node output to OpenAI message format.
 *
 * This is the main entry point for converting workflow results to messages
 * that can be sent to the frontend via IPC.
 *
 * WORKFLOW:
 * 1. Extract messages from workflow node output
 * 2. Normalize each message to plain object
 * 3. Attach workflow metadata
 * 4. Return array of normalized messages
 *
 * @param nodeName - Name of the workflow node that generated the output
 * @param nodeOutput - Raw output from workflow node
 * @returns Array of normalized messages ready for IPC
 *
 * USAGE:
 * const messages = normalizeWorkflowOutput('Practice', nodeState);
 * // Returns normalized messages with metadata
 */
export function normalizeWorkflowOutput(
  nodeName: NodeName,
  nodeOutput: WorkflowNodeOutput
): NormalizedMessage[] {
  // Extract messages from node output
  const messages = nodeOutput.messages || [];

  // Normalize messages with workflow metadata
  return convertMessagesToPlain(messages, nodeName);
}

/**
 * Structured data for tool messages.
 */
export interface StructuredMessageData {
  type: string;
  nodeName: NodeName;
  data: unknown;
  timestamp?: number;
}

/**
 * Creates a normalized message from structured workflow data.
 *
 * Use this when you have structured data (not messages) that needs to be
 * sent as a tool message to the frontend.
 *
 * @param nodeName - Workflow node name
 * @param data - Structured data to include in message
 * @param messageType - Optional type identifier for the data
 * @returns Normalized message with structured content
 *
 * USAGE:
 * const message = createStructuredMessage('Practice', {
 *   exercises: [...],
 *   summary: '...'
 * });
 * // Returns: { role: 'tool', content: '{"exercises":...}', workflowNode: 'Practice' }
 */
export function createStructuredMessage(
  nodeName: NodeName,
  data: unknown,
  messageType?: string
): NormalizedMessage {
  const agentType = getAgentTypeFromNodeName(nodeName);

  const structuredData: StructuredMessageData = {
    type: messageType || 'workflow_output',
    nodeName,
    data,
    timestamp: Date.now(),
  };

  return {
    role: 'tool',
    content: JSON.stringify(structuredData),
    agentType,
    workflowNode: nodeName,
    metadata: {
      messageType: messageType || 'workflow_output',
      timestamp: Date.now(),
    },
  };
}

/**
 * Creates a normalized assistant message from text content.
 *
 * Use this for conversational nodes that return simple text responses.
 *
 * @param nodeName - Workflow node name
 * @param content - Text content for the message
 * @returns Normalized assistant message
 *
 * USAGE:
 * const message = createAssistantMessage('Teach', 'Let me explain...');
 */
export function createAssistantMessage(
  nodeName: NodeName,
  content: string
): NormalizedMessage {
  const agentType = getAgentTypeFromNodeName(nodeName);

  return {
    role: 'assistant',
    content,
    agentType,
    workflowNode: nodeName,
    metadata: {
      messageType: 'assistant_response',
      timestamp: Date.now(),
    },
  };
}

/**
 * Validates that a message conforms to NormalizedMessage interface.
 *
 * @param msg - Message to validate
 * @returns true if valid, false otherwise
 *
 * USAGE:
 * if (!validateNormalizedMessage(message)) {
 *   throw new Error('Invalid message format');
 * }
 */
export function validateNormalizedMessage(msg: unknown): msg is NormalizedMessage {
  return (
    msg !== null &&
    msg !== undefined &&
    typeof msg === 'object' &&
    typeof (msg as NormalizedMessage).role === 'string' &&
    typeof (msg as NormalizedMessage).content === 'string'
  );
}

/**
 * Validates an array of messages.
 *
 * @param messages - Array of messages to validate
 * @returns true if all messages are valid
 *
 * USAGE:
 * if (!validateNormalizedMessages(messages)) {
 *   throw new Error('Invalid messages in array');
 * }
 */
export function validateNormalizedMessages(messages: unknown[]): messages is NormalizedMessage[] {
  return Array.isArray(messages) && messages.every(validateNormalizedMessage);
}

/**
 * Additional metadata to add to a message.
 */
export interface MessageMetadata {
  [key: string]: unknown;
}

/**
 * Adds metadata to an existing normalized message.
 *
 * @param message - Message to enhance
 * @param metadata - Additional metadata to add
 * @returns Enhanced message
 *
 * USAGE:
 * const enhanced = addMessageMetadata(baseMessage, { source: 'workflow' });
 */
export function addMessageMetadata(
  message: NormalizedMessage,
  metadata: MessageMetadata
): NormalizedMessage {
  return {
    ...message,
    metadata: {
      ...message.metadata,
      ...metadata,
    },
  };
}

/**
 * Strips metadata from a message, returning a clean version.
 *
 * @param message - Message to clean
 * @returns Message without metadata
 *
 * USAGE:
 * const clean = stripMessageMetadata(message);
 * // Returns: { role, content }
 */
export function stripMessageMetadata(
  message: NormalizedMessage
): Pick<NormalizedMessage, 'role' | 'content'> {
  return {
    role: message.role,
    content: message.content,
  };
}

/**
 * OpenAI API message format.
 */
export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string | Record<string, unknown>;
}

/**
 * Converts NormalizedMessage to OpenAI API format.
 *
 * This is the final transformation step before sending to the frontend.
 * Removes internal metadata and ensures compatibility with AI SDK.
 *
 * @param message - Normalized message
 * @returns OpenAI-compatible message
 *
 * USAGE:
 * const openaiMessage = toOpenAIMessage(normalizedMessage);
 * // Returns: { role: 'tool', content: {...structuredData} }
 */
export function toOpenAIMessage(message: NormalizedMessage): OpenAIMessage {
  // Try to parse content as JSON for tool messages
  if (message.role === 'tool') {
    try {
      const parsed = JSON.parse(message.content);
      return {
        role: 'tool',
        content: parsed,
      };
    } catch {
      // If parsing fails, return as-is
      return {
        role: 'tool',
        content: message.content,
      };
    }
  }

  // Assistant and user messages return content as-is
  return {
    role: message.role,
    content: message.content,
  };
}

/**
 * Batch converts normalized messages to OpenAI format.
 *
 * @param messages - Array of normalized messages
 * @returns Array of OpenAI-compatible messages
 *
 * USAGE:
 * const openaiMessages = messages.map(toOpenAIMessage);
 */
export function toOpenAIMessages(messages: NormalizedMessage[]): OpenAIMessage[] {
  return messages.map(toOpenAIMessage);
}

/**
 * Workflow state interface for normalization.
 */
export interface WorkflowState {
  messages?: BaseMessage[];
  [key: string]: unknown;
}

/**
 * IPC message structure for sending to renderer.
 */
export interface IPCMessage {
  conversationId: string;
  messages: OpenAIMessage[];
  metadata?: Record<string, unknown>;
}

/**
 * Creates IPC message from workflow output.
 *
 * @param conversationId - Conversation thread ID
 * @param nodeName - Workflow node name
 * @param nodeOutput - Node output to normalize
 * @returns IPC-ready message structure
 *
 * USAGE:
 * const ipcMessage = createIPCMessage('thread_123', 'Practice', nodeOutput);
 * // Returns: { conversationId, messages: [...], ... }
 */
export function createIPCMessage(
  conversationId: string,
  nodeName: NodeName,
  nodeOutput: WorkflowNodeOutput
): IPCMessage {
  const normalizedMessages = normalizeWorkflowOutput(nodeName, nodeOutput);
  const openaiMessages = toOpenAIMessages(normalizedMessages);

  return {
    conversationId,
    messages: openaiMessages,
    metadata: {
      nodeName,
      timestamp: Date.now(),
    },
  };
}

/**
 * COMPLETE WORKFLOW EXAMPLE:
 *
 * 1. Workflow node executes and returns state with messages
 *    const nodeState: WorkflowState = { messages: [...], ...otherData };
 *
 * 2. Normalize the output for IPC transmission
 *    const normalized = normalizeWorkflowOutput('Practice', nodeState);
 *    // Returns: [{ role: 'tool', content: '...', agentType: 'practice', ... }]
 *
 * 3. Convert to OpenAI format for frontend
 *    const openaiMessages = toOpenAIMessages(normalized);
 *    // Returns: [{ role: 'tool', content: {...structuredData} }]
 *
 * 4. Send via IPC to renderer
 *    event.sender.send('chat:stream', { messages: openaiMessages });
 *
 * 5. Renderer receives and uses with assistant-ui
 *    <Thread messages={openaiMessages} />
 */

/**
 * ADDING NEW NODES - Checklist
 *
 * When adding a new workflow node:
 *
 * 1. Add node name to types.ts
 * 2. Add node name → agent type mapping in NODE_NAME_TO_AGENT_TYPE
 * 3. Choose appropriate agent type:
 *    - 'assessment' for analysis/evaluation
 *    - 'learning' for teaching/explanation
 *    - 'practice' for exercises/practice
 *    - 'tutoring' for support/guidance
 * 4. Add JSDoc comment explaining the choice
 * 5. No need to update normalization functions - they auto-detect from mapping
 *
 * EXAMPLES:
 *
 * Assessment node (analyzes data):
 * [NodeName.ANALYZE]: 'assessment'
 *
 * Practice node (generates exercises):
 * [NodeName.EXERCISE_GENERATOR]: 'practice'
 *
 * Teaching node (conversational):
 * [NodeName.EXPLAINER]: 'learning'
 */
