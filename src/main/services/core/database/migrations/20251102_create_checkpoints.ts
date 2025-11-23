import { Kysely, sql } from 'kysely';

export default {
  async up(db: Kysely<any>): Promise<void> {
    // Checkpoints table - stores main checkpoint data
    await db.schema
      .createTable('checkpoints')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('thread_id', 'text', (col) => col.notNull())
      .addColumn('checkpoint_ns', 'text', (col) => col.defaultTo('').notNull())
      .addColumn('checkpoint_id', 'text', (col) => col.notNull().unique())
      .addColumn('parent_checkpoint_id', 'text')
      .addColumn('checkpoint_data', 'text', (col) => col.notNull()) // JSON string
      .addColumn('metadata', 'text') // JSON string
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();

    // Checkpoint writes table - tracks checkpoint writes/versions
    await db.schema
      .createTable('checkpoint_writes')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('checkpoint_id', 'text', (col) => col.notNull())
      .addColumn('task_id', 'text', (col) => col.notNull())
      .addColumn('channel', 'text', (col) => col.notNull())
      .addColumn('type', 'text', (col) => col.notNull()) // 'channel' or 'mapper'
      .addColumn('value', 'text') // JSON string
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();

    // Checkpoint blobs table - stores large binary/text data
    await db.schema
      .createTable('checkpoint_blobs')
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('checkpoint_id', 'text', (col) => col.notNull())
      .addColumn('task_id', 'text', (col) => col.notNull())
      .addColumn('channel', 'text', (col) => col.notNull())
      .addColumn('blob_type', 'text', (col) => col.notNull()) // 'input' or 'output'
      .addColumn('data', 'text') // JSON string
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
      .execute();

    // Create indexes for performance
    await db.schema
      .createIndex('idx_checkpoints_thread_id')
      .on('checkpoints')
      .column('thread_id')
      .execute();

    await db.schema
      .createIndex('idx_checkpoints_thread_checkpoint_ns')
      .on('checkpoints')
      .column('thread_id')
      .column('checkpoint_ns')
      .execute();

    await db.schema
      .createIndex('idx_checkpoints_checkpoint_id')
      .on('checkpoints')
      .column('checkpoint_id')
      .execute();

    await db.schema
      .createIndex('idx_checkpoint_writes_checkpoint_id')
      .on('checkpoint_writes')
      .column('checkpoint_id')
      .execute();

    await db.schema
      .createIndex('idx_checkpoint_blobs_checkpoint_id')
      .on('checkpoint_blobs')
      .column('checkpoint_id')
      .execute();

    await db.schema
      .createIndex('idx_checkpoint_blobs_task_id')
      .on('checkpoint_blobs')
      .column('task_id')
      .execute();
  },

  async down(db: Kysely<any>): Promise<void> {
    // Drop indexes first
    await db.schema.dropIndex('idx_checkpoint_blobs_task_id').execute();
    await db.schema.dropIndex('idx_checkpoint_blobs_checkpoint_id').execute();
    await db.schema.dropIndex('idx_checkpoint_writes_checkpoint_id').execute();
    await db.schema.dropIndex('idx_checkpoints_checkpoint_id').execute();
    await db.schema.dropIndex('idx_checkpoints_thread_checkpoint_ns').execute();
    await db.schema.dropIndex('idx_checkpoints_thread_id').execute();

    // Drop tables
    await db.schema.dropTable('checkpoint_blobs').execute();
    await db.schema.dropTable('checkpoint_writes').execute();
    await db.schema.dropTable('checkpoints').execute();
  },
};
