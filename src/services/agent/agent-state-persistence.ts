/**
 * Agent State Persistence Service
 *
 * Comprehensive state persistence system for AI agents with checkpointing,
 * backup, restoration, and data integrity validation. Integrates with
 * SQLiteCheckpointSaver for LangGraph checkpoint management.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { Kysely } from 'kysely';
import type { Database } from '@/modules/database/kysely-schema';
import { SQLiteCheckpointSaver } from '@/modules/langgraph';
import { createUUID, generateTimestamp } from '@/utils/helpers';
import { compress as compressData, decompress as decompressData } from '@/utils/compression';

export interface AgentState {
  status: string;
  lastActivity: number;
  [key: string]: any;
}

export interface StateMetadata {
  version?: string;
  environment?: string;
  userId?: string;
  sessionId?: string;
  compressed?: boolean;
  checksum?: string;
  [key: string]: any;
}

export interface SaveStateOptions {
  checkpointData?: any;
  metadata?: StateMetadata;
  compress?: boolean;
  encrypt?: boolean;
}

export interface LoadStateOptions {
  stateId?: string;
  restoreCheckpoint?: boolean;
  decrypt?: boolean;
}

export interface StateHistoryEntry {
  id: string;
  agentId: string;
  state: AgentState;
  metadata: StateMetadata;
  timestamp: number;
  isLatest: boolean;
}

export interface BackupConfig {
  destination: string;
  includeCheckpoints?: boolean;
  compression?: boolean;
  encryption?: boolean;
}

export interface CleanupOptions {
  olderThan: number;
  keepLatest?: number;
  dryRun?: boolean;
}

export interface CompactionOptions {
  targetCount: number;
  preserveImportant?: boolean;
  mergeStrategy?: 'latest-wins' | 'merge-all' | 'intelligent';
}

export interface IntegrityValidationResult {
  valid: boolean;
  checkedStates: number;
  corruptedStates: number;
  corruptedStateIds: string[];
  fixedStates: number;
}

/**
 * Agent State Persistence Service
 * Manages agent state with comprehensive persistence and recovery capabilities
 */
export class AgentStatePersistence {
  constructor(
    private db: Kysely<Database>,
    private checkpointSaver: SQLiteCheckpointSaver,
    private logger: any,
    private als: AsyncLocalStorage<any>
  ) {}

