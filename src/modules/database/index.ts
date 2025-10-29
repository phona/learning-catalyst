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

// Convenience exports
export { createDatabase as default } from './kysely-database';