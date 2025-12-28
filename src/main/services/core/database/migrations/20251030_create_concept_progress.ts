import type { Migration } from 'kysely';

export const createConceptProgress: Migration = {
  async up(db) {
    await db.schema
      .createTable('concept_progress')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('concept_id', 'text', (col) => col.notNull().unique())
      .addColumn('concept_name', 'text', (col) => col.notNull())
      .addColumn('mastery_level', 'real', (col) => col.notNull().defaultTo(0))
      .addColumn('time_spent', 'integer', (col) => col.notNull().defaultTo(0)) // minutes
      .addColumn('sessions_studied', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('average_performance', 'real', (col) => col.notNull().defaultTo(0)) // percentage 0-100
      .addColumn('difficulty_rating', 'integer', (col) => col.notNull().defaultTo(3)) // 1-5 scale
      .addColumn('improvement_rate', 'real', (col) => col.notNull().defaultTo(0)) // mastery change per session
      .addColumn('confidence_level', 'integer', (col) => col.notNull().defaultTo(1)) // 1-5 scale
      .addColumn('last_studied', 'text', (col) => col.notNull())
      .addColumn('created_at', 'text', (col) => col.notNull())
      .addColumn('updated_at', 'text', (col) => col.notNull())
      .execute();
  },

  async down(db) {
    await db.schema.dropTable('concept_progress').execute();
  },
};
