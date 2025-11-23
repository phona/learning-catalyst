import { Kysely, sql } from 'kysely';

export default {
  async up(db: Kysely<any>): Promise<void> {
    // Session concept associations
    await db.schema
      .createTable('session_concepts')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('session_id', 'text', (col) => col.notNull())
      .addColumn('concept_id', 'text', (col) => col.notNull())
      .addColumn('mastery_before', 'real', (col) => col.defaultTo(0.0))
      .addColumn('mastery_after', 'real', (col) => col.defaultTo(0.0))
      .addColumn('interaction_count', 'integer', (col) => col.defaultTo(1))
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addForeignKeyConstraint(
        'session_concepts_session_id_fkey',
        ['session_id'],
        'learning_sessions',
        ['id'],
        (fk) => fk.onDelete('cascade'),
      )
      .addForeignKeyConstraint(
        'session_concepts_concept_id_fkey',
        ['concept_id'],
        'concepts',
        ['id'],
        (fk) => fk.onDelete('cascade'),
      )
      .addUniqueConstraint('uq_session_concept', ['session_id', 'concept_id'])
      .execute();
  },

  async down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('session_concepts').execute();
  },
};
