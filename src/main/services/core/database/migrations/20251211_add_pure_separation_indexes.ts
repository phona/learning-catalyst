import { Kysely, sql } from 'kysely';

/**
 * Migration: Add Pure Separation Architecture Indexes
 *
 * This migration adds performance indexes to support the pure separation
 * architecture where:
 * - Qdrant stores: vectors + conceptId only
 * - SQLite stores: all concept metadata (single source of truth)
 *
 * These indexes optimize the search flow:
 * 1. Query Qdrant for candidate conceptIds
 * 2. Fetch full metadata from SQLite using these indexes
 */

export default {
  async up(db: Kysely<any>): Promise<void> {
    console.log('[Migration] Adding pure separation architecture indexes...');

    // Index on concept_type for filtering concepts by type
    await db.schema
      .createIndex('idx_concepts_type')
      .on('concepts')
      .column('concept_type')
      .ifNotExists()
      .execute();

    // Index on difficulty_level for filtering by difficulty
    await db.schema
      .createIndex('idx_concepts_level')
      .on('concepts')
      .column('difficulty_level')
      .ifNotExists()
      .execute();

    // Index on updated_at for recent concepts first
    await db.schema
      .createIndex('idx_concepts_updated_at')
      .on('concepts')
      .column('updated_at')
      .ifNotExists()
      .execute();

    console.log('[Migration] ✅ Pure separation indexes added successfully');
  },

  async down(db: Kysely<any>): Promise<void> {
    console.log('[Migration] Removing pure separation architecture indexes...');

    await db.schema.dropIndex('idx_concepts_type').ifExists().execute();
    await db.schema.dropIndex('idx_concepts_level').ifExists().execute();
    await db.schema.dropIndex('idx_concepts_updated_at').ifExists().execute();

    console.log('[Migration] ✅ Pure separation indexes removed');
  },
};
