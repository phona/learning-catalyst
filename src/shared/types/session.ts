/**
 * Session Management Types
 * Converted from Python session management
 */

export interface Session {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ConversationMessage[];
  metadata: SessionMetadata;
  context: SessionContext;
  checkpoints: Checkpoint[];
  statistics: SessionStatistics;
  agents?: AgentSessionAssociation[]; // Agents involved in this session
  agent_states?: AgentSessionState[]; // Agent execution states
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  provider?: string;
  model?: string;
  tokensUsed?: number;
  thinkingContent?: string;
  toolCalls?: ToolCall[];
  metadata?: MessageMetadata;
  agentId?: string; // Agent that generated this message
  agentType?: string; // Type of agent that generated this message
  agentStateId?: string; // Agent execution state identifier
  status?: 'sending' | 'delivered' | 'error' | 'typing';
  showThinking?: boolean;
}

export interface MessageMetadata {
  userRating?: number; // 1-5
  userFeedback?: string;
  editingHistory?: string[];
  conceptsLearned?: string[];
  relatedTopics?: string[];
  confidenceScore?: number;
}

export interface SessionMetadata {
  title: string;
  description?: string;
  tags: string[];
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  learningObjectives?: string[];
  topicsCovered: string[];
  userId?: string;
  archived: boolean;
  pinned: boolean;
  color?: string;
  primaryAgentId?: string; // Primary agent for this session
  agentMode?: 'single' | 'orchestration' | 'collaborative'; // Agent interaction mode
}

export interface SessionContext {
  // Session-specific context that differs from global config
  system_prompt?: string; // Optional session-specific system prompt override
  notes?: string; // Session-specific notes or context
  learningObjectives?: string[]; // Session-specific learning goals
}

// UserPreferences moved to global configuration

export interface Checkpoint {
  id: string;
  sessionId: string;
  title: string;
  description?: string;
  createdAt: Date;
  messageIndex: number;
  // Remove context_snapshot as config is now global
  conceptsMastered: string[];
  conceptsReviewed: string[];
  practiceExercises?: PracticeExercise[];
  notes?: string;
  tags: string[];
}

export interface PracticeExercise {
  id: string;
  type: 'quiz' | 'coding' | 'discussion' | 'reflection';
  question: string;
  expectedAnswer?: string;
  userAnswer?: string;
  correct?: boolean;
  feedback?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  createdAt: Date;
}

export interface SessionStatistics {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  totalTokensUsed: number;
  totalThinkingTokens: number;
  sessionDuration: number; // seconds
  averageResponseTime: number; // seconds
  conceptsLearned: number;
  checkpointsCreated: number;
  userRating?: number; // 1-5
  productivityScore: number; // 0-100
  engagementScore: number; // 0-100
  agentInteractions?: AgentInteractionStats; // Agent-specific statistics
}

export interface LearningProgress {
  sessionId: string;
  date: Date;
  conceptsLearned: string[];
  skillsImproved: string[];
  timeSpent: number; // seconds
  tokensUsed: number;
  exerciseCompleted: number;
  accuracyRate: number;
  confidenceLevel: number;
}

export interface KnowledgeNode {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  relatedConcepts: string[];
  learningResources: LearningResource[];
  masteryLevel: number; // 0-100
  lastReviewed?: Date;
  reviewCount: number;
  confidenceScore: number;
}

export interface LearningResource {
  id: string;
  type: 'article' | 'video' | 'tutorial' | 'documentation' | 'example';
  title: string;
  url?: string;
  content?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration?: number; // minutes
  rating?: number;
  tags: string[];
}

export interface SessionSearchQuery {
  query?: string;
  tags?: string[];
  date_range?: {
    start: Date;
    end: Date;
  };
  providers?: string[];
  models?: string[];
  categories?: string[];
  archived?: boolean;
  limit?: number;
  offset?: number;
}

export interface SessionSearchResult {
  sessions: Session[];
  total: number;
  hasMore: boolean;
}

