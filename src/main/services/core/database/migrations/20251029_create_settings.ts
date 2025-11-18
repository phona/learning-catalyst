import { Kysely, sql } from 'kysely'

export default {
  async up(db: Kysely<any>): Promise<void> {
    // Settings
    await db.schema
      .createTable('settings')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('key', 'text', (col) => col.notNull().unique())
      .addColumn('value', 'text')
      .addColumn('data_type', 'text', (col) =>
        col.defaultTo('string').check(sql`data_type IN ('string', 'number', 'boolean', 'json')`)
      )
      .addColumn('description', 'text')
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute()
  },

  async down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('settings').execute()
  }
}