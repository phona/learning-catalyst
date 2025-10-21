/**
 * Session Management Types
 * Converted from Python session management
 */

import type { ToolCall } from '../../types/ai';

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
}

export interface SessionContext {
  current_provider: string;
  current_model: string;
  system_prompt?: string;
  temperature: number;
  max_tokens: number;
  enable_thinking: boolean;
  conversation_style?: 'formal' | 'casual' | 'educational' | 'technical';
  language: string;
  user_preferences: UserPreferences;
}

export interface UserPreferences {
  learning_style: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  detail_level: 'brief' | 'detailed' | 'comprehensive';
    example_preference: 'code' | 'real-world' | 'analogies' | 'all';
  response_length: 'short' | 'medium' | 'long';
  technical_level: 'beginner' | 'intermediate' | 'advanced';
}

export interface Checkpoint {
  id: string;
  session_id: string;
  title: string;
  description?: string;
  created_at: Date;
  message_index: number;
  context_snapshot: SessionContext;
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