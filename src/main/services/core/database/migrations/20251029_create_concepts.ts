import { Kysely, sql } from 'kysely';

export default {
  async up(db: Kysely<unknown>): Promise<void> {
    // Learning concepts
    await db.schema
      .createTable('concepts')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('description', 'text')
      .addColumn('concept_type', 'text', (col) =>
        col
          .notNull()
          .check(sql`concept_type IN ('topic', 'skill', 'fact', 'procedure', 'principle')`),
      )
      .addColumn('difficulty_level', 'integer', (col) =>
        col.defaultTo(1).check(sql`difficulty_level BETWEEN 1 AND 5`),
      )
      .addColumn('mastery_level', 'real', (col) =>
        col.defaultTo(0.0).check(sql`mastery_level BETWEEN 0.0 AND 1.0`),
      )
      .addColumn('tags', 'text') // JSON array
      .addColumn('metadata', 'text') // JSON object
      .addColumn('last_reviewed', 'text')
      .addColumn('review_count', 'integer', (col) => col.defaultTo(0))
      .addColumn('parent_concept_id', 'text')
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable('concepts').execute();
  },
};
