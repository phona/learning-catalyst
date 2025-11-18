/**
 * Checkpoint Services Index
 *
 * This module provides SQLite-based checkpointing for LangGraph agents,
 * enabling persistent state management using the existing database infrastructure.
 */

import { SQLiteCheckpointSaver } from './SQLiteCheckpointSaver';
import { JSONFieldHelpers } from './SQLiteCheckpointSaver';

export { SQLiteCheckpointSaver, JSONFieldHelpers };

/**
 * Create a SQLiteCheckpointSaver instance
 */
export function createSQLiteCheckpointSaver(db: any): SQLiteCheckpointSaver {
  return new SQLiteCheckpointSaver(db);
}