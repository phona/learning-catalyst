/**
 * Learning Catalyst Modules
 *
 * Pure module definitions and barrel exports.
 * Each module manages its own lifecycle and dependencies.
 */

// Database modules - Note: LocalDatabaseModule has been deprecated
// The new database implementation uses DatabaseFactory from src/main/services/database/kysely-database.ts
// Database types are now available from src/main/services/database/kysely-schema.ts
export type { Database } from '../../main/services/database/kysely-schema';

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