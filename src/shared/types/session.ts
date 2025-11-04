/**
 * Session Management Types
 * Converted from Python session management
 */

export interface Session {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
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
  tokens_used?: number;
  thinking_content?: string;
  tool_calls?: ToolCall[];
  metadata?: MessageMetadata;
  agent_id?: string; // Agent that generated this message
  agent_type?: string; // Type of agent that generated this message
  agent_state_id?: string; // Agent execution state identifier
}

export interface MessageMetadata {
  user_rating?: number; // 1-5
  user_feedback?: string;
  editing_history?: string[];
  concepts_learned?: string[];
  related_topics?: string[];
  confidence_score?: number;
}

export interface SessionMetadata {
  title: string;
  description?: string;
  tags: string[];
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  learning_objectives?: string[];
  topics_covered: string[];
  user_id?: string;
  archived: boolean;
  pinned: boolean;
  color?: string;
  primary_agent_id?: string; // Primary agent for this session
  agent_mode?: 'single' | 'orchestration' | 'collaborative'; // Agent interaction mode
}

export interface SessionContext {
  // Session-specific context that differs from global config
  system_prompt?: string; // Optional session-specific system prompt override
  notes?: string; // Session-specific notes or context
  learning_objectives?: string[]; // Session-specific learning goals
}

// UserPreferences moved to global configuration

export interface Checkpoint {
  id: string;
  session_id: string;
  title: string;
  description?: string;
  created_at: Date;
  message_index: number;
  // Remove context_snapshot as config is now global
  concepts_mastered: string[];
  concepts_reviewed: string[];
  practice_exercises?: PracticeExercise[];
  notes?: string;
  tags: string[];
}

export interface PracticeExercise {
  id: string;
  type: 'quiz' | 'coding' | 'discussion' | 'reflection';
  question: string;
  expected_answer?: string;
  user_answer?: string;
  correct?: boolean;
  feedback?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  created_at: Date;
}

export interface SessionStatistics {
  total_messages: number;
  user_messages: number;
  assistant_messages: number;
  total_tokens_used: number;
  total_thinking_tokens: number;
  session_duration: number; // seconds
  average_response_time: number; // seconds
  concepts_learned: number;
  checkpoints_created: number;
  user_rating?: number; // 1-5
  productivity_score: number; // 0-100
  engagement_score: number; // 0-100
  agent_interactions?: AgentInteractionStats; // Agent-specific statistics
}

export interface LearningProgress {
  session_id: string;
  date: Date;
  concepts_learned: string[];
  skills_improved: string[];
  time_spent: number; // seconds
  tokens_used: number;
  exercise_completed: number;
  accuracy_rate: number;
  confidence_level: number;
}

export interface KnowledgeNode {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  related_concepts: string[];
  learning_resources: LearningResource[];
  mastery_level: number; // 0-100
  last_reviewed?: Date;
  review_count: number;
  confidence_score: number;
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
  has_more: boolean;
}

export interface SessionExportOptions {
  format: 'json' | 'markdown' | 'txt' | 'html' | 'pdf';
  include_metadata: boolean;
  include_thinking: boolean;
  include_statistics: boolean;
  message_filter?: {
    roles?: ('user' | 'assistant' | 'system')[];
    date_range?: {
      start: Date;
      end: Date;
    };
  };
}

export interface SessionImportResult {
  sessions_imported: number;
  sessions_updated: number;
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
  session_id: string;
  timestamp: Date;
  data?: any;
}

export interface MessageEvent {
  type: 'added' | 'updated' | 'deleted' | 'rated';
  session_id: string;
  message_id: string;
  timestamp: Date;
  data?: any;
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
  agent_id: string;
  agent_type: string;
  agent_name: string;
  session_id: string;
  role: 'primary' | 'secondary' | 'orchestrator' | 'tool';
  status: 'active' | 'inactive' | 'paused' | 'completed';
  joined_at: Date;
  last_active_at: Date;
  metadata?: {
    capabilities?: string[];
    execution_mode?: 'sequential' | 'parallel' | 'collaborative';
    handoff_count?: number;
    tool_usage_count?: number;
  };
}

/**
 * Agent execution state within a session
 */
export interface AgentSessionState {
  id: string;
  agent_id: string;
  session_id: string;
  state_type: 'checkpoint' | 'context' | 'memory' | 'execution';
  state_data: any; // Serialized agent state
  checkpoint_id?: string; // Reference to LangGraph checkpoint if applicable
  created_at: Date;
  updated_at: Date;
  version: number; // State version for conflict resolution
  metadata?: {
    message_count?: number;
    tool_calls_made?: number;
    tokens_processed?: number;
    execution_time_ms?: number;
  };
}

/**
 * Statistics for agent interactions in a session
 */
export interface AgentInteractionStats {
  total_agent_messages: number;
  agent_tool_calls: number;
  agent_handoffs: number;
  agent_execution_time_ms: number;
  agent_token_usage: number;
  agent_success_rate: number;
  most_active_agent?: {
    agent_id: string;
    agent_name: string;
    message_count: number;
  };
  agent_breakdown: {
    [agent_id: string]: {
      agent_name: string;
      agent_type: string;
      messages_sent: number;
      tools_used: number;
      handoffs_initiated: number;
      handoffs_received: number;
      total_tokens: number;
      execution_time_ms: number;
      success_rate: number;
    };
  };
}

/**
 * Agent session configuration
 */
export interface AgentSessionConfig {
  primary_agent_id?: string;
  agent_mode: 'single' | 'orchestration' | 'collaborative';
  auto_handoff: boolean;
  max_concurrent_agents: number;
  agent_timeout_ms: number;
  state_persistence: boolean;
  tool_execution_mode: 'sequential' | 'parallel';
  collaboration_strategy?: 'round_robin' | 'expertise_based' | 'load_balanced';
}

/**
 * Agent session event
 */
export interface AgentSessionEvent {
  type: 'agent_joined' | 'agent_left' | 'agent_handoff' | 'agent_state_change' | 'agent_error';
  session_id: string;
  agent_id: string;
  timestamp: Date;
  data?: {
    from_agent_id?: string; // For handoffs
    to_agent_id?: string; // For handoffs
    state_before?: any;
    state_after?: any;
    error_message?: string;
    execution_time_ms?: number;
  };
}

/**
 * Agent execution context for sessions
 */
export interface AgentExecutionContext {
  session_id: string;
  agent_id: string;
  agent_type: string;
  thread_id?: string; // LangGraph thread ID
  checkpoint_id?: string; // Current checkpoint
  message_history: ConversationMessage[];
  agent_state: any; // Current agent state
  available_tools: string[];
  collaboration_agents: string[]; // Other agents in the session
  session_metadata: SessionMetadata;
  execution_config: {
    timeout_ms: number;
    max_iterations: number;
    enable_thinking: boolean;
    enable_tool_calls: boolean;
  };
}