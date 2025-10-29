import { Kysely, sql } from 'kysely'

export default {
  async up(db: Kysely<any>): Promise<void> {
    // User statistics
    await db.schema
      .createTable('user_stats')
      .addColumn('id', 'text', (col) => col.notNull().primaryKey())
      .addColumn('total_sessions', 'integer', (col) => col.defaultTo(0))
      .addColumn('total_study_time_seconds', 'integer', (col) => col.defaultTo(0))
      .addColumn('total_concepts', 'integer', (col) => col.defaultTo(0))
      .addColumn('total_messages', 'integer', (col) => col.defaultTo(0))
      .addColumn('average_mastery_level', 'real', (col) => col.defaultTo(0.0))
      .addColumn('current_streak_days', 'integer', (col) => col.defaultTo(0))
      .addColumn('longest_streak_days', 'integer', (col) => col.defaultTo(0))
      .addColumn('last_study_date', 'text')
      .addColumn('metadata', 'text') // JSON object
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addCheckConstraint('chk_user_id', sql`id = 'user'`)
      .execute()
  },

  async down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('user_stats').execute()
  }
}
