import { Kysely, sql } from 'kysely';

export default {
  async up(db: Kysely<unknown>): Promise<void> {
    // Agent states table - state persistence with upsert capability
    await db.schema
      .createTable('agent_states')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('agent_id', 'text', (col) => col.notNull().unique())
      .addColumn('state_data', 'text', (col) => col.notNull()) // JSON object for state data
      .addColumn('version', 'integer', (col) => col.defaultTo(1).notNull())
      .addColumn('created_at', 'integer', (col) =>
        col.defaultTo(sql`strftime('%s', 'now')`).notNull(),
      )
      .addColumn('updated_at', 'integer', (col) =>
        col.defaultTo(sql`strftime('%s', 'now')`).notNull(),
      )
      .addForeignKeyConstraint('fk_agent_states_agent_id', ['agent_id'], 'agents', ['id'], (fk) =>
        fk.onDelete('cascade'),
      )
      .execute();
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable('agent_states').execute();
  },
};
