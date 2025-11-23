import { Kysely, sql } from 'kysely';

export default {
  async up(db: Kysely<any>): Promise<void> {
    // Relationships between concepts
    await db.schema
      .createTable('relationships')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('source_concept_id', 'text', (col) => col.notNull())
      .addColumn('target_concept_id', 'text', (col) => col.notNull())
      .addColumn('relationship_type', 'text', (col) =>
        col
          .notNull()
          .check(
            sql`relationship_type IN ('prerequisite', 'related', 'contains', 'example', 'application', 'contrasts')`,
          ),
      )
      .addColumn('strength', 'real', (col) =>
        col.defaultTo(0.5).check(sql`strength BETWEEN 0.0 AND 1.0`),
      )
      .addColumn('description', 'text')
      .addColumn('metadata', 'text') // JSON object
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('created_by_session', 'text')
      .addCheckConstraint('chk_no_self_reference', sql`source_concept_id != target_concept_id`)
      .execute();
  },

  async down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('relationships').execute();
  },
};
