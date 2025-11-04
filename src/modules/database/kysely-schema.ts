/**
 * Kysely Database Interface
 *
 * This file defines Kysely-compatible TypeScript interfaces for the database schema.
 * It maps directly to the SQLite database schema defined in database-schema.ts.
 *
 * These interfaces provide type safety for Kysely queries and ensure that
 * all database operations are properly typed at compile time.
 */


// Core Kysely interface for the entire database
export interface Database {
  // Categories for organizing concepts
  categories: CategoryRow

  // Learning concepts
  concepts: ConceptRow

  // Concept progress tracking
  concept_progress: ConceptProgressRow

  // Relationships between concepts
  relationships: RelationshipRow

  // Learning sessions
  learning_sessions: LearningSessionRow

  // Messages in sessions
  messages: MessageRow

  // Session concept associations
  session_concepts: SessionConceptRow

  // Analytics data
  analytics: AnalyticsRow

  // User achievements
  achievements: AchievementRow

  // User statistics
  user_stats: UserStatsRow

  // Settings
  settings: SettingsRow

  // Knowledge graph cache for visualization
  knowledge_graph_cache: KnowledgeGraphCacheRow

  // LangGraph checkpoint tables
  checkpoints: CheckpointRow
  checkpoint_writes: CheckpointWriteRow
  checkpoint_blobs: CheckpointBlobRow
}

// Individual table row interfaces
export interface CategoryRow {
  id: number
  name: string
  description?: string
  color: string
  icon: string
  created_at: string
  updated_at: string
}

export interface ConceptRow {
  id: string
  name: string
  description?: string
  concept_type: 'topic' | 'skill' | 'fact' | 'procedure' | 'principle'
  difficulty_level: number
  mastery_level: number
  tags: string // JSON array stored as string
  metadata: string // JSON object stored as string
  last_reviewed?: string
  review_count: number
  parent_concept_id?: string
  created_at: string
  updated_at: string
}

export interface ConceptProgressRow {
  id: number
  concept_id: string
  concept_name: string
  mastery_level: number
  time_spent: number // minutes
  sessions_studied: number
  average_performance: number // percentage 0-100
  difficulty_rating: number // 1-5 scale
  improvement_rate: number // mastery change per session
  confidence_level: number // 1-5 scale
  last_studied: string
  created_at: string
  updated_at: string
}

export interface RelationshipRow {
  id: string
  source_concept_id: string
  target_concept_id: string
  relationship_type: 'prerequisite' | 'related' | 'contains' | 'example' | 'application' | 'contrasts'
  strength: number
  description?: string
  metadata: string // JSON object stored as string
  created_at: string
  updated_at: string
  created_by_session?: string
}

export interface LearningSessionRow {
  id: string
  title: string
  description?: string
  start_time: string
  end_time?: string
  duration_seconds: number
  total_messages: number
  concepts_studied: number
  difficulty_level: number
  session_type: 'general' | 'practice' | 'review' | 'assessment'
  metadata: string // JSON object stored as string
  created_at: string
  updated_at: string
}

export interface MessageRow {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  thinking_content?: string
  provider?: string
  model?: string
  tokens_used: string // JSON object stored as string
  timestamp: string
  message_order: number
  created_at: string
}

export interface SessionConceptRow {
  id: string
  session_id: string
  concept_id: string
  mastery_before: number
  mastery_after: number
  interaction_count: number
  created_at: string
}

export interface AnalyticsRow {
  id: string
  event_type: 'session_start' | 'session_end' | 'message_sent' | 'concept_studied' | 'mastery_improved' | 'achievement_unlocked'
  session_id?: string
  concept_id?: string
  event_data: string // JSON object stored as string
  timestamp: string
  created_at: string
}

export interface AchievementRow {
  id: string
  title: string
  description?: string
  icon: string
  category: string
  requirements?: string // JSON object stored as string
  unlocked_at?: string
  metadata: string // JSON object stored as string
  created_at: string
  updated_at: string
}

export interface UserStatsRow {
  id: string
  total_sessions: number
  total_study_time_seconds: number
  total_concepts: number
  total_messages: number
  average_mastery_level: number
  current_streak_days: number
  longest_streak_days: number
  last_study_date?: string
  metadata: string // JSON object stored as string
  created_at: string
  updated_at: string
}

export interface SettingsRow {
  id: string
  key: string
  value?: string
  data_type: 'string' | 'number' | 'boolean' | 'json'
  description?: string
  created_at: string
  updated_at: string
}

export interface KnowledgeGraphCacheRow {
  id: string
  cache_key: string
  graph_data: string // JSON object stored as string
  node_count: number
  edge_count: number
  generated_at: string
  expires_at?: string
  created_at: string
}

export interface CheckpointRow {
  id: string
  thread_id: string
  checkpoint_ns: string
  checkpoint_id: string
  parent_checkpoint_id?: string
  checkpoint_data: string // JSON object stored as string
  metadata?: string // JSON object stored as string
  created_at: string
  updated_at: string
}

