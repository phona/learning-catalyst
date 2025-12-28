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
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string | Date;
  status?: 'sending' | 'delivered' | 'error' | 'typing' | 'awaiting_input';
  provider?: string;
  thinking_content?: string;
  showThinking?: boolean;
  awaitingInput?: {
    prompt: string;
    checkpointId?: string;
    questionId?: string;
  };
  tool_calls?: ToolCallDisplay[];
  tokens_used?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  agentInfo?: {
    type: string;
    avatar: string;
    color: string;
  };
  reactions?: {
    emoji: string;
    count: number;
  }[];
  // Enhanced fields for DetailsPanel progressive disclosure
  reasoning?: string;  // AI reasoning/thinking (from thinking_content)
  tools?: Array<{
    id: string;
    name: string;
    duration: number;
    phase: 'start' | 'end' | 'error';
    input?: string;
    output?: string;
  }>;
  performance?: {
    responseTime: number;  // milliseconds
    tokens?: number;  // total tokens generated
    speed?: number;  // tokens per second
    memory?: number;  // MB used
  };
  timeline?: Array<{
    id: string;
    offset: string;  // e.g., "0.2s", "1.5s"
    description: string;  // e.g., "Searching knowledge base"
  }>;
  metadata?: {
    confidence?: number;
    concepts?: string[];
    processingTime?: number;
    toolCalls?: ToolCallDisplay[];
  };
}

export interface ToolCallDisplay {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
  status?: 'pending' | 'running' | 'completed' | 'error';
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
