import { Kysely, sql } from 'kysely';

export default {
  async up(db: Kysely<any>): Promise<void> {
    // Knowledge graph cache for visualization
    await db.schema
      .createTable('knowledge_graph_cache')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('cache_key', 'text', (col) => col.notNull().unique())
      .addColumn('graph_data', 'text', (col) => col.notNull()) // JSON object
      .addColumn('node_count', 'integer', (col) => col.defaultTo(0))
      .addColumn('edge_count', 'integer', (col) => col.defaultTo(0))
      .addColumn('generated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('expires_at', 'text')
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();
  },

  async down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('knowledge_graph_cache').execute();
  },
};