export interface CheckpointWriteRow {
  id: string
  checkpoint_id: string
  task_id: string
  channel: string
  type: string // 'channel' or 'mapper'
  value?: string // JSON object stored as string
  created_at: string
}

export interface CheckpointBlobRow {
  id: string
  checkpoint_id: string
  task_id: string
  channel: string
  blob_type: string // 'input' or 'output'
  data?: string // JSON object stored as string
  created_at: string
}

// Type helpers for working with JSON fields
export type JSONField<T = unknown> = string & { readonly __brand: unique symbol }
export type ParsedJSON<T = unknown> = T

// Utility type for extracting insertable types (excluding auto-generated fields)
export type InsertableCategory = Omit<CategoryRow, 'id' | 'created_at' | 'updated_at'>
export type InsertableConcept = Omit<ConceptRow, 'created_at' | 'updated_at'>
export type InsertableConceptProgress = Omit<ConceptProgressRow, 'id' | 'created_at' | 'updated_at'>
export type InsertableRelationship = Omit<RelationshipRow, 'created_at' | 'updated_at'>
export type InsertableLearningSession = Omit<LearningSessionRow, 'created_at' | 'updated_at'>
export type InsertableMessage = Omit<MessageRow, 'created_at'>
export type InsertableSessionConcept = Omit<SessionConceptRow, 'created_at'>
export type InsertableAnalytics = Omit<AnalyticsRow, 'created_at'>
export type InsertableAchievement = Omit<AchievementRow, 'id' | 'created_at' | 'updated_at'>
export type InsertableUserStats = Omit<UserStatsRow, 'created_at' | 'updated_at'>
export type InsertableSettings = Omit<SettingsRow, 'created_at' | 'updated_at'>
export type InsertableKnowledgeGraphCache = Omit<KnowledgeGraphCacheRow, 'id' | 'created_at'>
export type InsertableCheckpoint = Omit<CheckpointRow, 'id' | 'created_at' | 'updated_at'>
export type InsertableCheckpointWrite = Omit<CheckpointWriteRow, 'id' | 'created_at'>
export type InsertableCheckpointBlob = Omit<CheckpointBlobRow, 'id' | 'created_at'>

// Utility type for extracting updatable types
export type UpdatableCategory = Partial<Omit<CategoryRow, 'id' | 'created_at'>>
export type UpdatableConcept = Partial<Omit<ConceptRow, 'id' | 'created_at'>>
export type UpdatableConceptProgress = Partial<Omit<ConceptProgressRow, 'id' | 'created_at'>>
export type UpdatableRelationship = Partial<Omit<RelationshipRow, 'id' | 'created_at'>>
export type UpdatableLearningSession = Partial<Omit<LearningSessionRow, 'id' | 'created_at'>>
export type UpdatableMessage = Partial<Omit<MessageRow, 'id' | 'created_at'>>
export type UpdatableSessionConcept = Partial<Omit<SessionConceptRow, 'id' | 'created_at'>>
export type UpdatableAnalytics = Partial<Omit<AnalyticsRow, 'id' | 'created_at'>>
export type UpdatableAchievement = Partial<Omit<AchievementRow, 'id' | 'created_at'>>
export type UpdatableUserStats = Partial<Omit<UserStatsRow, 'id' | 'created_at'>>
export type UpdatableSettings = Partial<Omit<SettingsRow, 'id' | 'created_at'>>
export type UpdatableKnowledgeGraphCache = Partial<Omit<KnowledgeGraphCacheRow, 'id' | 'created_at'>>
export type UpdatableCheckpoint = Partial<Omit<CheckpointRow, 'id' | 'created_at'>>
export type UpdatableCheckpointWrite = Partial<Omit<CheckpointWriteRow, 'id' | 'created_at'>>
export type UpdatableCheckpointBlob = Partial<Omit<CheckpointBlobRow, 'id' | 'created_at'>>

// Helper functions for working with JSON fields in Kysely queries
export const JSONFieldHelpers = {
  // Convert JavaScript object to JSON string for database storage
  stringify: <T>(value: T): string => {
    try {
      return JSON.stringify(value)
    } catch (error) {
      console.error('Error stringifying JSON field:', error)
      return '{}'
    }
  },

  // Convert JSON string from database to JavaScript object
  parse: <T>(jsonString: string | undefined | null, fallback: T): T => {
    try {
      return jsonString ? JSON.parse(jsonString) : fallback
    } catch (error) {
      console.error('Error parsing JSON field:', error)
      return fallback
    }
  },

  // Parse array from JSON string
  parseArray: (jsonString: string | undefined | null): string[] => {
    return JSONFieldHelpers.parse<string[]>(jsonString, [])
  },

  // Parse object from JSON string
  parseObject: <T extends object>(jsonString: string | undefined | null): T => {
    return JSONFieldHelpers.parse<T>(jsonString, {} as T)
  },

  // Stringify array for database storage
  stringifyArray: (array: string[]): string => {
    return JSONFieldHelpers.stringify(array)
  },

  // Stringify object for database storage
  stringifyObject: <T extends object>(obj: T): string => {
    return JSONFieldHelpers.stringify(obj)
  }
}