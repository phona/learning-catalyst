import { Kysely, sql } from 'kysely'

export default {
  async up(db: Kysely<any>): Promise<void> {
    // Learning sessions
    await db.schema
      .createTable('learning_sessions')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('title', 'text', (col) => col.notNull())
      .addColumn('description', 'text')
      .addColumn('start_time', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('end_time', 'text')
      .addColumn('duration_seconds', 'integer', (col) => col.defaultTo(0))
      .addColumn('total_messages', 'integer', (col) => col.defaultTo(0))
      .addColumn('concepts_studied', 'integer', (col) => col.defaultTo(0))
      .addColumn('difficulty_level', 'integer', (col) =>
        col.defaultTo(1).check(sql`difficulty_level BETWEEN 1 AND 5`)
      )
      .addColumn('session_type', 'text', (col) =>
        col.defaultTo('general').check(sql`session_type IN ('general', 'practice', 'review', 'assessment')`)
      )
      .addColumn('metadata', 'text') // JSON object
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute()
  },

  async down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('learning_sessions').execute()
  }
}