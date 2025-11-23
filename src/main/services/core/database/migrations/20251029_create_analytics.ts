import { Kysely, sql } from 'kysely';

export default {
  async up(db: Kysely<any>): Promise<void> {
    // Analytics data
    await db.schema
      .createTable('analytics')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('event_type', 'text', (col) =>
        col
          .notNull()
          .check(
            sql`event_type IN ('session_start', 'session_end', 'message_sent', 'concept_studied', 'mastery_improved', 'achievement_unlocked')`,
          ),
      )
      .addColumn('session_id', 'text')
      .addColumn('concept_id', 'text')
      .addColumn('event_data', 'text') // JSON object
      .addColumn('timestamp', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addForeignKeyConstraint(
        'analytics_session_id_fkey',
        ['session_id'],
        'learning_sessions',
        ['id'],
        (fk) => fk.onDelete('set null'),
      )
      .addForeignKeyConstraint(
        'analytics_concept_id_fkey',
        ['concept_id'],
        'concepts',
        ['id'],
        (fk) => fk.onDelete('set null'),
      )
      .execute();
  },

  async down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('analytics').execute();
  },
};
