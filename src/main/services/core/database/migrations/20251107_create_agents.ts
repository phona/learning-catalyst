import { Kysely, sql } from 'kysely'

export default {
  async up(db: Kysely<any>): Promise<void> {
    // Agents table - main agent registry
    await db.schema
      .createTable('agents')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('type', 'text', (col) =>
        col.notNull().check(sql`type IN ('learning', 'assessment', 'tutoring', 'practice', 'general')`)
      )
      .addColumn('status', 'text', (col) =>
        col.notNull().defaultTo('inactive').check(sql`status IN ('inactive', 'active', 'error', 'deleted')`)
      )
      .addColumn('description', 'text')
      .addColumn('model_config', 'text') // JSON object for model configuration
      .addColumn('tools', 'text') // JSON array for available tools
      .addColumn('capabilities', 'text') // JSON array for agent capabilities
      .addColumn('metadata', 'text') // JSON object for additional metadata
      .addColumn('activated_at', 'integer') // Unix timestamp
      .addColumn('deactivated_at', 'integer') // Unix timestamp
      .addColumn('created_at', 'integer', (col) => col.defaultTo(sql`strftime('%s', 'now')`).notNull())
      .addColumn('updated_at', 'integer', (col) => col.defaultTo(sql`strftime('%s', 'now')`).notNull())
      .execute()
  },

  async down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('agents').execute()
  }
}