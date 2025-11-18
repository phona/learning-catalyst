/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */




/**
 * Message representation optimized for UI display
 * Transforms complex message data into frontend-friendly format
 */

/**
 * Flexible type for tool call results that can handle various data types
 */
export interface ToolCallResult {
  // Primitive types
  text?: string;
  number?: number;
  boolean?: boolean;
  
  // Complex data types
  data?: Record<string, unknown>;
  array?: unknown[];
  
  // Structured results for common use cases
  success?: boolean;
  message?: string;
  
  // Metadata about the result
  metadata?: {
    timestamp?: string;
    processingTime?: number;
    source?: string;
    [key: string]: unknown;
  };
}

export interface MessageDisplay {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;         // Relative time for display
  status: 'sending' | 'delivered' | 'error' | 'typing';
  agentInfo?: {
    type: string;
    avatar: string;
    color: string;
  };
  reactions?: {
    emoji: string;
    count: number;
  }[];
  metadata?: {
    confidence?: number;
    concepts?: string[];
    processingTime?: number;
    toolCalls?: ToolCallDisplay[];
  };
}

export interface ToolCallDisplay {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: ToolCallResult;
  error?: string;
  duration?: number;
}

export interface MessageStreamChunk {
  type: 'content' | 'metadata' | 'tool_call' | 'error' | 'complete';
  data: string | ToolCallDisplay | MessageMetadata;
}

export interface MessageMetadata {
  confidence?: number;
  concepts?: string[];
  processingTime?: number;
  agentType?: string;
  modelUsed?: string;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface MessageListDisplay {
  messages: MessageDisplay[];
  loading?: boolean;
  hasMore?: boolean;
  totalCount?: number;
}

export interface MessageSendRequest {
  content: string;
  sessionId: string;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: 'image' | 'document' | 'audio' | 'video' | 'code';
  url?: string;
  data?: string; // base64 encoded data
  size?: number;
}

export interface MessageReaction {
  messageId: string;
  emoji: string;
}