export interface SessionExportOptions {
  format: 'json' | 'markdown' | 'txt' | 'html' | 'pdf';
  includeMetadata: boolean;
  includeThinking: boolean;
  includeStatistics: boolean;
  messageFilter?: {
    roles?: ('user' | 'assistant' | 'system')[];
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

export interface SessionImportResult {
  sessionsImported: number;
  sessionsUpdated: number;
  errors: string[];
  warnings: string[];
}

export interface SessionCreateOptions {
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  provider?: string;
  model?: string;
}

export interface SessionUpdateOptions {
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  archived?: boolean;
  pinned?: boolean;
}

// Session events
export interface SessionEvent {
  type: 'created' | 'updated' | 'deleted' | 'archived' | 'restored' | 'exported';
  sessionId: string;
  timestamp: Date;
  data?: unknown;
}

export interface MessageEvent {
  type: 'added' | 'updated' | 'deleted' | 'rated';
  sessionId: string;
  messageId: string;
  timestamp: Date;
  data?: unknown;
}

// Tool call types for function calling
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// In-memory session management types
export interface MemorySession extends Omit<Session, 'id'> {
  id?: string; // Optional until saved to database
}

export interface SessionSaveResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

// ==========================================
// Agent-Session Integration Types
// ==========================================

/**
 * Association between an agent and a session
 */
export interface AgentSessionAssociation {
  agentId: string;
  agentType: string;
  agentName: string;
  sessionId: string;
  role: 'primary' | 'secondary' | 'orchestrator' | 'tool';
  status: 'active' | 'inactive' | 'paused' | 'completed';
  joinedAt: Date;
  lastActiveAt: Date;
  metadata?: {
    capabilities?: string[];
    executionMode?: 'sequential' | 'parallel' | 'collaborative';
    handoffCount?: number;
    toolUsageCount?: number;
  };
}

/**
 * Agent execution state within a session
 */
export interface AgentSessionState {
  id: string;
  agentId: string;
  sessionId: string;
  stateType: 'checkpoint' | 'context' | 'memory' | 'execution';
  stateData: unknown; // Serialized agent state
  checkpointId?: string; // Reference to LangGraph checkpoint if applicable
  createdAt: Date;
  updatedAt: Date;
  version: number; // State version for conflict resolution
  metadata?: {
    messageCount?: number;
    toolCallsMade?: number;
    tokensProcessed?: number;
    executionTimeMs?: number;
  };
}

/**
 * Statistics for agent interactions in a session
 */
export interface AgentInteractionStats {
  totalAgentMessages: number;
  agentToolCalls: number;
  agentHandoffs: number;
  agentExecutionTimeMs: number;
  agentTokenUsage: number;
  agentSuccessRate: number;
  mostActiveAgent?: {
    agentId: string;
    agentName: string;
    messageCount: number;
  };
  agentBreakdown: {
    [agentId: string]: {
      agentName: string;
      agentType: string;
      messagesSent: number;
      toolsUsed: number;
      handoffsInitiated: number;
      handoffsReceived: number;
      totalTokens: number;
      executionTimeMs: number;
      successRate: number;
    };
  };
}

/**
 * Agent session configuration
 */
export interface AgentSessionConfig {
  primaryAgentId?: string;
  agentMode: 'single' | 'orchestration' | 'collaborative';
  autoHandoff: boolean;
  maxConcurrentAgents: number;
  agentTimeoutMs: number;
  statePersistence: boolean;
  toolExecutionMode: 'sequential' | 'parallel';
  collaborationStrategy?: 'round_robin' | 'expertise_based' | 'load_balanced';
}

/**
 * Agent session event
 */
export interface AgentSessionEvent {
  type: 'agent_joined' | 'agent_left' | 'agent_handoff' | 'agent_state_change' | 'agent_error';
  sessionId: string;
  agentId: string;
  timestamp: Date;
  data?: {
    fromAgentId?: string; // For handoffs
    toAgentId?: string; // For handoffs
    stateBefore?: unknown;
    stateAfter?: unknown;
    errorMessage?: string;
    executionTimeMs?: number;
  };
}

/**
 * Agent execution context for sessions
 */
export interface AgentExecutionContext {
  sessionId: string;
  agentId: string;
  agentType: string;
  threadId?: string; // LangGraph thread ID
  checkpointId?: string; // Current checkpoint
  messageHistory: ConversationMessage[];
  agentState: unknown; // Current agent state
  availableTools: string[];
  collaborationAgents: string[]; // Other agents in the session
  sessionMetadata: SessionMetadata;
  executionConfig: {
    timeoutMs: number;
    maxIterations: number;
    enableThinking: boolean;
    enableToolCalls: boolean;
  };
}

// Re-export database types for session management
export type { SessionDatabase } from './database';
