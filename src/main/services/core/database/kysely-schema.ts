/**
 * Kysely Database Interface
 *
 * This file defines Kysely-compatible TypeScript interfaces for the database schema.
 * It re-exports shared database types for consistency and provides additional
 * main-process specific extensions.
 *
 * These interfaces provide type safety for Kysely queries and ensure that
 * all database operations are properly typed at compile time.
 */

// Import shared database types
import type {
  Database as SharedDatabase,
  CategoryRow,
  ConceptRow,
  ConceptProgressRow,
  RelationshipRow,
  LearningSessionRow,
  MessageRow,
  SessionConceptRow,
  AnalyticsRow,
  AchievementRow,
  UserStatsRow,
  SettingsRow,
  KnowledgeGraphCacheRow,
  CheckpointRow,
  CheckpointWriteRow,
  CheckpointBlobRow,
} from '@/shared/types/database';

// Core Kysely interface for the entire database
export interface Database extends SharedDatabase {
  // Multi-layer memory system tables (Phase 8 implementation)
  memory_entries: MemoryEntryRow;
  episodic_memories: EpisodicMemoryRow;
  semantic_memories: SemanticMemoryRow;
  procedural_memories: ProceduralMemoryRow;
  memory_associations: MemoryAssociationRow;

  // Agent lifecycle management tables
  agents: AgentRow;
  agent_lifecycle_events: AgentLifecycleEventRow;
  agent_states: AgentStateRow;
  agent_archives: AgentArchiveRow;
}

// Re-export shared types for convenience
export type {
  CategoryRow,
  ConceptRow,
  ConceptProgressRow,
  RelationshipRow,
  LearningSessionRow,
  MessageRow,
  SessionConceptRow,
  AnalyticsRow,
  AchievementRow,
  UserStatsRow,
  SettingsRow,
  KnowledgeGraphCacheRow,
  CheckpointRow,
  CheckpointWriteRow,
  CheckpointBlobRow,
};

// SessionConceptRow and other shared types are now imported from @/shared/types/database

// Multi-layer memory system row interfaces (Phase 8 implementation)
export interface MemoryEntryRow {
  id: string;
  type: 'working' | 'episodic' | 'semantic' | 'procedural' | 'long_term';
  importance: 'critical' | 'high' | 'medium' | 'low';
  content: string;
  metadata: string; // JSON object stored as string
  retrieval_strength: number;
  consolidation_state: 'pending' | 'in_progress' | 'completed' | 'failed';
  consolidation_data: string; // JSON object stored as string
  associations: string; // JSON array stored as string
  access_data: string; // JSON object stored as string
  user_id?: string;
  session_id?: string;
  created_at: string;
  updated_at: string;
  last_accessed?: string;
}

export interface EpisodicMemoryRow {
  id: string;
  session_id: string;
  user_id: string;
  sequence: string; // JSON object stored as string
  context: string; // JSON object stored as string
  outcomes: string; // JSON object stored as string
  reflections: string; // JSON object stored as string
  emotional_tags: string; // JSON array stored as string
  temporal_markers: string; // JSON object stored as string
  created_at: string;
  updated_at: string;
}

export interface SemanticMemoryRow {
  id: string;
  concept: string;
  definition: string;
  attributes: string; // JSON object stored as string
  relationships: string; // JSON object stored as string
  examples: string; // JSON array stored as string
  misconceptions: string; // JSON array stored as string
  category: string;
  domain: string;
  difficulty: string;
  abstractions: string; // JSON array stored as string
  confidence: number;
  verification_count: number;
  last_verified?: string;
  created_at: string;
  updated_at: string;
}

export interface ProceduralMemoryRow {
  id: string;
  skill_name: string;
  steps: string; // JSON array stored as string
  prerequisites: string; // JSON array stored as string
  context_conditions: string; // JSON object stored as string
  success_criteria: string; // JSON object stored as string
  common_errors: string; // JSON array stored as string
  mastery_level: number;
  practice_count: number;
  success_rate: number;
  last_practiced?: string;
  automaticity_level: number;
  created_at: string;
  updated_at: string;
}

export interface MemoryAssociationRow {
  id: string;
  source_id: string;
  target_id: string;
  type: 'hierarchical' | 'associative' | 'temporal' | 'causal' | 'semantic';
  strength: number;
  context: string; // JSON object stored as string
  bidirectional: boolean;
  created_at: string;
  updated_at: string;
}

