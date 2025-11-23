import { Kysely, sql } from 'kysely';

export default {
  async up(db: Kysely<any>): Promise<void> {
    // Categories for organizing concepts
    await db.schema
      .createTable('categories')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('name', 'text', (col) => col.notNull().unique())
      .addColumn('description', 'text')
      .addColumn('color', 'text', (col) => col.defaultTo('#3B82F6'))
      .addColumn('icon', 'text', (col) => col.defaultTo('folder'))
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();
  },

  async down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('categories').execute();
  },
};
