/**
 * LangGraph Module
 *
 * This module provides SQLite-based checkpointing for LangGraph agents,
 * enabling persistent state management using the existing database infrastructure.
 */

export { SQLiteCheckpointSaver } from './SQLiteCheckpointSaver'
export { JSONFieldHelpers } from './SQLiteCheckpointSaver'

/**
 * Create a SQLiteCheckpointSaver instance
 */
export function createSQLiteCheckpointSaver(db: any): SQLiteCheckpointSaver {
  return new SQLiteCheckpointSaver(db)
}