import { Kysely, sql } from 'kysely';

export default {
  async up(db: Kysely<any>): Promise<void> {
    // Messages in sessions
    await db.schema
      .createTable('messages')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('session_id', 'text', (col) => col.notNull())
      .addColumn('role', 'text', (col) =>
        col.notNull().check(sql`role IN ('user', 'assistant', 'system', 'tool')`),
      )
      .addColumn('content', 'text', (col) => col.notNull())
      .addColumn('thinking_content', 'text')
      .addColumn('provider', 'text')
      .addColumn('model', 'text')
      .addColumn('tokens_used', 'text') // JSON object
      .addColumn('timestamp', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('message_order', 'integer', (col) => col.defaultTo(0))
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addForeignKeyConstraint(
        'messages_session_id_fkey',
        ['session_id'],
        'learning_sessions',
        ['id'],
        (fk) => fk.onDelete('cascade'),
      )
      .execute();
  },

  async down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('messages').execute();
  },
};
