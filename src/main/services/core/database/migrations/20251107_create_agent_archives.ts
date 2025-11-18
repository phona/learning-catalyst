import { Kysely, sql } from 'kysely'

export default {
  async up(db: Kysely<any>): Promise<void> {
    // Agent archives table - data archival and backup
    await db.schema
      .createTable('agent_archives')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('agent_id', 'text', (col) => col.notNull())
      .addColumn('archive_data', 'text', (col) => col.notNull()) // JSON object for complete agent data
      .addColumn('backup_location', 'text') // Optional backup file path
      .addColumn('archive_reason', 'text', (col) =>
        col.defaultTo('deletion').check(sql`archive_reason IN ('deletion', 'migration', 'backup', 'maintenance')`)
      )
      .addColumn('retained_history', 'boolean', (col) => col.defaultTo(false))
      .addColumn('archived_at', 'integer', (col) => col.notNull().defaultTo(sql`strftime('%s', 'now')`))
      .addColumn('expires_at', 'integer') // Optional expiration timestamp
      .addForeignKeyConstraint(
        'fk_agent_archives_agent_id',
        ['agent_id'],
        'agents',
        ['id'],
        (fk) => fk.onDelete('cascade')
      )
      .execute()
  },

  async down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('agent_archives').execute()
  }
}