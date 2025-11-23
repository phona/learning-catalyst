/**
 * Database Migration System
 *
 * This module provides a comprehensive migration system for Kysely database operations.
 * It handles migration tracking, execution, and rollback functionality.
 */

import { Kysely, Migration, MigrationProvider, MigrationResult } from 'kysely';

/**
 * Migration metadata interface
 */
export interface MigrationMetadata {
  name: string;
  executed_at?: string;
}

/**
 * In-memory migration tracking for Electron IPC
 */
export class MigrationTracker {
  private executedMigrations: Set<string> = new Set();

  async createMigrationTable(db: Kysely<any>): Promise<void> {
    console.log('[MigrationTracker] Starting migration table creation...');
    try {
      console.log('[MigrationTracker] Executing CREATE TABLE for kysely_migration...');
      await db.schema
        .createTable('kysely_migration')
        .addColumn('name', 'text', (col) => col.notNull().primaryKey())
        .addColumn('executed_at', 'text', (col) => col.notNull())
        .execute();
      console.log('[MigrationTracker] Migration table created successfully');
    } catch (error) {
      // Table might already exist, ignore error
      console.log('[MigrationTracker] Migration table might already exist:', error);
      console.log('[MigrationTracker] Continuing with existing migration table...');
    }
  }

  async loadExecutedMigrations(db: Kysely<any>): Promise<void> {
    console.log('[MigrationTracker] Loading executed migrations...');
    try {
      console.log('[MigrationTracker] Executing SELECT FROM kysely_migration...');
      const results = await db.selectFrom('kysely_migration').select('name').execute();

      console.log(`[MigrationTracker] Found ${results.length} executed migrations`);
      this.executedMigrations = new Set(results.map((r) => r.name));
      console.log('[MigrationTracker] Executed migrations:', Array.from(this.executedMigrations));
    } catch (error) {
      // Table might not exist yet, that's ok
      console.log('[MigrationTracker] No migration table found, starting fresh:', error);
      console.log('[MigrationTracker] No executed migrations loaded');
    }
  }

  async markMigrationAsExecuted(db: Kysely<any>, migrationName: string): Promise<void> {
    console.log(`[MigrationTracker] Marking migration as executed: ${migrationName}`);
    await db
      .insertInto('kysely_migration')
      .values({
        name: migrationName,
        executed_at: new Date().toISOString(),
      })
      .execute();
    console.log(`[MigrationTracker] Successfully marked migration as executed: ${migrationName}`);
    this.executedMigrations.add(migrationName);
  }

  async markMigrationAsRolledBack(db: Kysely<any>, migrationName: string): Promise<void> {
    console.log(`[MigrationTracker] Marking migration as rolled back: ${migrationName}`);
    await db.deleteFrom('kysely_migration').where('name', '=', migrationName).execute();
    console.log(
      `[MigrationTracker] Successfully marked migration as rolled back: ${migrationName}`,
    );
    this.executedMigrations.delete(migrationName);
  }

  isMigrationExecuted(migrationName: string): boolean {
    return this.executedMigrations.has(migrationName);
  }

  getExecutedMigrations(): string[] {
    return Array.from(this.executedMigrations);
  }
}

/**
 * File-based migration provider for Electron IPC
 */
export class FileMigrationProvider implements MigrationProvider {
  constructor(private readonly migrations: Record<string, Migration>) {}

  async getMigrations(): Promise<Record<string, Migration>> {
    return this.migrations;
  }
}

/**
 * Migration Manager for Electron IPC
 *
 * Handles database migrations using the Electron IPC adapter
 */
export class MigrationManager {
  private readonly tracker: MigrationTracker;
  private readonly provider: MigrationProvider;
  private readonly db: Kysely<any>;

  constructor(db: Kysely<any>, migrations: Record<string, Migration>) {
    this.db = db;
    this.tracker = new MigrationTracker();
    this.provider = new FileMigrationProvider(migrations);
  }

  /**
   * Initialize migration system
   */
  async initialize(): Promise<void> {
    await this.tracker.createMigrationTable(this.db);
    await this.tracker.loadExecutedMigrations(this.db);
  }

  /**
   * Run all pending migrations
   */
  async migrateToLatest(): Promise<MigrationResult[]> {
    await this.initialize();

    const allMigrations = await this.provider.getMigrations();
    const executedMigrations = this.tracker.getExecutedMigrations();
    const migrationNames = Object.keys(allMigrations).sort();

    const results: MigrationResult[] = [];

    for (const migrationName of migrationNames) {
      const isExecuted = executedMigrations.includes(migrationName);

      if (!isExecuted) {
        const migration = allMigrations[migrationName];
        let result: MigrationResult;

        try {
          console.log(`[MigrationManager] Running migration: ${migrationName}`);

          await this.db.transaction().execute(async (trx) => {
            await migration.up!(trx);
            await this.tracker.markMigrationAsExecuted(trx, migrationName);
          });

          result = {
            migrationName,
            status: 'Success',
            direction: 'Up',
          };
          console.log(`[MigrationManager] Migration completed successfully: ${migrationName}`);
        } catch (error) {
          result = {
            migrationName,
            status: 'Error',
            direction: 'Up',
          };
          console.error(`[MigrationManager] Migration failed: ${migrationName}`, error);
          throw error;
        }

        results.push(result);
      } else {
        results.push({
          migrationName,
          status: 'Success',
          direction: 'Up',
        });
      }
    }

    return results;
  }

  /**
   * Rollback migrations to a specific version
   */
  async migrateDown(targetVersion?: string): Promise<MigrationResult[]> {
    await this.initialize();

    const allMigrations = await this.provider.getMigrations();
    const executedMigrations = this.tracker.getExecutedMigrations();

    const results: MigrationResult[] = [];

    // Find which migrations to rollback
    const migrationsToRollback = targetVersion
      ? executedMigrations.filter((name) => name > targetVersion)
      : executedMigrations.slice(-1); // Rollback last migration if no target specified

    for (const migrationName of migrationsToRollback.reverse()) {
      const migration = allMigrations[migrationName];
      let result: MigrationResult;

      try {
        console.log(`[MigrationManager] Rolling back migration: ${migrationName}`);

        await this.db.transaction().execute(async (trx) => {
          await migration.down!(trx);
          await this.tracker.markMigrationAsRolledBack(trx, migrationName);
        });

        result = {
          migrationName,
          status: 'Success',
          direction: 'Down',
        };
        console.log(`[MigrationManager] Rollback completed successfully: ${migrationName}`);
      } catch (error) {
        result = {
          migrationName,
          status: 'Error',
          direction: 'Down',
        };
        console.error(`[MigrationManager] Rollback failed: ${migrationName}`, error);
        throw error;
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{
    executed: string[];
    pending: string[];
    total: number;
  }> {
    await this.initialize();

    const allMigrations = await this.provider.getMigrations();
    const executedMigrations = this.tracker.getExecutedMigrations();
    const allMigrationNames = Object.keys(allMigrations).sort();

    const pendingMigrations = allMigrationNames.filter(
      (name) => !executedMigrations.includes(name),
    );

    return {
      executed: executedMigrations,
      pending: pendingMigrations,
      total: allMigrationNames.length,
    };
  }
}
