/**
 * Chat & Conversation API
 *
 * Manages real-time conversations with AI agents.
 * All methods return display-optimized data wrapped in APIResponse.
 */

import type { APIResponse } from './base';
import type { StreamChunk } from '../ai';

// Re-export APIResponse for convenience
export type { APIResponse };

export type ErrorCategory =
  | 'rate_limit'
  | 'quota'
  | 'auth'
  | 'timeout'
  | 'network'
  | 'tool_fail'
  | 'validation'
  | 'unknown';

export type ChatStatus =
  | { type: 'retry'; attempt: number; max: number; reason: string }
  | { type: 'tool'; phase: 'start' | 'end' | 'error'; tool: string; detail?: string; durationMs?: number; agent?: string; id?: string; expandable?: boolean }
  | { type: 'tip'; text: string }
  | { type: 'fail'; category: ErrorCategory; suggestion?: string }
  | { type: 'thought'; text: string; agent?: string; id?: string; expandable?: boolean }
  | { type: 'timeline_event'; event: TimelineEventPayload }
  | { type: 'timeline_state'; state: string; agent?: string }
  | {
      type: 'await_user_input';
      prompt: string;
      sessionId: string;
      checkpointId?: string;
      questionId?: string;
      timeoutAt?: number;
    };

export interface TimelineEventPayload {
  id: string;
  type: 'thought' | 'tool' | 'state' | 'error';
  agent: string;
  timestamp: number;
  text?: string;
  tool?: string;
  phase?: 'start' | 'end' | 'error';
  detail?: string;
  expandable?: boolean;
}

export type ChatStreamEvent =
  | { type: 'chunk'; chunk: string | StreamChunk }
  | { type: 'complete' }
  | { type: 'error'; error?: string }
  | { type: 'status'; status: ChatStatus };

// ---------------------------------------------------------------------------
// Prompt search (cross-session)
// ---------------------------------------------------------------------------

export type PromptRole = 'user' | 'assistant';

export interface PromptHistoryItem {
  id: string;
  sessionId: string;
  role: PromptRole;
  text: string;
  createdAt: string;
}

export interface PromptSearchRequest {
  sessionId?: string;
  role?: PromptRole;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface PromptSearchResponse {
  prompts: PromptHistoryItem[];
  pagination: {
    total?: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Display-ready message from chat history
 */
export interface ChatHistoryMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning_content?: string;
  timestamp: string;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  metadata?: {
    checkpoint_id?: string;
    message_index: number;
  };
}

export interface ChatAPI {
  /**
   * Generate a session title using heuristics (no IPC required)
   */
  generateTitle: (messageText: string) => Promise<APIResponse<string>>;

  /**
   * Retrieve complete message history for a chat session
   * Messages are read from LangGraph checkpoints (accumulated state)
   */
  getMessages: (
    threadId: string,
    options?: { limit?: number; offset?: number },
  ) => Promise<APIResponse<{sessions: ChatHistoryMessage[], hasMore: boolean, total: number}>>;
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
  metadata?: Record<string, unknown>;
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
    userPreferences: Record<string, unknown>;
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

// ============================================================================
// Practice Opportunity Types
// ============================================================================

/**
 * Practice opportunity detected in conversation
 */
export interface PracticeOpportunity {
  id: string;
  type: 'understanding' | 'confused' | 'breakthrough' | 'practicing' | 'misunderstanding';
  confidence: number; // 0-1
  timing: 'immediate' | 'soon' | 'later';
  concept: string;
  reasoning: string;
  detectedFrom: string[];
  practiceReadiness: number; // 0-1
  suggestedTopics: string[];
  naturalPrompt?: string;
  estimatedTime?: number; // minutes
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Result of practice opportunity check
 */
export interface PracticeOpportunityResult {
  hasOpportunity: boolean;
  opportunity?: PracticeOpportunity;
  shouldSuggest: boolean;
  reason: string;
  timing: 'immediate' | 'wait' | 'not-appropriate';
  confidence: number;
}

/**
 * User learning context for practice suggestions
 */
export interface UserLearningContext {
  id: string;
  sessionId: string;
  confidenceLevel: number;
  learningVelocity: number;
  stuckPoints: string[];
  recentConcepts: Array<{
    concept: string;
    confidence: number;
    firstSeen: number;
    lastSeen: number;
    practiceCount: number;
  }>;
  practiceHistory: Array<{
    concept: string;
    completedAt: number;
    success: boolean;
    difficulty: string;
    timeSpent: number;
  }>;
  lastPracticeTime?: number;
  engagementLevel: number;
  preferences: {
    practiceFrequency: 'low' | 'medium' | 'high';
    difficultyPreference: 'easy' | 'medium' | 'hard';
    feedbackStyle: 'encouraging' | 'direct' | 'gentle';
  };
  statistics: {
    totalPracticeSessions: number;
    successRate: number;
    averageSessionLength: number;
    preferredPracticeTimes: number[];
  };
}

/**
 * Natural practice suggestion that feels conversational
 */
export interface NaturalPracticeSuggestion {
  id: string;
  type: 'gentle-nudge' | 'direct-suggestion' | 'collaborative-invite' | 'challenge';
  introduction: string; // Natural opening line
  challenge: string; // The actual practice suggestion
  context: string; // How it relates to current conversation
  estimatedTime: number; // minutes
  difficulty: 'easy' | 'medium' | 'hard';
  vibe: 'understanding' | 'confused' | 'breakthrough' | 'practicing' | 'misunderstanding';
  timing: {
    when: string; // "right now", "in a few minutes", "when you're ready"
    urgency: 'low' | 'medium' | 'high';
  };
  options: {
    accept: string; // What to say if they want to practice
    decline: string; // What to say if they want to skip
    postpone: string; // What to say if they want to practice later
  };
  metadata: {
    concept: string;
    relatedTopics: string[];
    prerequisites: string[];
    nextSteps: string[];
  };
}

/**
 * Practice session flow management
 */
export interface PracticeFlow {
  id: string;
  conversationId: string;
  status: 'suggested' | 'accepted' | 'active' | 'completed' | 'declined';
  suggestion: NaturalPracticeSuggestion;
  startTime?: number;
  endTime?: number;
  progress: {
    currentStep: number;
    totalSteps: number;
    completedSteps: string[];
  };
  userResponses: Array<{
    step: number;
    response: string;
    timestamp: number;
    feedback?: string;
  }>;
}
