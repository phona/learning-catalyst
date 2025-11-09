/**
 * Service Interfaces Index
 *
 * Central export point for all service interfaces.
 * This provides a clean import structure and makes interfaces easily discoverable.
 */

// Core service interfaces
export type { DashboardDisplay, SessionDisplay } from './analytics.interface';
export type { ConceptMapDisplay, ConceptNode } from './knowledge.interface';
export type { ConversationDisplay, MessageDisplay } from './chat.interface';

export type { AnalyticsService } from './analytics.interface';
export type { KnowledgeService } from './knowledge.interface';
export type { ChatService } from './chat.interface';

// Re-export commonly used types
export type {
  AchievementDisplay,
  ConceptProgressDisplay,
  LearningTrendDisplay,
  StudyStreakDisplay,
  TimeStatsDisplay
} from './analytics.interface';

export type {
  ConceptRelationship,
  ExplanationDisplay,
  ExerciseDisplay,
  LearningPath,
  ConceptSearchResult
} from './knowledge.interface';

export type {
  MessageMetadata,
  ToolCallDisplay,
  ConversationSummary,
  ConversationSearchResult,
  MessageSuggestion
} from './chat.interface';

// Error types
export type {
  AnalyticsError,
  SessionNotFoundError,
  ConceptNotFoundError as AnalyticsConceptNotFoundError,
  DataValidationError
} from './analytics.interface';

export type {
  KnowledgeError,
  ConceptNotFoundError as KnowledgeConceptNotFoundError,
  RelationshipNotFoundError,
  CircularDependencyError,
  ValidationFailedError
} from './knowledge.interface';

export type {
  ChatError,
  ConversationNotFoundError,
  MessageNotFoundError,
  MessageTooLongError,
  AgentNotAvailableError,
  StreamingError
} from './chat.interface';