/**
 * Agent State Persistence Test Suite
 *
 * Comprehensive test suite for agent state persistence, recovery, and management.
 * Tests ensure reliable state saving, loading, backup, restoration, and data integrity
 * across agent restarts and system failures.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentStatePersistence } from '../agent-state-persistence';
import { SQLiteCheckpointSaver } from '../checkpoints/SQLiteCheckpointSaver';
import { AgentType } from '../types';
import type { Kysely } from 'kysely';
import type { Database } from '@/shared/types/database';
import { mockDatabaseService } from '@/__tests__/utils/mocks/mock-services';

// Mock compression utilities
vi.mock('@/shared/utils/compression', () => ({
  compress: vi.fn().mockResolvedValue('compressed-data'),
  decompress: vi.fn().mockResolvedValue('original-data')
}));

// Mock SQLiteCheckpointSaver
vi.mock('../checkpoints/SQLiteCheckpointSaver', () => ({
  SQLiteCheckpointSaver: vi.fn().mockImplementation(() => ({
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({
      id: 'checkpoint-id',
      checkpoint: {
        v: 1,
        id: 'checkpoint-id',
        ts: Date.now(),
        channel_values: { messages: [] },
        channel_versions: {},
        versions_seen: {}
      }
    }),
    list: vi.fn().mockImplementation(async function* () {
      yield {
        id: 'checkpoint-1',
        checkpoint: {
          v: 1,
          id: 'checkpoint-1',
          ts: Date.now() - 10000,
          channel_values: { messages: [] },
          channel_versions: {},
          versions_seen: {}
        }
      };
    }),
    delete: vi.fn().mockResolvedValue(undefined)
  }))
}));

describe('AgentStatePersistence', () => {
  let statePersistence: AgentStatePersistence;
  let mockDb: Kysely<Database>;
  let mockLogger: any;
  let mockAls: any;

  // Create mock functions
  const createMockDatabase = () => {
    const createQueryBuilder = () => ({
      values: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue([]),
        executeTakeFirst: vi.fn().mockResolvedValue({ insertId: 1 }),
        executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ insertId: 1 }),
        returning: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([]),
          executeTakeFirst: vi.fn().mockResolvedValue(null),
          executeTakeFirstOrThrow: vi.fn().mockResolvedValue(null)
        }),
        returningAll: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([]),
          executeTakeFirst: vi.fn().mockResolvedValue(null),
          executeTakeFirstOrThrow: vi.fn().mockResolvedValue(null)
        })
      })
    });

    return {
      insertInto: vi.fn().mockReturnValue(createQueryBuilder()),
      selectFrom: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue([]),
        executeTakeFirst: vi.fn().mockResolvedValue(null),
        executeTakeFirstOrThrow: vi.fn().mockResolvedValue(null)
      }),
      updateTable: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue([])
          })
        })
      }),
      deleteFrom: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([])
        })
      }),
      transaction: vi.fn().mockImplementation((fn?: any) => {
        if (!fn) {
          return {
            execute: vi.fn().mockImplementation(async (executeFn: any) => {
              const tx = {
                insertInto: vi.fn().mockReturnValue(createQueryBuilder()),
                selectFrom: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnThis(),
                  orderBy: vi.fn().mockReturnThis(),
                  limit: vi.fn().mockReturnThis(),
                  execute: vi.fn().mockResolvedValue([]),
                  executeTakeFirst: vi.fn().mockResolvedValue(null)
                }),
                updateTable: vi.fn().mockReturnValue({
                  set: vi.fn().mockReturnThis()
                }),
                deleteFrom: vi.fn().mockReturnThis()
              };
              return await executeFn(tx);
            })
          };
        }
        // Support transaction(fn) pattern
        return fn(createQueryBuilder());
      }),
      fetchOne: vi.fn(),
      fetchAll: vi.fn()
    };
  };

  const createMockLogger = () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
    createContext: vi.fn((sessionId: string, operation: string, metadata: Record<string, any> = {}) => ({
      correlationId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      operation,
      timestamp: Date.now(),
      metadata
    }))
  });

  const createMockAsyncLocalStorage = () => {
    const currentStore = new Map();
    return {
      getStore: () => {
        const obj: any = {};
        currentStore.forEach((value, key) => {
          obj[key] = value;
        });
        return obj;
      },
      run: (context: any, fn: Function) => {
        const previousEntries = Array.from(currentStore.entries());
        currentStore.clear();

        if (typeof context === 'object' && context !== null) {
          Object.entries(context).forEach(([key, value]) => {
            currentStore.set(key, value);
          });
        }

        try {
          const result = fn();
          return result instanceof Promise ? result : Promise.resolve(result);
        } finally {
          currentStore.clear();
          previousEntries.forEach(([key, value]) => {
            currentStore.set(key, value);
          });
        }
      },
      enterWith: (context: any) => {
        if (typeof context === 'object' && context !== null) {
          currentStore.clear();
          Object.entries(context).forEach(([key, value]) => {
            currentStore.set(key, value);
          });
        }
        return context;
      },
      exit: (fn: Function) => fn()
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup comprehensive mocks
    mockDb = createMockDatabase();
    mockLogger = createMockLogger();
    mockAls = createMockAsyncLocalStorage();

    // Create AgentStatePersistence instance
    statePersistence = new AgentStatePersistence(
      mockDb,
      mockLogger,
      mockAls
    );

    // Setup default mock behaviors
    mockLogger.info.mockReturnValue(undefined);
    mockLogger.error.mockReturnValue(undefined);
    mockLogger.warn.mockReturnValue(undefined);
    mockLogger.debug.mockReturnValue(undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (statePersistence) {
      await statePersistence.dispose();
    }
  });

  describe('State Saving', () => {
    it('should save agent state successfully', async () => {
      const agentId = 'test-agent-id';
      const agentState = {
        status: 'active',
        lastActivity: Date.now(),
        currentTask: 'helping-user',
        conversationContext: {
          turnCount: 5,
          lastUserMessage: 'What is machine learning?',
          topics: ['machine learning', 'AI']
        },
        performanceMetrics: {
          totalResponses: 5,
          averageResponseTime: 250,
          userSatisfaction: 4.5
        },
        toolStates: {
          conceptParser: { lastUsed: Date.now(), cacheSize: 100 },
          knowledgeGraph: { nodesCount: 50, edgesCount: 75 }
        }
      };

      const result = await statePersistence.saveAgentState(agentId, agentState);

      expect(result.success).toBe(true);
      expect(result.stateId).toBeDefined();
      expect(result.timestamp).toBeDefined();

      expect(mockDb.insertInto).toHaveBeenCalledWith('agent_states');
      expect(mockCheckpointSaver.put).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Agent state saved successfully', {
        agentId,
        stateId: result.stateId,
        stateSize: expect.any(Number)
      });
    });

    it('should save state with checkpoint data', async () => {
      const agentId = 'test-agent-id';
      const agentState = {
        status: 'active',
        lastActivity: Date.now()
      };

      const checkpointData = {
        v: 1,
        id: 'checkpoint-id',
        ts: Date.now(),
        channel_values: {
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' }
          ],
          agent_state: agentState
        },
        channel_versions: { messages: 2 },
        versions_seen: { messages: 1 }
      };

      const result = await statePersistence.saveAgentState(agentId, agentState, {
        checkpointData
      });

      expect(result.success).toBe(true);
      expect(mockCheckpointSaver.put).toHaveBeenCalledWith(
        { configurable: { thread_id: agentId, checkpoint_ns: 'agent_state' } },
        checkpointData
      );
    });

    it('should handle large state data efficiently', async () => {
      const agentId = 'test-agent-id';
      const largeState = {
        status: 'active',
        lastActivity: Date.now(),
        bigData: new Array(10000).fill(0).map((_, i) => ({ id: i, data: `item-${i}` }))
      };

      const result = await statePersistence.saveAgentState(agentId, largeState);

      expect(result.success).toBe(true);
      expect(result.compressed).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Large state data compressed', {
        agentId,
        originalSize: expect.any(Number),
        compressedSize: expect.any(Number),
        compressionRatio: expect.any(Number)
      });
    });

    it('should handle save failures gracefully', async () => {
      const agentId = 'test-agent-id';
      const agentState = { status: 'active' };

      mockDb.insertInto.mockRejectedValue(new Error('Database error'));

      const result = await statePersistence.saveAgentState(agentId, agentState);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to save agent state', expect.any(Error));
    });

    it('should save state with metadata', async () => {
      const agentId = 'test-agent-id';
      const agentState = { status: 'active' };
      const metadata = {
        version: '1.0.0',
        environment: 'production',
        userId: 'user-123',
        sessionId: 'session-456'
      };

      const result = await statePersistence.saveAgentState(agentId, agentState, { metadata });

      expect(result.success).toBe(true);
      expect(mockDb.insertInto).toHaveBeenCalledWith('agent_states');

      // Verify metadata was included
      const insertCall = mockDb.insertInto.mock.calls[0][1];
      expect(insertCall.values).toHaveProperty('metadata');
    });

    it('should validate state data before saving', async () => {
      const agentId = 'test-agent-id';
      const invalidStates = [
        null,
        undefined,
        'not-an-object',
        { circular: null }
      ];

      // Create circular reference
      const circularState: any = { status: 'active' };
      circularState.circular = circularState;

      for (const state of [...invalidStates, circularState]) {
        const result = await statePersistence.saveAgentState(agentId, state as any);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid state data');
      }
    });
  });

  describe('State Loading', () => {
    beforeEach(async () => {
      // Setup default state data in database mock
      mockDb.selectFrom.mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              executeTakeFirst: vi.fn().mockResolvedValue({
                id: 'state-id',
                agent_id: 'test-agent-id',
                state_data: JSON.stringify({
                  status: 'active',
                  lastActivity: Date.now(),
                  currentTask: 'helping-user'
                }),
                metadata: JSON.stringify({
                  version: '1.0.0',
                  savedAt: Date.now()
                }),
                created_at: new Date(),
                updated_at: new Date()
              })
            })
          })
        })
      } as any);
    });

    it('should load agent state successfully', async () => {
      const agentId = 'test-agent-id';

      const result = await statePersistence.loadAgentState(agentId);

      expect(result.success).toBe(true);
      expect(result.state).toBeDefined();
      expect(result.state.status).toBe('active');
      expect(result.state.lastActivity).toBeDefined();
      expect(result.stateId).toBe('state-id');
      expect(result.metadata).toBeDefined();

      expect(mockDb.selectFrom).toHaveBeenCalledWith('agent_states');
      expect(mockLogger.info).toHaveBeenCalledWith('Agent state loaded successfully', {
        agentId,
        stateId: 'state-id'
      });
    });

    it('should load state with checkpoint restoration', async () => {
      const agentId = 'test-agent-id';

      const result = await statePersistence.loadAgentState(agentId, {
        restoreCheckpoint: true
      });

      expect(result.success).toBe(true);
      expect(result.checkpoint).toBeDefined();
      expect(mockCheckpointSaver.get).toHaveBeenCalled();

      expect(mockLogger.info).toHaveBeenCalledWith('Agent checkpoint restored', {
        agentId,
        checkpointId: 'checkpoint-id'
      });
    });

    it('should handle non-existent agent state', async () => {
      const agentId = 'non-existent-agent';

      mockDb.selectFrom.mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              executeTakeFirst: vi.fn().mockResolvedValue(null)
            })
          })
        })
      } as any);

      const result = await statePersistence.loadAgentState(agentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No state found');

      expect(mockLogger.warn).toHaveBeenCalledWith('No state found for agent', {
        agentId: 'non-existent-agent'
      });
    });

    it('should handle corrupted state data', async () => {
      const agentId = 'corrupted-agent';

      mockDb.selectFrom.mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              executeTakeFirst: vi.fn().mockResolvedValue({
                id: 'corrupted-state-id',
                agent_id: agentId,
                state_data: 'invalid-json-data',
                metadata: '{}',
                created_at: new Date(),
                updated_at: new Date()
              })
            })
          })
        })
      } as any);

      const result = await statePersistence.loadAgentState(agentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Corrupted state data');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to parse agent state data', expect.any(Error));
    });

    it('should load specific state version', async () => {
      const agentId = 'test-agent-id';
      const stateId = 'specific-state-id';

      mockDb.selectFrom.mockReturnValue({
        where: vi.fn().mockReturnValue({
          executeTakeFirst: vi.fn().mockResolvedValue({
            id: stateId,
            agent_id: agentId,
            state_data: JSON.stringify({
              status: 'inactive',
              version: '2.0.0'
            }),
            metadata: '{}',
            created_at: new Date(),
            updated_at: new Date()
          })
        })
      } as any);

      const result = await statePersistence.loadAgentState(agentId, { stateId });

      expect(result.success).toBe(true);
      expect(result.state.status).toBe('inactive');
      expect(result.state.version).toBe('2.0.0');
      expect(result.stateId).toBe(stateId);
    });

    it('should decompress compressed state data', async () => {
      const agentId = 'compressed-agent';

      mockDb.selectFrom.mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              executeTakeFirst: vi.fn().mockResolvedValue({
                id: 'compressed-state-id',
                agent_id: agentId,
                state_data: 'compressed-data-string',
                metadata: JSON.stringify({ compressed: true }),
                created_at: new Date(),
                updated_at: new Date()
              })
            })
          })
        })
      } as any);

      // Mock decompression
      const originalData = { status: 'active', largeData: new Array(1000).fill('data') };
      vi.spyOn(statePersistence as any, 'decompressData').mockResolvedValue(originalData);

      const result = await statePersistence.loadAgentState(agentId);

      expect(result.success).toBe(true);
      expect(result.state).toEqual(originalData);
      expect(mockLogger.info).toHaveBeenCalledWith('State data decompressed', {
        agentId,
        compressedSize: expect.any(Number),
        originalSize: expect.any(Number)
      });
    });
  });

  describe('State History and Versioning', () => {
    beforeEach(() => {
      mockDb.selectFrom.mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              execute: vi.fn().mockResolvedValue([
                {
                  id: 'state-1',
                  agent_id: 'test-agent',
                  state_data: JSON.stringify({ version: 1, status: 'active' }),
                  metadata: '{}',
                  created_at: new Date(Date.now() - 10000),
                  updated_at: new Date(Date.now() - 10000)
                },
                {
                  id: 'state-2',
                  agent_id: 'test-agent',
                  state_data: JSON.stringify({ version: 2, status: 'busy' }),
                  metadata: '{}',
                  created_at: new Date(Date.now() - 5000),
                  updated_at: new Date(Date.now() - 5000)
                },
                {
                  id: 'state-3',
                  agent_id: 'test-agent',
                  state_data: JSON.stringify({ version: 3, status: 'active' }),
                  metadata: '{}',
                  created_at: new Date(),
                  updated_at: new Date()
                }
              ])
            })
          })
        })
      } as any);
    });

    it('should get state history for agent', async () => {
      const agentId = 'test-agent';

      const history = await statePersistence.getStateHistory(agentId);

      expect(history).toHaveLength(3);
      expect(history[0].id).toBe('state-1');
      expect(history[0].state.version).toBe(1);
      expect(history[1].state.version).toBe(2);
      expect(history[2].state.version).toBe(3);

      expect(mockDb.selectFrom).toHaveBeenCalledWith('agent_states');
      expect(mockLogger.info).toHaveBeenCalledWith('State history retrieved', {
        agentId,
        stateCount: 3
      });
    });

    it('should get state history with pagination', async () => {
      const agentId = 'test-agent';

      const history = await statePersistence.getStateHistory(agentId, {
        limit: 2,
        offset: 1
      });

      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('state-2');
      expect(history[1].id).toBe('state-3');
    });

    it('should get state history with date range filtering', async () => {
      const agentId = 'test-agent';
      const startDate = Date.now() - 7000;
      const endDate = Date.now() - 2000;

      const history = await statePersistence.getStateHistory(agentId, {
        startDate,
        endDate
      });

      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('state-2');
    });

    it('should get checkpoint history', async () => {
      const agentId = 'test-agent';

      const checkpointHistory = await statePersistence.getCheckpointHistory(agentId);

      expect(checkpointHistory).toHaveLength(2);
      expect(checkpointHistory[0].id).toBe('checkpoint-1');
      expect(checkpointHistory[1].id).toBe('checkpoint-2');

      expect(mockCheckpointSaver.list).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Checkpoint history retrieved', {
        agentId,
        checkpointCount: 2
      });
    });

    it('should restore from specific checkpoint', async () => {
      const agentId = 'test-agent';
      const checkpointId = 'checkpoint-2';

      const result = await statePersistence.restoreFromCheckpoint(agentId, checkpointId);

      expect(result.success).toBe(true);
      expect(result.checkpointId).toBe(checkpointId);

      expect(mockCheckpointSaver.get).toHaveBeenCalledWith({
        configurable: {
          thread_id: agentId,
          checkpoint_ns: 'agent_state',
          checkpoint_id: checkpointId
        }
      });
    });

    it('should handle checkpoint restoration failures', async () => {
      const agentId = 'test-agent';
      const checkpointId = 'non-existent-checkpoint';

      mockCheckpointSaver.get.mockResolvedValue(null);

      const result = await statePersistence.restoreFromCheckpoint(agentId, checkpointId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Checkpoint not found');

      expect(mockLogger.warn).toHaveBeenCalledWith('Checkpoint not found', {
        agentId,
        checkpointId
      });
    });
  });

  describe('State Backup and Restoration', () => {
    it('should create state backup', async () => {
      const agentId = 'test-agent';
      const backupConfig = {
        destination: '/backups/agent-states',
        includeCheckpoints: true,
        compression: true
      };

      mockDb.selectFrom.mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([{
            id: 'state-1',
            agent_id: agentId,
            state_data: JSON.stringify({ status: 'active' }),
            metadata: '{}',
            created_at: new Date(),
            updated_at: new Date()
          }])
        })
      } as any);

      const result = await statePersistence.createBackup(agentId, backupConfig);

      expect(result.success).toBe(true);
      expect(result.backupId).toBeDefined();
      expect(result.backupPath).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Agent state backup created', {
        agentId,
        backupId: result.backupId,
        backupPath: result.backupPath
      });
    });

    it('should restore from backup', async () => {
      const agentId = 'test-agent';
      const backupId = 'backup-123';

      const result = await statePersistence.restoreFromBackup(agentId, backupId);

      expect(result.success).toBe(true);
      expect(result.restoredStates).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Agent state restored from backup', {
        agentId,
        backupId,
        stateCount: expect.any(Number)
      });
    });

    it('should handle backup creation failures', async () => {
      const agentId = 'test-agent';

      mockDb.selectFrom.mockRejectedValue(new Error('Database error during backup'));

      const result = await statePersistence.createBackup(agentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to create state backup', expect.any(Error));
    });

    it('should schedule automatic backups', async () => {
      const agentId = 'test-agent';
      const schedule = {
        interval: 3600000, // 1 hour
        maxBackups: 10,
        destination: '/backups/automatic'
      };

      const result = await statePersistence.scheduleAutomaticBackups(agentId, schedule);

      expect(result.success).toBe(true);
      expect(result.scheduleId).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Automatic state backups scheduled', {
        agentId,
        scheduleId: result.scheduleId,
        interval: schedule.interval
      });
    });
  });

  describe('State Cleanup and Maintenance', () => {
    it('should cleanup old states', async () => {
      const agentId = 'test-agent';
      const cleanupOptions = {
        olderThan: Date.now() - 86400000, // 24 hours ago
        keepLatest: 5
      };

      mockDb.deleteFrom.mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue({ numDeletedRows: BigInt(3) })
        })
      } as any);

      const result = await statePersistence.cleanupOldStates(agentId, cleanupOptions);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(3);

      expect(mockDb.deleteFrom).toHaveBeenCalledWith('agent_states');
      expect(mockLogger.info).toHaveBeenCalledWith('Old states cleaned up', {
        agentId,
        deletedCount: 3
      });
    });

    it('should cleanup orphaned checkpoints', async () => {
      const result = await statePersistence.cleanupOrphanedCheckpoints();

      expect(result.success).toBe(true);
      expect(result.deletedCheckpoints).toBeDefined();

      expect(mockCheckpointSaver.delete).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Orphaned checkpoints cleaned up', {
        deletedCount: expect.any(Number)
      });
    });

    it('should compact state history', async () => {
      const agentId = 'test-agent';
      const compactionOptions = {
        targetCount: 10,
        preserveImportant: true,
        mergeStrategy: 'latest-wins'
      };

      const result = await statePersistence.compactStateHistory(agentId, compactionOptions);

      expect(result.success).toBe(true);
      expect(result.originalCount).toBeGreaterThan(result.finalCount);

      expect(mockLogger.info).toHaveBeenCalledWith('State history compacted', {
        agentId,
        originalCount: result.originalCount,
        finalCount: result.finalCount,
        reductionRatio: expect.any(Number)
      });
    });

    it('should validate state integrity', async () => {
      const agentId = 'test-agent';

      mockDb.selectFrom.mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([{
            id: 'state-1',
            agent_id: agentId,
            state_data: JSON.stringify({ status: 'active' }),
            metadata: JSON.stringify({ checksum: 'abc123' }),
            created_at: new Date(),
            updated_at: new Date()
          }])
        })
      } as any);

      const result = await statePersistence.validateStateIntegrity(agentId);

      expect(result.valid).toBe(true);
      expect(result.checkedStates).toBe(1);
      expect(result.corruptedStates).toBe(0);

      expect(mockLogger.info).toHaveBeenCalledWith('State integrity validation completed', {
        agentId,
        valid: true,
        checkedStates: 1
      });
    });

    it('should detect corrupted state during integrity check', async () => {
      const agentId = 'corrupted-agent';

      mockDb.selectFrom.mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([{
            id: 'corrupted-state',
            agent_id: agentId,
            state_data: 'invalid-json',
            metadata: '{}',
            created_at: new Date(),
            updated_at: new Date()
          }])
        })
      } as any);

      const result = await statePersistence.validateStateIntegrity(agentId);

      expect(result.valid).toBe(false);
      expect(result.corruptedStates).toBe(1);
      expect(result.corruptedStateIds).toContain('corrupted-state');

      expect(mockLogger.warn).toHaveBeenCalledWith('Corrupted state detected', {
        agentId,
        stateId: 'corrupted-state'
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large state data efficiently', async () => {
      const agentId = 'large-state-agent';
      const largeState = {
        status: 'active',
        largeDataset: new Array(100000).fill(0).map((_, i) => ({
          id: i,
          data: `item-data-${i}`,
          timestamp: Date.now() - i
        })),
        metadata: {
          version: '1.0.0',
          generatedAt: Date.now()
        }
      };

      const startTime = performance.now();
      const result = await statePersistence.saveAgentState(agentId, largeState);
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      expect(mockLogger.info).toHaveBeenCalledWith('Large state data processed', {
        agentId,
        dataSize: expect.any(Number),
        processingTime: Math.round(duration)
      });
    });

    it('should handle concurrent state operations', async () => {
      const agentIds = Array.from({ length: 10 }, (_, i) => `agent-${i}`);
      const stateData = {
        status: 'active',
        lastActivity: Date.now()
      };

      const startTime = performance.now();

      // Save states concurrently
      const savePromises = agentIds.map(agentId =>
        statePersistence.saveAgentState(agentId, stateData)
      );
      const saveResults = await Promise.all(savePromises);

      // Load states concurrently
      const loadPromises = agentIds.map(agentId =>
        statePersistence.loadAgentState(agentId)
      );
      const loadResults = await Promise.all(loadPromises);

      const duration = performance.now() - startTime;

      expect(saveResults).toHaveLength(10);
      expect(loadResults).toHaveLength(10);
      expect(duration).toBeLessThan(2000); // All operations within 2 seconds

      saveResults.forEach(result => {
        expect(result.success).toBe(true);
      });

      loadResults.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should maintain performance under high load', async () => {
      const agentId = 'performance-test-agent';
      const operationCount = 100;
      const stateData = { status: 'active', counter: 0 };

      const startTime = performance.now();

      // Perform many state save/load cycles
      for (let i = 0; i < operationCount; i++) {
        stateData.counter = i;
        await statePersistence.saveAgentState(agentId, stateData);
        await statePersistence.loadAgentState(agentId);
      }

      const duration = performance.now() - startTime;
      const averageOperationTime = duration / (operationCount * 2);

      expect(averageOperationTime).toBeLessThan(10); // Average < 10ms per operation
      expect(duration).toBeLessThan(5000); // Total < 5 seconds

      expect(mockLogger.info).toHaveBeenCalledWith('Performance test completed', {
        agentId,
        operationCount,
        totalDuration: Math.round(duration),
        averageOperationTime: Math.round(averageOperationTime)
      });
    });

    it('should handle memory efficiently with large datasets', async () => {
      const agentId = 'memory-test-agent';
      const stateData = {
        status: 'active',
        memoryIntensiveData: new Array(1000000).fill(0).map((_, i) => ({
          id: i,
          payload: new Array(100).fill(`data-${i}`)
        }))
      };

      // Monitor memory usage
      const initialMemory = process.memoryUsage().heapUsed;

      const result = await statePersistence.saveAgentState(agentId, stateData);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(result.success).toBe(true);
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase

      // Cleanup to free memory
      await statePersistence.cleanupOldStates(agentId, { olderThan: Date.now() });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database connection failures', async () => {
      const agentId = 'error-agent';
      const stateData = { status: 'active' };

      mockDb.insertInto.mockRejectedValue(new Error('Connection timeout'));

      const result = await statePersistence.saveAgentState(agentId, stateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection timeout');

      expect(mockLogger.error).toHaveBeenCalledWith('Database connection failed during state save', expect.any(Error));
    });

    it('should handle checkpoint system failures', async () => {
      const agentId = 'checkpoint-error-agent';
      const stateData = { status: 'active' };

      mockCheckpointSaver.put.mockRejectedValue(new Error('Checkpoint system unavailable'));

      const result = await statePersistence.saveAgentState(agentId, stateData, {
        checkpointData: { v: 1, channel_values: {} }
      });

      expect(result.success).toBe(true); // State saved, checkpoint failed
      expect(result.checkpointSaved).toBe(false);

      expect(mockLogger.warn).toHaveBeenCalledWith('Checkpoint save failed', {
        agentId,
        error: 'Checkpoint system unavailable'
      });
    });

    it('should recover from partial failures', async () => {
      const agentId = 'recovery-agent';
      const stateData = { status: 'active' };

      // First call fails
      mockDb.insertInto.mockRejectedValueOnce(new Error('Temporary failure'));

      const firstResult = await statePersistence.saveAgentState(agentId, stateData);
      expect(firstResult.success).toBe(false);

      // Second call succeeds
      mockDb.insertFrom.mockReturnValue({
        values: vi.fn().mockReturnValue({
          executeTakeFirst: vi.fn().mockResolvedValue({ id: 'recovered-state' })
        })
      } as any);

      const secondResult = await statePersistence.saveAgentState(agentId, stateData);
      expect(secondResult.success).toBe(true);

      expect(mockLogger.info).toHaveBeenCalledWith('State save recovered after failure', {
        agentId,
        failureCount: 1
      });
    });

    it('should maintain data consistency during failures', async () => {
      const agentId = 'consistency-agent';
      const stateData = { status: 'active', version: 1 };

      // Mock transaction failure
      mockDb.transaction.mockRejectedValue(new Error('Transaction failed'));

      const result = await statePersistence.saveAgentState(agentId, stateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transaction failed');

      // Verify no partial data was saved
      expect(mockLogger.warn).toHaveBeenCalledWith('Transaction rolled back due to failure', {
        agentId
      });
    });
  });

  describe('Integration with AsyncLocalStorage', () => {
    it('should maintain context across state operations', async () => {
      const agentId = 'context-test-agent';
      const stateData = { status: 'active' };

      let contextId: string | undefined;

      await statePersistence.runWithContext('state-operations', async () => {
        contextId = mockAls.getStore()?.get('correlationId');

        await statePersistence.saveAgentState(agentId, stateData);
        const loaded = await statePersistence.loadAgentState(agentId);

        expect(loaded.success).toBe(true);
      });

      expect(contextId).toBeDefined();
      expect(mockAls.run).toHaveBeenCalled();
    });

    it('should preserve context across backup and restore operations', async () => {
      const agentId = 'backup-context-agent';

      await statePersistence.runWithContext('backup-restore', async () => {
        const backup = await statePersistence.createBackup(agentId);
        expect(backup.success).toBe(true);

        const restore = await statePersistence.restoreFromBackup(agentId, backup.backupId);
        expect(restore.success).toBe(true);
      });

      expect(mockAls.run).toHaveBeenCalledTimes(2);
    });
  });
});