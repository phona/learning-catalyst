/**
 * SQLiteCheckpointSaver Test Suite
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteCheckpointSaver } from '@/modules/langgraph';
import { createDatabase } from '@/modules/database';
import type { Checkpoint, CheckpointMetadata } from '@/modules/langgraph';

describe('SQLiteCheckpointSaver', () => {
  let checkpointer: SQLiteCheckpointSaver;
  let db: any;

  beforeEach(async () => {
    // Create in-memory database for testing
    db = await createDatabase();
    checkpointer = new SQLiteCheckpointSaver(db);
  });

  afterEach(async () => {
    // Clean up database connections if needed
    if (db && db.destroy) {
      await db.destroy();
    }
  });

  describe('Basic Checkpoint Operations', () => {
    it('should create and retrieve a checkpoint', async () => {
      const config = {
        configurable: {
          thread_id: 'test-thread-1',
          checkpoint_ns: 'test'
        }
      };

      const checkpoint: Checkpoint = {
        id: 'cp-1',
        ts: new Date().toISOString(),
        channel_values: {
          messages: ['Hello', 'World'],
          counter: 1
        },
        channel_versions: {
          messages: 1,
          counter: 1
        },
        versions_seen: {
          agent: {
            messages: 1
          }
        }
      };

      const metadata: CheckpointMetadata = {
        source: 'update',
        step: 1,
        parents: {}
      };

      // Store checkpoint
      const checkpointId = await checkpointer.put(config, checkpoint, metadata);
      expect(checkpointId).toBeDefined();

      // Retrieve checkpoint
      const retrieved = await checkpointer.get(config);
      expect(retrieved).toBeDefined();
      expect(retrieved!.checkpoint.id).toBe(checkpoint.id);
      expect(retrieved!.checkpoint.channel_values).toEqual(checkpoint.channel_values);
      expect(retrieved!.metadata.source).toBe(metadata.source);
    });

    it('should list checkpoints in chronological order', async () => {
      const config = {
        configurable: {
          thread_id: 'test-thread-2',
          checkpoint_ns: 'test'
        }
      };

      const checkpoints: Checkpoint[] = [
        {
          id: 'cp-1',
          ts: '2024-01-01T00:00:00Z',
          channel_values: { step: 1 },
          channel_versions: { step: 1 },
          versions_seen: {}
        },
        {
          id: 'cp-2',
          ts: '2024-01-01T01:00:00Z',
          channel_values: { step: 2 },
          channel_versions: { step: 2 },
          versions_seen: {}
        },
        {
          id: 'cp-3',
          ts: '2024-01-01T02:00:00Z',
          channel_values: { step: 3 },
          channel_versions: { step: 3 },
          versions_seen: {}
        }
      ];

      const metadata: CheckpointMetadata = {
        source: 'update',
        step: 1,
        parents: {}
      };

      // Store checkpoints
      for (const checkpoint of checkpoints) {
        await checkpointer.put(config, checkpoint, metadata);
      }

      // List checkpoints
      const listedCheckpoints = [];
      for await (const cp of checkpointer.list(config)) {
        listedCheckpoints.push(cp);
      }

      expect(listedCheckpoints).toHaveLength(3);
      // Should be in descending order (newest first)
      expect(listedCheckpoints[0].checkpoint.id).toBe('cp-3');
      expect(listedCheckpoints[1].checkpoint.id).toBe('cp-2');
      expect(listedCheckpoints[2].checkpoint.id).toBe('cp-1');
    });

    it('should handle checkpoint retrieval by ID', async () => {
      const config = {
        configurable: {
          thread_id: 'test-thread-3',
          checkpoint_ns: 'test'
        }
      };

      const checkpoint: Checkpoint = {
        id: 'specific-cp',
        ts: new Date().toISOString(),
        channel_values: { data: 'test' },
        channel_versions: { data: 1 },
        versions_seen: {}
      };

      const metadata: CheckpointMetadata = {
        source: 'update',
        step: 1,
        parents: {}
      };

      // Store checkpoint
      const checkpointId = await checkpointer.put(config, checkpoint, metadata);

      // Retrieve by specific ID
      const specificConfig = {
        configurable: {
          thread_id: 'test-thread-3',
          checkpoint_ns: 'test',
          checkpoint_id: checkpointId
        }
      };

      const retrieved = await checkpointer.get(specificConfig);
      expect(retrieved).toBeDefined();
      expect(retrieved!.checkpoint.id).toBe(checkpoint.id);
    });

    it('should delete checkpoints', async () => {
      const config = {
        configurable: {
          thread_id: 'test-thread-4',
          checkpoint_ns: 'test'
        }
      };

      const checkpoint: Checkpoint = {
        id: 'cp-to-delete',
        ts: new Date().toISOString(),
        channel_values: { data: 'delete me' },
        channel_versions: { data: 1 },
        versions_seen: {}
      };

      const metadata: CheckpointMetadata = {
        source: 'update',
        step: 1,
        parents: {}
      };

      // Store checkpoint
      await checkpointer.put(config, checkpoint, metadata);

      // Verify it exists
      const retrieved = await checkpointer.get(config);
      expect(retrieved).toBeDefined();

      // Delete checkpoints
      await checkpointer.delete(config);

      // Verify it's gone
      const deleted = await checkpointer.get(config);
      expect(deleted).toBeUndefined();
    });
  });

  describe('Thread and Namespace Isolation', () => {
    it('should isolate checkpoints by thread_id', async () => {
      const config1 = {
        configurable: {
          thread_id: 'thread-1',
          checkpoint_ns: 'test'
        }
      };

      const config2 = {
        configurable: {
          thread_id: 'thread-2',
          checkpoint_ns: 'test'
        }
      };

      const checkpoint: Checkpoint = {
        id: 'cp-isolated',
        ts: new Date().toISOString(),
        channel_values: { thread: 'specific' },
        channel_versions: { thread: 1 },
        versions_seen: {}
      };

      const metadata: CheckpointMetadata = {
        source: 'update',
        step: 1,
        parents: {}
      };

      // Store checkpoint for thread 1
      await checkpointer.put(config1, checkpoint, metadata);

      // Should be retrievable from thread 1
      const retrieved1 = await checkpointer.get(config1);
      expect(retrieved1).toBeDefined();

      // Should not be retrievable from thread 2
      const retrieved2 = await checkpointer.get(config2);
      expect(retrieved2).toBeUndefined();
    });

    it('should isolate checkpoints by namespace', async () => {
      const config1 = {
        configurable: {
          thread_id: 'thread-ns',
          checkpoint_ns: 'namespace-1'
        }
      };

      const config2 = {
        configurable: {
          thread_id: 'thread-ns',
          checkpoint_ns: 'namespace-2'
        }
      };

      const checkpoint: Checkpoint = {
        id: 'cp-ns',
        ts: new Date().toISOString(),
        channel_values: { ns: 'specific' },
        channel_versions: { ns: 1 },
        versions_seen: {}
      };

      const metadata: CheckpointMetadata = {
        source: 'update',
        step: 1,
        parents: {}
      };

      // Store checkpoint for namespace 1
      await checkpointer.put(config1, checkpoint, metadata);

      // Should be retrievable from namespace 1
      const retrieved1 = await checkpointer.get(config1);
      expect(retrieved1).toBeDefined();

      // Should not be retrievable from namespace 2
      const retrieved2 = await checkpointer.get(config2);
      expect(retrieved2).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing thread_id gracefully', async () => {
      const invalidConfig = {
        configurable: {
          checkpoint_ns: 'test'
          // Missing thread_id
        }
      };

      const checkpoint: Checkpoint = {
        id: 'cp-error',
        ts: new Date().toISOString(),
        channel_values: {},
        channel_versions: {},
        versions_seen: {}
      };

      const metadata: CheckpointMetadata = {
        source: 'update',
        step: 1,
        parents: {}
      };

      await expect(
        checkpointer.put(invalidConfig, checkpoint, metadata)
      ).rejects.toThrow('thread_id is required');
    });

    it('should handle non-existent checkpoint retrieval', async () => {
      const config = {
        configurable: {
          thread_id: 'non-existent',
          checkpoint_ns: 'test',
          checkpoint_id: 'fake-id'
        }
      };

      const retrieved = await checkpointer.get(config);
      expect(retrieved).toBeUndefined();
    });
  });
});