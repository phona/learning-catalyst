/**
 * Chat Service Interface
 *
 * Pure TypeScript interface defining chat and conversation operations.
 * Can be used by both main and renderer processes.
 */

import { Message, StreamChunk, TokenUsage } from '@/shared/types/ai';

export interface ConversationDisplay {
  id: string;
  title: string;
  messages: MessageDisplay[];
  agentId?: string;
  agentName?: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  status: ConversationStatus;
  tags: string[];
  conceptsDiscussed: string[];
  summary?: string;
}

export interface MessageDisplay {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  tokenUsage?: TokenUsage;
  toolCalls?: ToolCallDisplay[];
  metadata?: MessageMetadata;
}

export interface ToolCallDisplay {
  id: string;
  name: string;
  arguments: string;
  result?: unknown;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
  duration?: number;
}

export interface MessageMetadata {
  model?: string;
  provider?: string;
  temperature?: number;
  thinking?: boolean;
  reasoning_content?: string;
  edit_count?: number;
  reaction?: MessageReaction;
}

export interface MessageReaction {
  emoji: string;
  userId?: string;
  timestamp: Date;
}

export interface TypingIndicator {
  conversationId: string;
  agentId?: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface ConversationSummary {
  conversationId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  conceptsLearned: string[];
  actionItems: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  wordCount: number;
  readingTime: number; // in minutes
}

export type ConversationStatus = 'active' | 'archived' | 'deleted' | 'draft' | 'paused';

export interface CreateConversationRequest {
  title?: string;
  agentId?: string;
  initialMessage?: string;
  tags?: string[];
  context?: ConversationContext;
}

export interface ConversationContext {
  currentTopic?: string;
  relatedConcepts?: string[];
  learningGoals?: string[];
  previousSessions?: string[];
  preferences?: ConversationPreferences;
}

export interface ConversationPreferences {
  responseStyle: 'concise' | 'detailed' | 'tutorial' | 'creative';
  language: string;
  includeCodeExamples: boolean;
  enableThinking: boolean;
  temperature: number;
  maxTokens?: number;
}

export interface SendMessageRequest {
  conversationId: string;
  message: string;
  agentId?: string;
  options?: MessageOptions;
}

export interface MessageOptions {
  stream?: boolean;
  enableThinking?: boolean;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  tools?: string[];
  context?: ConversationContext;
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  response: string;
  isComplete: boolean;
  tokenUsage?: TokenUsage;
  metadata?: MessageMetadata;
  suggestions?: MessageSuggestion[];
}

export interface MessageSuggestion {
  type: 'question' | 'clarification' | 'followup' | 'action';
  text: string;
  priority: 'high' | 'medium' | 'low';
  reasoning?: string;
}

export interface ConversationSearchRequest {
  query?: string;
  tags?: string[];
  agentId?: string;
  status?: ConversationStatus;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
  sortBy?: 'updatedAt' | 'createdAt' | 'messageCount' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface ConversationSearchResult {
  conversations: ConversationDisplay[];
  totalCount: number;
  hasMore: boolean;
  facets: SearchFacets;
}

export interface SearchFacets {
  tags: { [tag: string]: number };
  agents: { [agentName: string]: number };
  dateRanges: { [range: string]: number };
}

export interface ConversationStats {
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  totalTokens: number;
  averageResponseTime: number;
  conversationDuration: number;
  mostDiscussedConcepts: { concept: string; count: number }[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface GlobalChatStats {
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
  totalTokens: number;
  averageConversationLength: number;
  mostActiveHour: number;
  mostUsedAgent?: string;
  topConcepts: { concept: string; count: number }[];
  weeklyActivity: DailyActivity[];
}

export interface DailyActivity {
  date: Date;
  conversationCount: number;
  messageCount: number;
  tokenCount: number;
}

export interface ConversationUpdate {
  type: 'message' | 'status' | 'metadata' | 'typing';
  conversationId: string;
  timestamp: Date;
  data: unknown;
}

// Error types specific to chat service
export class ChatError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ChatError';
  }
}

export class ConversationNotFoundError extends ChatError {
  constructor(conversationId: string) {
    super(`Conversation not found: ${conversationId}`, 'CONVERSATION_NOT_FOUND', {
      conversationId,
    });
  }
}

export class MessageNotFoundError extends ChatError {
  constructor(messageId: string) {
    super(`Message not found: ${messageId}`, 'MESSAGE_NOT_FOUND', { messageId });
  }
}

export class MessageTooLongError extends ChatError {
  constructor(length: number, maxLength: number) {
    super(`Message too long: ${length} characters (max: ${maxLength})`, 'MESSAGE_TOO_LONG', {
      length,
      maxLength,
    });
  }
}

export class AgentNotAvailableError extends ChatError {
  constructor(agentId: string) {
    super(`Agent not available: ${agentId}`, 'AGENT_NOT_AVAILABLE', { agentId });
  }
}

export class StreamingError extends ChatError {
  constructor(conversationId: string, originalError: Error) {
    super(
      `Streaming failed for conversation ${conversationId}: ${originalError.message}`,
      'STREAMING_ERROR',
      { conversationId, originalError },
    );
  }
}
