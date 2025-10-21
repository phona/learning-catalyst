/**
 * Database Module Index
 *
 * Central export point for database functionality.
 */

// Core database exports
export { default as createDatabase } from './database-factory';
export type { IDatabase } from './database-factory';
export { LocalDatabaseModule } from './local-database-module';

// Schema and utilities (includes JSONUtils)
export * from './database-schema';

// Convenience exports
import createDatabase from './database-factory';
export const LocalDatabase = createDatabase;