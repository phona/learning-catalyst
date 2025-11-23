import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { Kysely } from 'kysely';
import {
  Database,
  CheckpointRow,
  CheckpointWriteRow,
  CheckpointBlobRow,
  InsertableCheckpoint,
  InsertableCheckpointWrite,
  InsertableCheckpointBlob,
} from '@/main/services/core/database';
import { v4 as uuidv4 } from 'uuid';
import type {
  Checkpoint,
  CheckpointMetadata,
  CheckpointTuple,
  CheckpointListOptions,
  ChannelVersions,
  PendingWrite,
} from '@langchain/langgraph-checkpoint';
// Define RunnableConfig locally since we can't import it
export interface RunnableConfig {
  configurable?: {
    thread_id?: string;
    checkpoint_ns?: string;
    checkpoint_id?: string;
    [key: string]: any;
  };
  recursion_limit?: number;
  tags?: string[];
  [key: string]: any;
}

/**
 * SQLite implementation of BaseCheckpointSaver for LangGraph
 *
 * This class provides persistent checkpoint storage using the existing SQLite database
 * through Kysely, enabling LangGraph agents to maintain state across sessions.
 */
export class SQLiteCheckpointSaver extends BaseCheckpointSaver<number> {
  constructor(private readonly db: Kysely<Database>) {
    super();
  }

