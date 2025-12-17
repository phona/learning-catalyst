/**
 * Checkpoint Services Index
 *
 * This module provides SQLite-based checkpointing for LangGraph agents,
 * enabling persistent state management using the existing database infrastructure.
 */

import { Kysely } from 'kysely';
import { SQLiteCheckpointSaver } from './SQLiteCheckpointSaver';
import { JSONFieldHelpers } from './SQLiteCheckpointSaver';
import type { Database } from '@/main/services/core/database';

export { SQLiteCheckpointSaver, JSONFieldHelpers };

/**
 * Create a SQLiteCheckpointSaver instance
 */
export function createSQLiteCheckpointSaver(db: Kysely<Database>): SQLiteCheckpointSaver {
  return new SQLiteCheckpointSaver(db);
}