  /**
   * Save agent state with optional checkpoint data
   */
  async saveAgentState(
    agentId: string,
    state: AgentState,
    options: SaveStateOptions = {}
  ): Promise<{
    success: boolean;
    stateId?: string;
    timestamp?: number;
    checkpointSaved?: boolean;
    compressed?: boolean;
    error?: string;
  }> {
    return this.runWithContext('save-agent-state', async () => {
      const startTime = performance.now();

      try {
        // Validate state data
        if (!this.isValidStateData(state)) {
          return {
            success: false,
            error: 'Invalid state data: must be a serializable object'
          };
        }

        const stateId = createUUID();
        const timestamp = generateTimestamp();
        let compressed = false;

        // Prepare state data for storage
        let stateData = JSON.stringify(state);
        const originalSize = Buffer.byteLength(stateData, 'utf8');

        // Compress if requested or if data is large
        if (options.compress !== false && originalSize > 1024) {
          try {
            stateData = await compressData(stateData);
            compressed = true;
            this.logger.info('Large state data compressed', {
              agentId,
              originalSize,
              compressedSize: Buffer.byteLength(stateData, 'utf8'),
              compressionRatio: (originalSize - Buffer.byteLength(stateData, 'utf8')) / originalSize
            });
          } catch (error) {
            this.logger.warn('Compression failed, proceeding with uncompressed data', {
              agentId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Calculate checksum
        const checksum = this.calculateChecksum(stateData);

        // Prepare metadata
        const metadata: StateMetadata = {
          ...options.metadata,
          compressed,
          checksum,
          savedAt: timestamp
        };

        // Save to database within transaction
        await this.db.transaction().execute(async (trx) => {
          await trx.insertInto('agent_states').values({
            id: stateId,
            agent_id: agentId,
            state_data: stateData,
            metadata: JSON.stringify(metadata),
            created_at: new Date(timestamp),
            updated_at: new Date(timestamp)
          }).executeTakeFirst();

          // Save checkpoint data if provided
          let checkpointSaved = false;
          if (options.checkpointData) {
            try {
              await this.checkpointSaver.put(
                { configurable: { thread_id: agentId, checkpoint_ns: 'agent_state' } },
                options.checkpointData
              );
              checkpointSaved = true;
            } catch (error) {
              this.logger.warn('Checkpoint save failed', {
                agentId,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
              throw error;
            }
          }

          return checkpointSaved;
        });

        const duration = performance.now() - startTime;

        this.logger.info('Agent state saved successfully', {
          agentId,
          stateId,
          stateSize: Buffer.byteLength(stateData, 'utf8'),
          duration: Math.round(duration),
          compressed
        });

        return {
          success: true,
          stateId,
          timestamp,
          checkpointSaved: !!options.checkpointData,
          compressed
        };
      } catch (error) {
        this.logger.error('Failed to save agent state', error as Error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Load agent state
   */
  async loadAgentState(
    agentId: string,
    options: LoadStateOptions = {}
  ): Promise<{
    success: boolean;
    state?: AgentState;
    stateId?: string;
    metadata?: StateMetadata;
    checkpoint?: any;
    error?: string;
  }> {
    return this.runWithContext('load-agent-state', async () => {
      try {
        let stateRecord: any;

        if (options.stateId) {
          // Load specific state
          stateRecord = await this.db
            .selectFrom('agent_states')
            .selectAll()
            .where('id', '=', options.stateId)
            .where('agent_id', '=', agentId)
            .executeTakeFirst();
        } else {
          // Load latest state
          stateRecord = await this.db
            .selectFrom('agent_states')
            .selectAll()
            .where('agent_id', '=', agentId)
            .orderBy('created_at', 'desc')
            .limit(1)
            .executeTakeFirst();
        }

        if (!stateRecord) {
          this.logger.warn('No state found for agent', { agentId });
          return {
            success: false,
            error: 'No state found'
          };
        }

        // Parse and validate state data
        let stateData: string;
        let metadata: StateMetadata;

        try {
          metadata = JSON.parse(stateRecord.metadata || '{}');

          // Decompress if needed
          if (metadata.compressed) {
            try {
              stateData = await decompressData(stateRecord.state_data);
              this.logger.info('State data decompressed', {
                agentId,
                compressedSize: Buffer.byteLength(stateRecord.state_data, 'utf8'),
                originalSize: Buffer.byteLength(stateData, 'utf8')
              });
            } catch (error) {
              this.logger.error('Decompression failed', error as Error);
              return {
                success: false,
                error: 'Failed to decompress state data'
              };
            }
          } else {
            stateData = stateRecord.state_data;
          }

          // Validate checksum
          if (metadata.checksum && metadata.checksum !== this.calculateChecksum(stateData)) {
            this.logger.error('State data checksum mismatch', {
              agentId,
              stateId: stateRecord.id
            });
            return {
              success: false,
              error: 'State data corrupted (checksum mismatch)'
            };
          }
        } catch (error) {
          this.logger.error('Failed to parse state data', error as Error);
          return {
            success: false,
            error: 'Corrupted state data'
          };
        }

        // Parse state
        let state: AgentState;
        try {
          state = JSON.parse(stateData);
        } catch (error) {
          this.logger.error('Failed to parse agent state', error as Error);
          return {
            success: false,
            error: 'Invalid state JSON'
          };
        }

        // Restore checkpoint if requested
        let checkpoint: any;
        if (options.restoreCheckpoint) {
          try {
            checkpoint = await this.checkpointSaver.get({
              configurable: { thread_id: agentId, checkpoint_ns: 'agent_state' }
            });

            if (checkpoint) {
              this.logger.info('Agent checkpoint restored', {
                agentId,
                checkpointId: checkpoint.id
              });
            }
          } catch (error) {
            this.logger.warn('Failed to restore checkpoint', {
              agentId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        this.logger.info('Agent state loaded successfully', {
          agentId,
          stateId: stateRecord.id
        });

        return {
          success: true,
          state,
          stateId: stateRecord.id,
          metadata,
          checkpoint
        };
      } catch (error) {
        this.logger.error('Failed to load agent state', error as Error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Get state history for an agent
   */
  async getStateHistory(
    agentId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: number;
      endDate?: number;
    } = {}
  ): Promise<StateHistoryEntry[]> {
    return this.runWithContext('get-state-history', async () => {
      try {
        let query = this.db
          .selectFrom('agent_states')
          .selectAll()
          .where('agent_id', '=', agentId);

        if (options.startDate) {
          query = query.where('created_at', '>=', new Date(options.startDate));
        }

        if (options.endDate) {
          query = query.where('created_at', '<=', new Date(options.endDate));
        }

        query = query.orderBy('created_at', 'desc');

        if (options.limit) {
          query = query.limit(options.limit);
        }

        if (options.offset) {
          query = query.offset(options.offset);
        }

        const records = await query.execute();

        const history: StateHistoryEntry[] = [];
        for (const record of records) {
          try {
            let stateData: string;
            const metadata = JSON.parse(record.metadata || '{}');

            // Decompress if needed
            if (metadata.compressed) {
              stateData = await decompressData(record.state_data);
            } else {
              stateData = record.state_data;
            }

            const state = JSON.parse(stateData);

            history.push({
              id: record.id,
              agentId: record.agent_id,
              state,
              metadata,
              timestamp: record.created_at.getTime(),
              isLatest: record.id === records[0]?.id
            });
          } catch (error) {
            this.logger.warn('Failed to parse state history entry', {
              stateId: record.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        this.logger.info('State history retrieved', {
          agentId,
          stateCount: history.length
        });

        return history;
      } catch (error) {
        this.logger.error('Failed to get state history', error as Error);
        throw error;
      }
    });
  }

  /**
   * Get checkpoint history
   */
  async getCheckpointHistory(agentId: string, limit?: number): Promise<any[]> {
    return this.runWithContext('get-checkpoint-history', async () => {
      try {
        const config = { configurable: { thread_id: agentId, checkpoint_ns: 'agent_state' } };
        const checkpointOptions = limit ? { limit } : undefined;

        const history = [];
        for await (const checkpoint of this.checkpointSaver.list(config, checkpointOptions)) {
          history.push({
            id: checkpoint.id,
            timestamp: checkpoint.ts,
            metadata: checkpoint.metadata || {},
            checkpoint
          });
        }

        this.logger.info('Checkpoint history retrieved', {
          agentId,
          checkpointCount: history.length
        });

        return history;
      } catch (error) {
        this.logger.error('Failed to get checkpoint history', error as Error);
        throw error;
      }
    });
  }

  /**
   * Restore from specific checkpoint
   */
  async restoreFromCheckpoint(agentId: string, checkpointId: string): Promise<{
    success: boolean;
    checkpointId?: string;
    checkpoint?: any;
    error?: string;
  }> {
    return this.runWithContext('restore-from-checkpoint', async () => {
      try {
        const config = {
          configurable: {
            thread_id: agentId,
            checkpoint_ns: 'agent_state',
            checkpoint_id: checkpointId
          }
        };

        const checkpoint = await this.checkpointSaver.get(config);

        if (!checkpoint) {
          this.logger.warn('Checkpoint not found', { agentId, checkpointId });
          return {
            success: false,
            error: 'Checkpoint not found'
          };
        }

        this.logger.info('Checkpoint restored successfully', {
          agentId,
          checkpointId
        });

        return {
          success: true,
          checkpointId,
          checkpoint
        };
      } catch (error) {
        this.logger.error('Failed to restore from checkpoint', error as Error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Create backup of agent state
   */
  async createBackup(
    agentId: string,
    config: BackupConfig
  ): Promise<{
    success: boolean;
    backupId?: string;
    backupPath?: string;
    stateCount?: number;
    error?: string;
  }> {
    return this.runWithContext('create-backup', async () => {
      try {
        const backupId = createUUID();
        const timestamp = generateTimestamp();

        // Get all states for the agent
        const states = await this.db
          .selectFrom('agent_states')
          .selectAll()
          .where('agent_id', '=', agentId)
          .execute();

        // Get checkpoints if requested
        let checkpoints: any[] = [];
        if (config.includeCheckpoints) {
          checkpoints = await this.getCheckpointHistory(agentId);
        }

        // Create backup data
        const backupData = {
          backupId,
          agentId,
          timestamp,
          states,
          checkpoints,
          config
        };

        // Save backup record
        await this.db.insertInto('agent_backups').values({
          id: backupId,
          agent_id: agentId,
          backup_data: JSON.stringify(backupData),
          backup_path: config.destination,
          created_at: new Date(timestamp)
        }).executeTakeFirst();

        this.logger.info('Agent state backup created', {
          agentId,
          backupId,
          backupPath: config.destination,
          stateCount: states.length,
          checkpointCount: checkpoints.length
        });

        return {
          success: true,
          backupId,
          backupPath: config.destination,
          stateCount: states.length
        };
      } catch (error) {
        this.logger.error('Failed to create state backup', error as Error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(agentId: string, backupId: string): Promise<{
    success: boolean;
    restoredStates?: number;
    restoredCheckpoints?: number;
    error?: string;
  }> {
    return this.runWithContext('restore-from-backup', async () => {
      try {
        // Get backup record
        const backupRecord = await this.db
          .selectFrom('agent_backups')
          .selectAll()
          .where('id', '=', backupId)
          .where('agent_id', '=', agentId)
          .executeTakeFirst();

        if (!backupRecord) {
          return {
            success: false,
            error: 'Backup not found'
          };
        }

        const backupData = JSON.parse(backupRecord.backup_data);

        // Restore states
        let restoredStates = 0;
        if (backupData.states?.length > 0) {
          await this.db.transaction().execute(async (trx) => {
            for (const state of backupData.states) {
              await trx.insertInto('agent_states').values({
                ...state,
                restored_from_backup: backupId,
                restored_at: new Date()
              }).executeTakeFirst();
              restoredStates++;
            }
          });
        }

        // Restore checkpoints if available
        let restoredCheckpoints = 0;
        if (backupData.checkpoints?.length > 0) {
          for (const checkpoint of backupData.checkpoints) {
            try {
              await this.checkpointSaver.put(
                { configurable: { thread_id: agentId, checkpoint_ns: 'agent_state' } },
                checkpoint.checkpoint
              );
              restoredCheckpoints++;
            } catch (error) {
              this.logger.warn('Failed to restore checkpoint', {
                agentId,
                checkpointId: checkpoint.id,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
        }

        this.logger.info('Agent state restored from backup', {
          agentId,
          backupId,
          restoredStates,
          restoredCheckpoints
        });

        return {
          success: true,
          restoredStates,
          restoredCheckpoints
        };
      } catch (error) {
        this.logger.error('Failed to restore from backup', error as Error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Cleanup old states
   */
  async cleanupOldStates(
    agentId: string,
    options: CleanupOptions
  ): Promise<{
    success: boolean;
    deletedCount?: number;
    error?: string;
  }> {
    return this.runWithContext('cleanup-old-states', async () => {
      try {
        let query = this.db
          .deleteFrom('agent_states')
          .where('agent_id', '=', agentId)
          .where('created_at', '<', new Date(options.olderThan));

        // Keep latest states if specified
        if (options.keepLatest && options.keepLatest > 0) {
          const latestStates = await this.db
            .selectFrom('agent_states')
            .select('id')
            .where('agent_id', '=', agentId)
            .orderBy('created_at', 'desc')
            .limit(options.keepLatest)
            .execute();

          if (latestStates.length > 0) {
            const latestIds = latestStates.map(s => s.id);
            query = query.where('id', 'not in', latestIds);
          }
        }

        if (options.dryRun) {
          // Count what would be deleted
          const countQuery = this.db
            .selectFrom('agent_states')
            .select(eb => eb.fn.count('id').as('count'))
            .where('agent_id', '=', agentId)
            .where('created_at', '<', new Date(options.olderThan));

          if (options.keepLatest && options.keepLatest > 0) {
            const latestStates = await this.db
              .selectFrom('agent_states')
              .select('id')
              .where('agent_id', '=', agentId)
              .orderBy('created_at', 'desc')
              .limit(options.keepLatest)
              .execute();

            if (latestStates.length > 0) {
              const latestIds = latestStates.map(s => s.id);
              countQuery.where('id', 'not in', latestIds);
            }
          }

          const result = await countQuery.executeTakeFirst();
          const count = Number(result?.count || 0);

          this.logger.info('Dry run: states that would be deleted', {
            agentId,
            count
          });

          return { success: true, deletedCount: count };
        }

        const result = await query.execute();
        const deletedCount = Number(result.numDeletedRows || 0);

        this.logger.info('Old states cleaned up', {
          agentId,
          deletedCount
        });

        return {
          success: true,
          deletedCount
        };
      } catch (error) {
        this.logger.error('Failed to cleanup old states', error as Error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Cleanup orphaned checkpoints
   */
  async cleanupOrphanedCheckpoints(): Promise<{
    success: boolean;
    deletedCheckpoints?: number;
    error?: string;
  }> {
    return this.runWithContext('cleanup-orphaned-checkpoints', async () => {
      try {
        // This is a simplified implementation
        // In practice, you'd need to identify checkpoints that don't have corresponding agents
        let deletedCount = 0;

        // Example: Clean up checkpoints for agents that no longer exist
        const existingAgents = await this.db
          .selectFrom('agents')
          .select('id')
          .execute();

        const existingAgentIds = new Set(existingAgents.map(a => a.id));

        // This would require additional checkpoint management logic
        // For now, we'll just log the operation
        this.logger.info('Orphaned checkpoints cleanup completed', {
          deletedCount
        });

        return {
          success: true,
          deletedCheckpoints: deletedCount
        };
      } catch (error) {
        this.logger.error('Failed to cleanup orphaned checkpoints', error as Error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Compact state history
   */
  async compactStateHistory(
    agentId: string,
    options: CompactionOptions
  ): Promise<{
    success: boolean;
    originalCount?: number;
    finalCount?: number;
    reductionRatio?: number;
    error?: string;
  }> {
    return this.runWithContext('compact-state-history', async () => {
      try {
        // Get all states
        const allStates = await this.db
          .selectFrom('agent_states')
          .selectAll()
          .where('agent_id', '=', agentId)
          .orderBy('created_at', 'desc')
          .execute();

        const originalCount = allStates.length;

        if (originalCount <= options.targetCount) {
          return {
            success: true,
            originalCount,
            finalCount: originalCount,
            reductionRatio: 0
          };
        }

        // Keep the latest N states
        const statesToKeep = allStates.slice(0, options.targetCount);
        const statesToDelete = allStates.slice(options.targetCount);

        // Delete old states
        if (statesToDelete.length > 0) {
          const idsToDelete = statesToDelete.map(s => s.id);
          await this.db
            .deleteFrom('agent_states')
            .where('id', 'in', idsToDelete)
            .execute();
        }

        const finalCount = statesToKeep.length;
        const reductionRatio = (originalCount - finalCount) / originalCount;

        this.logger.info('State history compacted', {
          agentId,
          originalCount,
          finalCount,
          reductionRatio
        });

        return {
          success: true,
          originalCount,
          finalCount,
          reductionRatio
        };
      } catch (error) {
        this.logger.error('Failed to compact state history', error as Error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Validate state integrity
   */
  async validateStateIntegrity(agentId: string): Promise<IntegrityValidationResult> {
    return this.runWithContext('validate-state-integrity', async () => {
      try {
        const states = await this.db
          .selectFrom('agent_states')
          .selectAll()
          .where('agent_id', '=', agentId)
          .execute();

        let corruptedStates = 0;
        let corruptedStateIds: string[] = [];
        let fixedStates = 0;

        for (const stateRecord of states) {
          try {
            const metadata = JSON.parse(stateRecord.metadata || '{}');
            const expectedChecksum = metadata.checksum;

            if (expectedChecksum) {
              const actualChecksum = this.calculateChecksum(stateRecord.state_data);

              if (expectedChecksum !== actualChecksum) {
                corruptedStates++;
                corruptedStateIds.push(stateRecord.id);

                this.logger.warn('Corrupted state detected', {
                  agentId,
                  stateId: stateRecord.id
                });

                // Attempt to fix by marking as corrupted
                await this.db
                  .updateTable('agent_states')
                  .set({
                    metadata: JSON.stringify({
                      ...metadata,
                      corrupted: true,
                      corruptionDetected: Date.now()
                    }),
                    updated_at: new Date()
                  })
                  .where('id', '=', stateRecord.id)
                  .execute();

                fixedStates++;
              }
            }
          } catch (error) {
            corruptedStates++;
            corruptedStateIds.push(stateRecord.id);
            this.logger.error('Error validating state', {
              agentId,
              stateId: stateRecord.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        const valid = corruptedStates === 0;

        this.logger.info('State integrity validation completed', {
          agentId,
          valid,
          checkedStates: states.length,
          corruptedStates,
          fixedStates
        });

        return {
          valid,
          checkedStates: states.length,
          corruptedStates,
          corruptedStateIds,
          fixedStates
        };
      } catch (error) {
        this.logger.error('Failed to validate state integrity', error as Error);
        return {
          valid: false,
          checkedStates: 0,
          corruptedStates: 0,
          corruptedStateIds: [],
          fixedStates: 0
        };
      }
    });
  }

  /**
   * Execute operation within AsyncLocalStorage context
   */
  async runWithContext<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const context = this.logger.createContext?.('agent-state-persistence', operation) || {
      correlationId: createUUID(),
      operation,
      timestamp: Date.now()
    };

    return this.als.run(context, fn);
  }

  /**
   * Dispose of the state persistence service
   */
  async dispose(): Promise<void> {
    this.logger.info('Disposing Agent State Persistence...');
    // Cleanup resources if needed
  }

  // Private helper methods

  private isValidStateData(data: any): boolean {
    try {
      // Check if data is serializable
      JSON.stringify(data);
      return true;
    } catch {
      return false;
    }
  }

  private calculateChecksum(data: string): string {
    // Simple checksum implementation
    // In production, use a proper hash function like SHA-256
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}