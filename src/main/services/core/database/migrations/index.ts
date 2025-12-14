import type { Migration } from 'kysely';

// Static imports for all migration modules
import createConcepts from './20251029_create_concepts';
import { createConceptProgress } from './20251030_create_concept_progress';
import createRelationships from './20251029_create_relationships';
import createLearningSessions from './20251029_create_learning_sessions';
import createMessages from './20251029_create_messages';
import createSessionConcepts from './20251029_create_session_concepts';
import createAnalytics from './20251029_create_analytics';
import createAchievements from './20251029_create_achievements';
import createSettings from './20251029_create_settings';
import createKnowledgeGraphCache from './20251029_create_knowledge_graph_cache';
import createCategories from './20251029_create_categories';
import createUserStats from './20251029_create_user_stats';
import insertDefaultData from './20251029_insert_default_data';
import createCheckpoints from './20251102_create_checkpoints';
import createAgents from './20251107_create_agents';
import createAgentStates from './20251107_create_agent_states';
import createAgentLifecycleEvents from './20251107_create_agent_lifecycle_events';
import createAgentArchives from './20251107_create_agent_archives';
import createMemorySystemTables from './20251111_create_memory_system_tables';
import createPracticeAttempts from './20251204_create_practice_attempts';
import addPureSeparationIndexes from './20251211_add_pure_separation_indexes';

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
    '20251102_create_checkpoints': createCheckpoints,
    '20251107_create_agents': createAgents,
    '20251107_create_agent_states': createAgentStates,
    '20251107_create_agent_lifecycle_events': createAgentLifecycleEvents,
    '20251107_create_agent_archives': createAgentArchives,
    '20251111_create_memory_system_tables': createMemorySystemTables,
    '20251204_create_practice_attempts': createPracticeAttempts,
    '20251211_add_pure_separation_indexes': addPureSeparationIndexes,
  };
}
