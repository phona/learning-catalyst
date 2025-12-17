import { Kysely, sql } from 'kysely';

export default {
  async up(db: Kysely<unknown>): Promise<void> {
    // User achievements
    await db.schema
      .createTable('achievements')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('title', 'text', (col) => col.notNull())
      .addColumn('description', 'text')
      .addColumn('icon', 'text', (col) => col.defaultTo('trophy'))
      .addColumn('category', 'text', (col) => col.defaultTo('general'))
      .addColumn('requirements', 'text') // JSON object
      .addColumn('unlocked_at', 'text')
      .addColumn('metadata', 'text') // JSON object
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable('achievements').execute();
  },
};
