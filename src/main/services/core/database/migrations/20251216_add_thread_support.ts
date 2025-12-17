import { Kysely, sql } from 'kysely';

/**
 * Migration: Add Thread Support to Learning Sessions
 *
 * This migration adds thread_id column to support Assistant UI's thread management:
 * - thread_id: Links to Assistant UI thread ID (used by RemoteThreadListAdapter)
 * - is_archived: Marks threads as archived for thread list display
 * - last_activity: Tracks when the thread was last active (for sorting)
 */

export default {
  async up(db: Kysely<unknown>): Promise<void> {
    console.log('[Migration] Adding thread support to learning_sessions...');

    // Add thread_id column (nullable initially, will be populated when threads are created)
    await db.schema
      .alterTable('learning_sessions')
      .addColumn('thread_id', 'text', (col) => col.unique())
      .execute();

    // Add is_archived column (defaults to false)
    await db.schema
      .alterTable('learning_sessions')
      .addColumn('is_archived', 'integer', (col) => col.defaultTo(0).notNull())
      .execute();

    // Add last_activity column (defaults to created_at)
    await db.schema
      .alterTable('learning_sessions')
      .addColumn('last_activity', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();

    // Create index on thread_id for fast lookups
    await db.schema
      .createIndex('idx_learning_sessions_thread_id')
      .on('learning_sessions')
      .column('thread_id')
      .ifNotExists()
      .execute();

    // Create index on last_activity for sorting threads by recent activity
    await db.schema
      .createIndex('idx_learning_sessions_last_activity')
      .on('learning_sessions')
      .column('last_activity')
      .ifNotExists()
      .execute();

    console.log('[Migration] ✅ Thread support added to learning_sessions');
  },

  async down(db: Kysely<unknown>): Promise<void> {
    console.log('[Migration] Removing thread support from learning_sessions...');

    await db.schema.dropIndex('idx_learning_sessions_last_activity').ifExists().execute();
    await db.schema.dropIndex('idx_learning_sessions_thread_id').ifExists().execute();

    await db.schema.alterTable('learning_sessions').dropColumn('last_activity').execute();
    await db.schema.alterTable('learning_sessions').dropColumn('is_archived').execute();
    await db.schema.alterTable('learning_sessions').dropColumn('thread_id').execute();

    console.log('[Migration] ✅ Thread support removed from learning_sessions');
  },
};