// Agent lifecycle management row interfaces
export interface AgentRow {
  id: string;
  name: string;
  type: 'learning' | 'assessment' | 'tutoring' | 'practice' | 'general';
  status: 'inactive' | 'active' | 'error' | 'deleted';
  description?: string;
  model_config: string; // JSON object stored as string
  tools: string; // JSON array stored as string
  capabilities: string; // JSON array stored as string
  metadata: string; // JSON object stored as string
  activated_at?: number;
  deactivated_at?: number;
  created_at: number;
  updated_at: number;
}

export interface AgentLifecycleEventRow {
  id: string;
  agent_id: string;
  event: 'created' | 'activated' | 'deactivated' | 'updated' | 'deleted' | 'error';
  from_state?: string;
  to_state?: string;
  timestamp: number;
  metadata: string; // JSON object stored as string
  created_at: number;
}

export interface AgentStateRow {
  id: string;
  agent_id: string;
  state_data: string; // JSON object stored as string
  version: number;
  created_at: number;
  updated_at: number;
}

export interface AgentArchiveRow {
  id: string;
  agent_id: string;
  archive_data: string; // JSON object stored as string
  backup_location?: string;
  archive_reason: 'deletion' | 'migration' | 'backup' | 'maintenance';
  retained_history: boolean;
  archived_at: number;
  expires_at?: number;
}

// Type helpers for working with JSON fields
export type JSONField<T = unknown> = string & { readonly __brand: unique symbol };
export type ParsedJSON<T = unknown> = T;

// Utility type for extracting insertable types (excluding auto-generated fields)
export type InsertableCategory = Omit<CategoryRow, 'id' | 'created_at' | 'updated_at'>;
export type InsertableConcept = Omit<ConceptRow, 'created_at' | 'updated_at'>;
export type InsertableConceptProgress = Omit<
  ConceptProgressRow,
  'id' | 'created_at' | 'updated_at'
>;
export type InsertableRelationship = Omit<RelationshipRow, 'created_at' | 'updated_at'>;
export type InsertableLearningSession = Omit<LearningSessionRow, 'created_at' | 'updated_at'>;
export type InsertableMessage = Omit<MessageRow, 'created_at'>;
export type InsertableSessionConcept = Omit<SessionConceptRow, 'created_at'>;
export type InsertableAnalytics = Omit<AnalyticsRow, 'created_at'>;
export type InsertableAchievement = Omit<AchievementRow, 'id' | 'created_at' | 'updated_at'>;
export type InsertableUserStats = Omit<UserStatsRow, 'created_at' | 'updated_at'>;
export type InsertableSettings = Omit<SettingsRow, 'created_at' | 'updated_at'>;
export type InsertableKnowledgeGraphCache = Omit<KnowledgeGraphCacheRow, 'id' | 'created_at'>;
export type InsertableCheckpoint = Omit<CheckpointRow, 'id' | 'created_at' | 'updated_at'>;
export type InsertableCheckpointWrite = Omit<CheckpointWriteRow, 'id' | 'created_at'>;
export type InsertableCheckpointBlob = Omit<CheckpointBlobRow, 'id' | 'created_at'>;

// Multi-layer memory system insertable types (Phase 8 implementation)
export type InsertableMemoryEntry = Omit<MemoryEntryRow, 'id' | 'created_at' | 'updated_at'>;
export type InsertableEpisodicMemory = Omit<EpisodicMemoryRow, 'id' | 'created_at' | 'updated_at'>;
export type InsertableSemanticMemory = Omit<SemanticMemoryRow, 'id' | 'created_at' | 'updated_at'>;
export type InsertableProceduralMemory = Omit<
  ProceduralMemoryRow,
  'id' | 'created_at' | 'updated_at'
>;
export type InsertableMemoryAssociation = Omit<
  MemoryAssociationRow,
  'id' | 'created_at' | 'updated_at'
>;

// Agent lifecycle management insertable types
export type InsertableAgent = Omit<AgentRow, 'id' | 'created_at' | 'updated_at'>;
export type InsertableAgentLifecycleEvent = Omit<AgentLifecycleEventRow, 'id' | 'created_at'>;
export type InsertableAgentState = Omit<AgentStateRow, 'id' | 'created_at' | 'updated_at'>;
export type InsertableAgentArchive = Omit<AgentArchiveRow, 'id' | 'archived_at'>;

