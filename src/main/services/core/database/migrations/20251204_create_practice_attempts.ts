import type { Migration } from 'kysely';

const TABLE = 'practice_attempts';

const create: Migration = {
  up: async (db) => {
    await db.schema
      .createTable(TABLE)
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey().notNull())
      .addColumn('task_id', 'text', (col) => col.notNull())
      .addColumn('concept_ids', 'text', (col) => col.notNull()) // JSON array of strings
      .addColumn('result', 'text', (col) => col.notNull()) // pass|fail|partial
      .addColumn('answer', 'text')
      .addColumn('error_tags', 'text') // JSON array
      .addColumn('rubric_scores', 'text') // JSON object
      .addColumn('timestamp', 'text', (col) => col.notNull())
      .addColumn('created_at', 'text', (col) => col.notNull())
      .addColumn('updated_at', 'text', (col) => col.notNull())
      .execute();

    await db.schema
      .createIndex('idx_practice_attempts_task')
      .ifNotExists()
      .on(TABLE)
      .column('task_id')
      .execute();

    await db.schema
      .createIndex('idx_practice_attempts_timestamp')
      .ifNotExists()
      .on(TABLE)
      .column('timestamp')
      .execute();
  },

  down: async (db) => {
    await db.schema.dropTable(TABLE).execute();
  },
};

export default create;
