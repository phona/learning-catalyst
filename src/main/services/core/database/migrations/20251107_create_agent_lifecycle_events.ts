import { Kysely, sql } from 'kysely';

export default {
  async up(db: Kysely<unknown>): Promise<void> {
    // Agent lifecycle events table - complete event tracking
    await db.schema
      .createTable('agent_lifecycle_events')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('agent_id', 'text', (col) => col.notNull())
      .addColumn('event', 'text', (col) =>
        col
          .notNull()
          .check(
            sql`event IN ('created', 'activated', 'deactivated', 'updated', 'deleted', 'error')`,
          ),
      )
      .addColumn('from_state', 'text')
      .addColumn('to_state', 'text')
      .addColumn('timestamp', 'integer', (col) =>
        col.notNull().defaultTo(sql`strftime('%s', 'now')`),
      )
      .addColumn('metadata', 'text') // JSON object for event metadata
      .addColumn('created_at', 'integer', (col) =>
        col.defaultTo(sql`strftime('%s', 'now')`).notNull(),
      )
      .addForeignKeyConstraint(
        'fk_agent_lifecycle_events_agent_id',
        ['agent_id'],
        'agents',
        ['id'],
        (fk) => fk.onDelete('cascade'),
      )
      .execute();
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable('agent_lifecycle_events').execute();
  },
};