// Utility type for extracting updatable types
export type UpdatableCategory = Partial<Omit<CategoryRow, 'id' | 'created_at'>>;
export type UpdatableConcept = Partial<Omit<ConceptRow, 'id' | 'created_at'>>;
export type UpdatableConceptProgress = Partial<Omit<ConceptProgressRow, 'id' | 'created_at'>>;
export type UpdatableRelationship = Partial<Omit<RelationshipRow, 'id' | 'created_at'>>;
export type UpdatableLearningSession = Partial<Omit<LearningSessionRow, 'id' | 'created_at'>>;
export type UpdatableMessage = Partial<Omit<MessageRow, 'id' | 'created_at'>>;
export type UpdatableSessionConcept = Partial<Omit<SessionConceptRow, 'id' | 'created_at'>>;
export type UpdatableAnalytics = Partial<Omit<AnalyticsRow, 'id' | 'created_at'>>;
export type UpdatableAchievement = Partial<Omit<AchievementRow, 'id' | 'created_at'>>;
export type UpdatableUserStats = Partial<Omit<UserStatsRow, 'id' | 'created_at'>>;
export type UpdatableSettings = Partial<Omit<SettingsRow, 'id' | 'created_at'>>;
export type UpdatableKnowledgeGraphCache = Partial<
  Omit<KnowledgeGraphCacheRow, 'id' | 'created_at'>
>;
export type UpdatableCheckpoint = Partial<Omit<CheckpointRow, 'id' | 'created_at'>>;
export type UpdatableCheckpointWrite = Partial<Omit<CheckpointWriteRow, 'id' | 'created_at'>>;
export type UpdatableCheckpointBlob = Partial<Omit<CheckpointBlobRow, 'id' | 'created_at'>>;

// Multi-layer memory system updatable types (Phase 8 implementation)
export type UpdatableMemoryEntry = Partial<
  Omit<MemoryEntryRow, 'id' | 'created_at' | 'updated_at'>
>;
export type UpdatableEpisodicMemory = Partial<
  Omit<EpisodicMemoryRow, 'id' | 'created_at' | 'updated_at'>
>;
export type UpdatableSemanticMemory = Partial<
  Omit<SemanticMemoryRow, 'id' | 'created_at' | 'updated_at'>
>;
export type UpdatableProceduralMemory = Partial<
  Omit<ProceduralMemoryRow, 'id' | 'created_at' | 'updated_at'>
>;
export type UpdatableMemoryAssociation = Partial<
  Omit<MemoryAssociationRow, 'id' | 'created_at' | 'updated_at'>
>;

// Agent lifecycle management updatable types
export type UpdatableAgent = Partial<Omit<AgentRow, 'id' | 'created_at'>>;
export type UpdatableAgentLifecycleEvent = Partial<
  Omit<AgentLifecycleEventRow, 'id' | 'created_at'>
>;
export type UpdatableAgentState = Partial<Omit<AgentStateRow, 'id' | 'created_at'>>;
export type UpdatableAgentArchive = Partial<Omit<AgentArchiveRow, 'id' | 'archived_at'>>;

// Helper functions for working with JSON fields in Kysely queries
export const JSONFieldHelpers = {
  // Convert JavaScript object to JSON string for database storage
  stringify: <T>(value: T): string => {
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.error('Error stringifying JSON field:', error);
      return '{}';
    }
  },

  // Convert JSON string from database to JavaScript object
  parse: <T>(jsonString: string | undefined | null, fallback: T): T => {
    try {
      return jsonString ? JSON.parse(jsonString) : fallback;
    } catch (error) {
      console.error('Error parsing JSON field:', error);
      return fallback;
    }
  },

  // Parse array from JSON string
  parseArray: (jsonString: string | undefined | null): string[] => {
    return JSONFieldHelpers.parse<string[]>(jsonString, []);
  },

  // Parse object from JSON string
  parseObject: <T extends object>(jsonString: string | undefined | null): T => {
    return JSONFieldHelpers.parse<T>(jsonString, {} as T);
  },

  // Stringify array for database storage
  stringifyArray: (array: string[]): string => {
    return JSONFieldHelpers.stringify(array);
  },

  // Stringify object for database storage
  stringifyObject: <T extends object>(obj: T): string => {
    return JSONFieldHelpers.stringify(obj);
  },
};
