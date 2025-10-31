import type { Migration } from 'kysely'
import { MigrationManager } from './tools'

// Static imports for all migration modules
import createConcepts from './20251029_create_concepts'
import { createConceptProgress } from './20251030_create_concept_progress'
import createRelationships from './20251029_create_relationships'
import createLearningSessions from './20251029_create_learning_sessions'
import createMessages from './20251029_create_messages'
import createSessionConcepts from './20251029_create_session_concepts'
import createAnalytics from './20251029_create_analytics'
import createAchievements from './20251029_create_achievements'
import createSettings from './20251029_create_settings'
import createKnowledgeGraphCache from './20251029_create_knowledge_graph_cache'
import createCategories from './20251029_create_categories'
import createUserStats from './20251029_create_user_stats'
import insertDefaultData from './20251029_insert_default_data'

/**
 * Load all migration files from the migrations directory
 */
export async function loadAllMigrations(): Promise<Record<string, Migration>> {
  return {
    '20251029_create_concepts': createConcepts,
    '20251030_create_concept_progress': createConceptProgress,
    '20251029_create_relationships': createRelationships,
    '20251029_create_learning_sessions': createLearningSessions,
    '20251029_create_messages': createMessages,
    '20251029_create_session_concepts': createSessionConcepts,
    '20251029_create_analytics': createAnalytics,
    '20251029_create_achievements': createAchievements,
    '20251029_create_settings': createSettings,
    '20251029_create_knowledge_graph_cache': createKnowledgeGraphCache,
    '20251029_create_categories': createCategories,
    '20251029_create_user_stats': createUserStats,
    '20251029_insert_default_data': insertDefaultData,
  }
}

// Re-export MigrationManager for external use
export { MigrationManager }