/**
 * Database Module Index
 *
 * Central export point for Kysely database functionality.
 */

// Kysely database exports
export { createDatabase, runMigrations, getMigrationStatus, rollbackMigrations } from './kysely-database';
export { DatabaseFactory } from './kysely-database';
export type { Database } from './kysely-database';

// Kysely schema exports
export * from './kysely-schema';

// Migration system exports
export { MigrationManager } from './migrations/index';
export { loadAllMigrations } from './migrations/index';

// LangGraph checkpointing related exports
export type {
  CheckpointRow,
  CheckpointWriteRow,
  CheckpointBlobRow,
  InsertableCheckpoint,
  InsertableCheckpointWrite,
  InsertableCheckpointBlob,
  UpdatableCheckpoint,
  UpdatableCheckpointWrite,
  UpdatableCheckpointBlob
} from './kysely-schema';

// Convenience exports
export { createDatabase as default } from './kysely-database';