  /**
   * Store a checkpoint in the database
   */
  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
    newVersions: ChannelVersions,
  ): Promise<RunnableConfig> {
    const threadId = this.getThreadId(config);
    const checkpointNs = config.configurable?.checkpoint_ns || '';
    const checkpointId = checkpoint.id || uuidv4();
    const parentId = config.configurable?.checkpoint_id;

    try {
      // Start a transaction for atomic checkpoint creation
      await this.db.transaction().execute(async (trx) => {
        // Insert main checkpoint
        await trx
          .insertInto('checkpoints')
          .values({
            id: uuidv4(),
            thread_id: threadId,
            checkpoint_ns: checkpointNs,
            checkpoint_id: checkpointId,
            parent_checkpoint_id: parentId,
            checkpoint_data: JSON.stringify(checkpoint),
            metadata: JSON.stringify(metadata),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .execute();

        // Store checkpoint writes if provided
        if (newVersions) {
          for (const [channel, version] of Object.entries(newVersions)) {
            await trx
              .insertInto('checkpoint_writes')
              .values({
                id: uuidv4(),
                checkpoint_id: checkpointId,
                task_id: 'main',
                channel: channel,
                type: 'channel',
                value: JSON.stringify({ version }),
                created_at: new Date().toISOString(),
              })
              .execute();
          }
        }
      });

      // Return updated config with new checkpoint_id
      return {
        configurable: {
          ...config.configurable,
          checkpoint_id: checkpointId,
        },
      };
    } catch (error) {
      console.error('Failed to save checkpoint:', error);
      throw new Error(`Checkpoint save failed: ${error}`);
    }
  }

  /**
   * Retrieve a checkpoint from the database
   */
  async get(config: RunnableConfig): Promise<Checkpoint | undefined> {
    const threadId = this.getThreadId(config);
    const checkpointId = config.configurable?.checkpoint_id;

    if (!checkpointId) {
      // Get the latest checkpoint for this thread
      const latestTuple = await this.getLatestCheckpointTuple(
        threadId,
        config.configurable?.checkpoint_ns,
      );
      return latestTuple?.checkpoint;
    }

    try {
      const result = await this.db
        .selectFrom('checkpoints')
        .selectAll()
        .where('checkpoint_id', '=', checkpointId)
        .where('thread_id', '=', threadId)
        .executeTakeFirst();

      if (!result) {
        return undefined;
      }

      const checkpoint = JSONFieldHelpers.parseObject<Checkpoint>(result.checkpoint_data);
      return checkpoint;
    } catch (error) {
      console.error('Failed to retrieve checkpoint:', error);
      throw new Error(`Checkpoint retrieval failed: ${error}`);
    }
  }

  /**
   * Get a checkpoint tuple with additional metadata
   */
  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = this.getThreadId(config);
    const checkpointId = config.configurable?.checkpoint_id;

    if (!checkpointId) {
      // Get the latest checkpoint for this thread
      return this.getLatestCheckpointTuple(threadId, config.configurable?.checkpoint_ns);
    }

    try {
      const result = await this.db
        .selectFrom('checkpoints')
        .selectAll()
        .where('checkpoint_id', '=', checkpointId)
        .where('thread_id', '=', threadId)
        .executeTakeFirst();

      if (!result) {
        return undefined;
      }

      return this.createCheckpointTuple(result, config);
    } catch (error) {
      console.error('Failed to retrieve checkpoint tuple:', error);
      throw new Error(`Checkpoint tuple retrieval failed: ${error}`);
    }
  }

  /**
   * List checkpoints for a thread
   */
  async *list(
    config: RunnableConfig,
    options?: CheckpointListOptions,
  ): AsyncGenerator<CheckpointTuple> {
    const threadId = this.getThreadId(config);
    const checkpointNs = config.configurable?.checkpoint_ns || '';
    const limit = options?.limit;
    const before = options?.before;

    try {
      let query = this.db
        .selectFrom('checkpoints')
        .selectAll()
        .where('thread_id', '=', threadId)
        .where('checkpoint_ns', '=', checkpointNs)
        .orderBy('created_at', 'desc');

      if (before?.configurable?.checkpoint_id) {
        const beforeResult = await this.db
          .selectFrom('checkpoints')
          .select('created_at')
          .where('checkpoint_id', '=', before.configurable.checkpoint_id)
          .executeTakeFirst();

        if (beforeResult) {
          query = query.where('created_at', '<', beforeResult.created_at);
        }
      }

      if (limit) {
        query = query.limit(limit);
      }

      const results = await query.execute();

      for (const result of results) {
        yield this.createCheckpointTuple(result, config);
      }
    } catch (error) {
      console.error('Failed to list checkpoints:', error);
      throw new Error(`Checkpoint listing failed: ${error}`);
    }
  }

  /**
   * List checkpoints with their associated writes
   */
  async listW(
    config: RunnableConfig,
    filter?: Record<string, any>,
    before?: RunnableConfig,
    limit?: number,
  ): Promise<CheckpointTuple[]> {
    const checkpoints: CheckpointTuple[] = [];

    for await (const checkpoint of this.list(config, { limit, before })) {
      // Apply filter if provided
      if (filter && !this.matchesFilter(checkpoint, filter)) {
        continue;
      }
      checkpoints.push(checkpoint);
    }

    return checkpoints;
  }

  /**
   * Delete checkpoints for a thread
   */
  async delete(config: RunnableConfig): Promise<void> {
    const threadId = this.getThreadId(config);
    const checkpointNs = config.configurable?.checkpoint_ns || '';

    try {
      await this.db.transaction().execute(async (trx) => {
        // Delete related writes and blobs first
        await trx
          .deleteFrom('checkpoint_writes')
          .where(
            'checkpoint_id',
            'in',
            trx
              .selectFrom('checkpoints')
              .select('checkpoint_id')
              .where('thread_id', '=', threadId)
              .where('checkpoint_ns', '=', checkpointNs),
          )
          .execute();

        await trx
          .deleteFrom('checkpoint_blobs')
          .where(
            'checkpoint_id',
            'in',
            trx
              .selectFrom('checkpoints')
              .select('checkpoint_id')
              .where('thread_id', '=', threadId)
              .where('checkpoint_ns', '=', checkpointNs),
          )
          .execute();

        // Delete checkpoints
        await trx
          .deleteFrom('checkpoints')
          .where('thread_id', '=', threadId)
          .where('checkpoint_ns', '=', checkpointNs)
          .execute();
      });
    } catch (error) {
      console.error('Failed to delete checkpoints:', error);
      throw new Error(`Checkpoint deletion failed: ${error}`);
    }
  }

  /**
   * Delete all checkpoints for a thread
   */
  async deleteThread(threadId: string): Promise<void> {
    const config = {
      configurable: {
        thread_id: threadId,
        checkpoint_ns: '',
      },
    };
    return this.delete(config);
  }

  /**
   * Put checkpoint writes
   */
  async putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string): Promise<void> {
    const threadId = this.getThreadId(config);
    const checkpointId = config.configurable?.checkpoint_id;

    if (!checkpointId) {
      throw new Error('checkpoint_id is required in config.configurable');
    }

    try {
      for (const write of writes) {
        // PendingWrite is a tuple: [channel, value]
        const [channel, value] = write;
        await this.db
          .insertInto('checkpoint_writes')
          .values({
            id: uuidv4(),
            checkpoint_id: checkpointId,
            task_id: taskId,
            channel,
            type: 'channel', // Default type since PendingWrite doesn't include type
            value: JSON.stringify(value),
            created_at: new Date().toISOString(),
          })
          .execute();
      }
    } catch (error) {
      console.error('Failed to store checkpoint writes:', error);
      throw new Error(`Checkpoint writes storage failed: ${error}`);
    }
  }

  /**
   * Get the latest checkpoint tuple for a thread
   */
  private async getLatestCheckpointTuple(
    threadId: string,
    checkpointNs?: string,
  ): Promise<CheckpointTuple | undefined> {
    try {
      const result = await this.db
        .selectFrom('checkpoints')
        .selectAll()
        .where('thread_id', '=', threadId)
        .where('checkpoint_ns', '=', checkpointNs || '')
        .orderBy('created_at', 'desc')
        .executeTakeFirst();

      if (!result) {
        return undefined;
      }

      const config = {
        configurable: {
          thread_id: threadId,
          checkpoint_ns: checkpointNs || '',
          checkpoint_id: result.checkpoint_id,
        },
      };

      return this.createCheckpointTuple(result, config);
    } catch (error) {
      console.error('Failed to get latest checkpoint tuple:', error);
      throw new Error(`Latest checkpoint tuple retrieval failed: ${error}`);
    }
  }

  /**
   * Create a CheckpointTuple from a database row
   */
  private createCheckpointTuple(row: CheckpointRow, config: RunnableConfig): CheckpointTuple {
    const checkpoint: Checkpoint = JSONFieldHelpers.parseObject(row.checkpoint_data);
    const metadata: CheckpointMetadata = JSONFieldHelpers.parseObject(row.metadata || '{}');

    const parentConfig = row.parent_checkpoint_id
      ? {
          configurable: {
            ...config.configurable,
            checkpoint_id: row.parent_checkpoint_id,
          },
        }
      : undefined;

    return {
      config: {
        configurable: {
          ...config.configurable,
          checkpoint_id: row.checkpoint_id,
        },
      },
      checkpoint,
      metadata,
      parentConfig,
    };
  }

  /**
   * Extract thread_id from config
   */
  private getThreadId(config: RunnableConfig): string {
    const threadId = config.configurable?.thread_id;
    if (!threadId) {
      throw new Error('thread_id is required in config.configurable');
    }
    return threadId;
  }

  /**
   * Check if checkpoint matches filter criteria
   */
  private matchesFilter(checkpoint: CheckpointTuple, filter: Record<string, unknown>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      const metadataValue = (checkpoint.metadata as Record<string, unknown>)[key];
      if (metadataValue !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get checkpoint writes for a specific checkpoint
   */
  async getWrites(config: RunnableConfig, taskId?: string): Promise<any[]> {
    const threadId = this.getThreadId(config);
    const checkpointId = config.configurable?.checkpoint_id;

    if (!checkpointId) {
      return [];
    }

    try {
      let query = this.db
        .selectFrom('checkpoint_writes')
        .selectAll()
        .where('checkpoint_id', '=', checkpointId);

      if (taskId) {
        query = query.where('task_id', '=', taskId);
      }

      const writes = await query.execute();

      return writes.map((write) => ({
        taskId: write.task_id,
        channel: write.channel,
        type: write.type,
        value: JSONFieldHelpers.parseObject(write.value || '{}'),
      }));
    } catch (error) {
      console.error('Failed to get checkpoint writes:', error);
      throw new Error(`Checkpoint writes retrieval failed: ${error}`);
    }
  }

  /**
   * Store checkpoint blobs (large data)
   */
  async putBlobs(
    config: RunnableConfig,
    taskId: string,
    channel: string,
    blobs: { type: 'input' | 'output'; data: any }[],
  ): Promise<void> {
    const threadId = this.getThreadId(config);
    const checkpointId = config.configurable?.checkpoint_id;

    if (!checkpointId) {
      throw new Error('checkpoint_id is required in config.configurable');
    }

    try {
      for (const blob of blobs) {
        await this.db
          .insertInto('checkpoint_blobs')
          .values({
            id: uuidv4(),
            checkpoint_id: checkpointId,
            task_id: taskId,
            channel: channel,
            blob_type: blob.type,
            data: JSON.stringify(blob.data),
            created_at: new Date().toISOString(),
          })
          .execute();
      }
    } catch (error) {
      console.error('Failed to store checkpoint blobs:', error);
      throw new Error(`Checkpoint blob storage failed: ${error}`);
    }
  }
}

/**
 * Helper functions for JSON field operations
 */
export const JSONFieldHelpers = {
  parse: <T>(jsonString: string | undefined | null, fallback: T): T => {
    try {
      return jsonString ? JSON.parse(jsonString) : fallback;
    } catch (error) {
      console.error('Error parsing JSON field:', error);
      return fallback;
    }
  },

  parseObject: <T extends object>(jsonString: string | undefined | null): T => {
    return JSONFieldHelpers.parse<T>(jsonString, {} as T);
  },

  stringify: <T>(value: T): string => {
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.error('Error stringifying JSON field:', error);
      return '{}';
    }
  },
};
