/**
 * Learning Catalyst Modules
 *
 * Pure module definitions and barrel exports.
 * Each module manages its own lifecycle and dependencies.
 */

// Database modules
export { LocalDatabaseModule } from './database/local-database-module';
export type { IDatabase } from './database/database-factory';

// Knowledge graph modules
export { KnowledgeGraphModule, ConceptManager } from './knowledge-graph';

// Analytics modules
export { SimpleAnalyticsModule } from './analytics';

// Vector database modules
export { VectorDatabaseModule } from './vector-database';

// Module type definitions for convenience
export type {
  Concept,
  Relationship,
  ConceptNode,
  KnowledgeGraphStats,
  GraphSearchOptions,
  ConceptPath
} from './knowledge-graph';

export type {
  LearningSession,
  StudyMetrics,
  ConceptProgress,
  LearningTrends,
  AnalyticsEvent,
  LearningGoals,
  Achievement
} from './analytics';

export type {
  VectorDocument,
  SearchResult,
  VectorSearchOptions
} from './vector-database';