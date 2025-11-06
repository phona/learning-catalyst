/**
 * Chat & Conversation API
 *
 * Manages real-time conversations with AI agents.
 * All methods return display-optimized data ready for UI rendering.
 */

export interface ChatAPI {
  /**
   * Starts a new conversation with an AI agent
   * @param params.agentType - Type of agent ('learning', 'tutoring', 'assessment', 'practice')
   * @param params.topic - Optional topic to focus the conversation
   * @param params.preferences - User preferences for response style, difficulty, etc.
   * @returns Promise<ConversationDisplay> - Display-ready conversation object
   */
  startConversation: (params: {
    agentType: 'learning' | 'tutoring' | 'assessment' | 'practice';
    topic?: string;
    preferences?: {
      responseStyle?: 'conversational' | 'structured' | 'detailed' | 'concise';
      difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
      language?: string;
      enableAnimations?: boolean;
    };
  }) => Promise<ConversationDisplay>;

  /**
   * Sends a message and gets response (non-streaming)
   * Use this for simple Q&A where streaming isn't needed
   * @param params.conversationId - Active conversation ID
   * @param params.message - Message content to send
   * @param params.attachments - Optional file attachments
   * @returns Promise<MessageDisplay> - Complete response message
   */
  sendMessage: (params: {
    conversationId: string;
    message: string;
    attachments?: File[];
  }) => Promise<MessageDisplay>;

  /**
   * Sends a message with streaming response
   * Use this for long responses or when you want real-time feedback
   * @param params.conversationId - Active conversation ID
   * @param params.message - Message content to send
   * @param params.attachments - Optional file attachments
   * @returns Promise<AsyncIterable<string>> - Stream of response chunks
   */
  sendMessageStream: (params: {
    conversationId: string;
    message: string;
    attachments?: File[];
  }) => Promise<AsyncIterable<string>>;

  /**
   * Gets real-time typing indicator
   * Use this to show when the AI is typing or processing
   * @param conversationId - Active conversation ID
   * @returns Promise<TypingIndicator> - Typing status and agent info
   */
  getTypingIndicator: (conversationId: string) => Promise<TypingIndicator>;

  /**
   * Gets conversation history with display optimization
   * Returns messages formatted for UI display with relative timestamps
   * @param conversationId - Conversation ID
   * @param options.limit - Number of messages to retrieve (default: 50)
   * @param options.before - Get messages before this message ID (for pagination)
   * @param options.filter - Filter by message type or content
   * @returns Promise<ConversationHistory> - Paginated message history
   */
  getConversationHistory: (conversationId: string, options?: {
    limit?: number;
    before?: string;
    filter?: {
      messageType?: 'user' | 'assistant' | 'all';
      dateRange?: { start: Date; end: Date };
      hasAttachments?: boolean;
    };
  }) => Promise<ConversationHistory>;

  /**
   * Pauses an active conversation
   * Use this when user wants to temporarily stop the conversation
   * @param conversationId - Active conversation ID
   * @returns Promise<{ success: boolean; message: string }>
   */
  pauseConversation: (conversationId: string) => Promise<{ success: boolean; message: string }>;

  /**
   * Resumes a paused conversation
   * Restores the conversation context and continues
   * @param conversationId - Paused conversation ID
   * @returns Promise<{ success: boolean; context: ConversationContext }>
   */
  resumeConversation: (conversationId: string) => Promise<{ success: boolean; context: ConversationContext }>;

  /**
   * Ends a conversation and generates summary
   * Returns a summary of key points covered in the conversation
   * @param conversationId - Conversation to end
   * @returns Promise<ConversationSummary> - Summary and key takeaways
   */
  endConversation: (conversationId: string) => Promise<ConversationSummary>;
}

// ============================================================================
// Display-Optimized Types
// ============================================================================

/**
 * Display-ready agent information
 */
export interface AgentDisplay {
  id: string;
  type: 'learning' | 'tutoring' | 'assessment' | 'practice';
  name: string;
  avatar: string; // Emoji or icon
  color: string; // Theme color
  description?: string;
  capabilities: string[];
  isAvailable: boolean;
  category: string;
  stats?: {
    sessionsCount: number;
    avgRating: number;
  };
}

/**
 * Display-ready conversation object
 */
export interface ConversationDisplay {
  id: string;
  agent: AgentDisplay;
  status: 'active' | 'paused' | 'ended' | 'error';
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  messages: MessageDisplay[];
  suggestedTopics: string[];
  metadata?: {
    totalMessages: number;
    duration: string; // Human-readable duration
    lastActivity: string; // Relative time
  };
}

/**
 * Display-ready message object
 */
export interface MessageDisplay {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  status: 'sending' | 'sent' | 'processing' | 'completed' | 'error';
  timestamp: string; // ISO timestamp
  relativeTime: string; // Human-readable relative time
  attachments?: AttachmentDisplay[];
  metadata?: {
    tokenCount?: number;
    processingTime?: number;
    agentResponseTime?: number;
  };
}

/**
 * Display-ready attachment information
 */
export interface AttachmentDisplay {
  id: string;
  name: string;
  type: 'image' | 'document' | 'code' | 'link';
  size: string; // Human-readable size
  url?: string;
  thumbnail?: string;
  metadata?: Record<string, any>;
}

/**
 * Real-time typing indicator
 */
export interface TypingIndicator {
  isTyping: boolean;
  agentInfo: {
    name: string;
    avatar: string;
    color: string;
  };
  message?: string; // Optional status message like "Thinking..."
  estimatedTime?: number; // Estimated response time in seconds
}

/**
 * Conversation history with display optimization
 */
export interface ConversationHistory {
  conversationId: string;
  messages: MessageDisplay[];
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
    total: number;
  };
  summary?: {
    totalMessages: number;
    timeSpan: string; // Human-readable time span
    keyTopics: string[];
  };
}

/**
 * Conversation context for resumption
 */
export interface ConversationContext {
  conversationId: string;
  lastMessage: MessageDisplay;
  agentState: {
    currentTopic?: string;
    contextPoints: string[];
    userPreferences: Record<string, any>;
  };
  suggestedReopenings: string[];
}

/**
 * Conversation summary and takeaways
 */
export interface ConversationSummary {
  conversationId: string;
  summary: string;
  keyTopics: string[];
  duration: string; // Human-readable duration
  messageCount: number;
  suggestedFollowUps: string[];
  achievements?: string[];
  nextSteps?: string[];
}