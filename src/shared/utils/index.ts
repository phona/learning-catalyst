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
export { KnowledgeGraphModule } from './knowledge-graph';

// Module type definitions for convenience
export type {
  Concept,
  Relationship,
  ConceptNode,
  KnowledgeGraphStats,
  ConceptPath
} from './knowledge-graph';