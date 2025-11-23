import { Kysely, sql } from 'kysely';

export default {
  async up(db: Kysely<any>): Promise<void> {
    // Memory entries table - core table for multi-layer memory system
    await db.schema
      .createTable('memory_entries')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('type', 'text', (col) =>
        col
          .notNull()
          .check(sql`type IN ('working', 'episodic', 'semantic', 'procedural', 'long_term')`),
      )
      .addColumn('importance', 'text', (col) =>
        col.notNull().check(sql`importance IN ('critical', 'high', 'medium', 'low')`),
      )
      .addColumn('content', 'text', (col) => col.notNull())
      .addColumn('metadata', 'text', (col) => col.notNull()) // JSON object stored as string
      .addColumn('retrieval_strength', 'real', (col) => col.notNull().defaultTo(0))
      .addColumn('consolidation_state', 'text', (col) =>
        col
          .notNull()
          .defaultTo('pending')
          .check(sql`consolidation_state IN ('pending', 'in_progress', 'completed', 'failed')`),
      )
      .addColumn('consolidation_data', 'text', (col) => col.notNull()) // JSON object stored as string
      .addColumn('associations', 'text', (col) => col.notNull()) // JSON array stored as string
      .addColumn('access_data', 'text', (col) => col.notNull()) // JSON object stored as string
      .addColumn('user_id', 'text')
      .addColumn('session_id', 'text')
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('last_accessed', 'text')
      .execute();

    // Episodic memories table
    await db.schema
      .createTable('episodic_memories')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('session_id', 'text', (col) => col.notNull())
      .addColumn('user_id', 'text', (col) => col.notNull())
      .addColumn('sequence', 'text', (col) => col.notNull()) // JSON object stored as string
      .addColumn('context', 'text', (col) => col.notNull()) // JSON object stored as string
      .addColumn('outcomes', 'text', (col) => col.notNull()) // JSON object stored as string
      .addColumn('reflections', 'text', (col) => col.notNull()) // JSON object stored as string
      .addColumn('emotional_tags', 'text', (col) => col.notNull()) // JSON array stored as string
      .addColumn('temporal_markers', 'text', (col) => col.notNull()) // JSON object stored as string
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();

    // Semantic memories table
    await db.schema
      .createTable('semantic_memories')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('concept', 'text', (col) => col.notNull())
      .addColumn('definition', 'text', (col) => col.notNull())
      .addColumn('attributes', 'text', (col) => col.notNull()) // JSON object stored as string
      .addColumn('relationships', 'text', (col) => col.notNull()) // JSON object stored as string
      .addColumn('examples', 'text', (col) => col.notNull()) // JSON array stored as string
      .addColumn('misconceptions', 'text', (col) => col.notNull()) // JSON array stored as string
      .addColumn('category', 'text', (col) => col.notNull())
      .addColumn('domain', 'text', (col) => col.notNull())
      .addColumn('difficulty', 'text', (col) => col.notNull())
      .addColumn('abstractions', 'text', (col) => col.notNull()) // JSON array stored as string
      .addColumn('confidence', 'real', (col) => col.notNull().defaultTo(0))
      .addColumn('verification_count', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('last_verified', 'text')
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();

    // Procedural memories table
    await db.schema
      .createTable('procedural_memories')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('skill_name', 'text', (col) => col.notNull())
      .addColumn('steps', 'text', (col) => col.notNull()) // JSON array stored as string
      .addColumn('prerequisites', 'text', (col) => col.notNull()) // JSON array stored as string
      .addColumn('context_conditions', 'text', (col) => col.notNull()) // JSON object stored as string
      .addColumn('success_criteria', 'text', (col) => col.notNull()) // JSON object stored as string
      .addColumn('common_errors', 'text', (col) => col.notNull()) // JSON array stored as string
      .addColumn('mastery_level', 'real', (col) => col.notNull().defaultTo(0))
      .addColumn('practice_count', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('success_rate', 'real', (col) => col.notNull().defaultTo(0))
      .addColumn('last_practiced', 'text')
      .addColumn('automaticity_level', 'real', (col) => col.notNull().defaultTo(0))
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();

    // Memory associations table
    await db.schema
      .createTable('memory_associations')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('source_id', 'text', (col) => col.notNull())
      .addColumn('target_id', 'text', (col) => col.notNull())
      .addColumn('type', 'text', (col) =>
        col
          .notNull()
          .check(sql`type IN ('hierarchical', 'associative', 'temporal', 'causal', 'semantic')`),
      )
      .addColumn('strength', 'real', (col) => col.notNull().defaultTo(0))
      .addColumn('context', 'text', (col) => col.notNull()) // JSON object stored as string
      .addColumn('bidirectional', 'integer', (col) => col.notNull().defaultTo(0)) // Boolean as integer (0/1)
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addForeignKeyConstraint(
        'fk_memory_associations_source_id',
        ['source_id'],
        'memory_entries',
        ['id'],
        (fk) => fk.onDelete('cascade'),
      )
      .addForeignKeyConstraint(
        'fk_memory_associations_target_id',
        ['target_id'],
        'memory_entries',
        ['id'],
        (fk) => fk.onDelete('cascade'),
      )
      .execute();

    // Create indexes for performance
    await db.schema
      .createIndex('idx_memory_entries_type')
      .on('memory_entries')
      .column('type')
      .execute();

    await db.schema
      .createIndex('idx_memory_entries_user_id')
      .on('memory_entries')
      .column('user_id')
      .execute();

    await db.schema
      .createIndex('idx_memory_entries_session_id')
      .on('memory_entries')
      .column('session_id')
      .execute();

    await db.schema
      .createIndex('idx_episodic_memories_session_id')
      .on('episodic_memories')
      .column('session_id')
      .execute();

    await db.schema
      .createIndex('idx_episodic_memories_user_id')
      .on('episodic_memories')
      .column('user_id')
      .execute();

    await db.schema
      .createIndex('idx_semantic_memories_concept')
      .on('semantic_memories')
      .column('concept')
      .execute();

    await db.schema
      .createIndex('idx_semantic_memories_category')
      .on('semantic_memories')
      .column('category')
      .execute();

    await db.schema
      .createIndex('idx_procedural_memories_skill_name')
      .on('procedural_memories')
      .column('skill_name')
      .execute();

    await db.schema
      .createIndex('idx_memory_associations_source_id')
      .on('memory_associations')
      .column('source_id')
      .execute();

    await db.schema
      .createIndex('idx_memory_associations_target_id')
      .on('memory_associations')
      .column('target_id')
      .execute();
  },

  async down(db: Kysely<any>): Promise<void> {
    // Drop indexes first
    await db.schema.dropIndex('idx_memory_associations_target_id').execute();
    await db.schema.dropIndex('idx_memory_associations_source_id').execute();
    await db.schema.dropIndex('idx_procedural_memories_skill_name').execute();
    await db.schema.dropIndex('idx_semantic_memories_category').execute();
    await db.schema.dropIndex('idx_semantic_memories_concept').execute();
    await db.schema.dropIndex('idx_episodic_memories_user_id').execute();
    await db.schema.dropIndex('idx_episodic_memories_session_id').execute();
    await db.schema.dropIndex('idx_memory_entries_session_id').execute();
    await db.schema.dropIndex('idx_memory_entries_user_id').execute();
    await db.schema.dropIndex('idx_memory_entries_type').execute();

    // Drop tables
    await db.schema.dropTable('memory_associations').execute();
    await db.schema.dropTable('procedural_memories').execute();
    await db.schema.dropTable('semantic_memories').execute();
    await db.schema.dropTable('episodic_memories').execute();
    await db.schema.dropTable('memory_entries').execute();
  },
};
