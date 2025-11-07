/**
 * Agent Lifecycle Manager
 *
 * Manages the complete lifecycle of AI agents including creation, activation,
 * deactivation, state transitions, and deletion. Provides comprehensive
 * tracking, error handling, and performance monitoring.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { Kysely } from 'kysely';
import type { Database } from '@/main/services/database/kysely-schema';
import { AgentRegistry, type Agent, type AgentConfiguration } from './agent-registry';
import { createUUID, generateTimestamp } from '@/shared/utils/helpers';

export interface LifecycleEvent {
  id: string;
  agentId: string;
  event: 'created' | 'activated' | 'deactivated' | 'updated' | 'deleted' | 'error';
  fromState?: string;
  toState?: string;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface StateTransition {
  from: string;
  to: string;
  metadata?: Record<string, any>;
}

export interface BatchTransition {
  agentId: string;
  transition: StateTransition;
}

export interface TransitionResult {
  agentId: string;
  success: boolean;
  newState?: string;
  error?: string;
  duration?: number;
}

export interface LifecycleStatistics {
  totalEvents: number;
  activations: number;
  deactivations: number;
  totalActiveTime: number;
  averageActiveSessionDuration: number;
  lastActivation?: number;
  lastDeactivation?: number;
}

export interface CreateAgentOptions {
  autoActivate?: boolean;
  initialState?: Record<string, any>;
}

export interface ActivateAgentOptions {
  condition?: {
    maxConcurrentAgents?: number;
    requiredResources?: string[];
  };
  timeout?: number;
}

export interface DeactivateAgentOptions {
  force?: boolean;
  saveState?: boolean;
  clearCache?: boolean;
  notifyClients?: boolean;
}

export interface DeleteAgentOptions {
  force?: boolean;
  archiveData?: boolean;
  retainHistory?: boolean;
  backupLocation?: string;
}

export interface LifecycleEventOptions {
  eventType?: string;
  limit?: number;
  offset?: number;
  startDate?: number;
  endDate?: number;
}

/**
 * Agent Lifecycle Manager
 * Comprehensive agent lifecycle management with state tracking
 */
export class AgentLifecycleManager {
  constructor(
    private agentRegistry: AgentRegistry,
    private db: Kysely<Database>,
    private logger: any,
    private als: AsyncLocalStorage<any>
  ) {}

  /**
   * Create a new agent with lifecycle tracking
   */
  async createAgent(
    config: AgentConfiguration,
    options: CreateAgentOptions = {}
  ): Promise<Agent> {
    return this.runWithContext('create-agent', async () => {
      const startTime = performance.now();

      try {
        // Create the agent through registry
        const agent = await this.agentRegistry.registerAgent(config);

        // Record creation event
        await this.recordLifecycleEvent({
          id: createUUID(),
          agentId: agent.id,
          event: 'created',
          timestamp: generateTimestamp(),
          metadata: {
            agentType: agent.type,
            agentName: agent.name,
            autoActivate: options.autoActivate,
            initialState: options.initialState
          }
        });

        // Set initial state if provided
        if (options.initialState) {
          await this.saveAgentState(agent.id, options.initialState);
        }

        // Auto-activate if requested
        if (options.autoActivate) {
          await this.activateAgent(agent.id);
        }

        const duration = performance.now() - startTime;

        this.logger.info('Agent created with lifecycle tracking', {
          agentId: agent.id,
          agentType: agent.type,
          agentName: agent.name,
          duration: Math.round(duration)
        });

        return agent;
      } catch (error) {
        await this.recordLifecycleEvent({
          id: createUUID(),
          agentId: 'unknown',
          event: 'error',
          timestamp: generateTimestamp(),
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            operation: 'create-agent',
            config
          }
        });

        this.logger.error('Failed to create agent', error as Error);
        throw error;
      }
    });
  }

  /**
   * Activate an agent
   */
  async activateAgent(
    agentId: string,
    options: ActivateAgentOptions = {}
  ): Promise<Agent> {
    return this.runWithContext('activate-agent', async () => {
      const startTime = performance.now();

      try {
        const agent = await this.agentRegistry.getAgent(agentId);
        if (!agent) {
          throw new Error('Agent not found');
        }

        // Check if already active
        if (agent.status === 'active') {
          this.logger.warn('Agent is already active', { agentId });
          return agent;
        }

        // Check activation conditions
        if (options.condition) {
          await this.checkActivationConditions(options.condition);
        }

        // Activate the agent
        const activatedAgent = await this.agentRegistry.activateAgent(agentId);

        // Record activation event
        await this.recordLifecycleEvent({
          id: createUUID(),
          agentId,
          event: 'activated',
          fromState: agent.status,
          toState: 'active',
          timestamp: generateTimestamp(),
          metadata: {
            activationDuration: performance.now() - startTime,
            conditions: options.condition
          }
        });

        const duration = performance.now() - startTime;

        this.logger.info('Agent activated successfully', {
          agentId,
          activationDuration: Math.round(duration)
        });

        return activatedAgent;
      } catch (error) {
        await this.recordLifecycleEvent({
          id: createUUID(),
          agentId,
          event: 'error',
          timestamp: generateTimestamp(),
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            operation: 'activate-agent',
            options
          }
        });

        this.logger.error('Failed to activate agent', error as Error);
        throw error;
      }
    });
  }

  /**
   * Deactivate an agent
   */
  async deactivateAgent(
    agentId: string,
    options: DeactivateAgentOptions = {}
  ): Promise<Agent> {
    return this.runWithContext('deactivate-agent', async () => {
      const startTime = performance.now();

      try {
        const agent = await this.agentRegistry.getAgent(agentId);
        if (!agent) {
          throw new Error('Agent not found');
        }

        // Check if already inactive
        if (agent.status === 'inactive' && !options.force) {
          this.logger.warn('Agent is already inactive', { agentId });
          return agent;
        }

        // Calculate active duration if agent was active
        let activeDuration = 0;
        if (agent.status === 'active' && agent.activatedAt) {
          activeDuration = generateTimestamp() - agent.activatedAt;
        }

        // Deactivate the agent
        const deactivatedAgent = await this.agentRegistry.deactivateAgent(agentId);

        // Save state if requested
        if (options.saveState) {
          await this.saveAgentCurrentState(agentId);
        }

        // Clear cache if requested
        if (options.clearCache) {
          await this.clearAgentCache(agentId);
        }

        // Notify clients if requested
        if (options.notifyClients) {
          await this.notifyAgentStateChange(agentId, 'inactive');
        }

        // Record deactivation event
        await this.recordLifecycleEvent({
          id: createUUID(),
          agentId,
          event: 'deactivated',
          fromState: agent.status,
          toState: 'inactive',
          timestamp: generateTimestamp(),
          metadata: {
            activeDuration,
            force: options.force,
            cleanupOptions: {
              saveState: options.saveState,
              clearCache: options.clearCache,
              notifyClients: options.notifyClients
            }
          }
        });

        this.logger.info('Agent deactivated successfully', {
          agentId,
          activeDuration: Math.round(activeDuration),
          force: options.force
        });

        return deactivatedAgent;
      } catch (error) {
        await this.recordLifecycleEvent({
          id: createUUID(),
          agentId,
          event: 'error',
          timestamp: generateTimestamp(),
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            operation: 'deactivate-agent',
            options
          }
        });

        this.logger.error('Failed to deactivate agent', error as Error);
        throw error;
      }
    });
  }

  /**
   * Transition agent state
   */
  async transitionAgentState(
    agentId: string,
    transition: StateTransition
  ): Promise<TransitionResult> {
    return this.runWithContext('transition-agent-state', async () => {
      const startTime = performance.now();

      try {
        const agent = await this.agentRegistry.getAgent(agentId);
        if (!agent) {
          return {
            agentId,
            success: false,
            error: 'Agent not found'
          };
        }

        // Validate transition
        if (!this.isValidTransition(agent.status, transition.from, transition.to)) {
          return {
            agentId,
            success: false,
            error: `Invalid transition from ${transition.from} to ${transition.to}`
          };
        }

        // Execute transition
        let updatedAgent: Agent;
        switch (transition.to) {
          case 'active':
            updatedAgent = await this.agentRegistry.activateAgent(agentId);
            break;
          case 'inactive':
            updatedAgent = await this.agentRegistry.deactivateAgent(agentId);
            break;
          case 'error':
            // Handle error state transition
            updatedAgent = await this.transitionToErrorState(agentId, transition.metadata);
            break;
          default:
            throw new Error(`Unknown target state: ${transition.to}`);
        }

        // Record transition event
        await this.recordLifecycleEvent({
          id: createUUID(),
          agentId,
          event: 'updated',
          fromState: transition.from,
          toState: transition.to,
          timestamp: generateTimestamp(),
          metadata: transition.metadata || {}
        });

        const duration = performance.now() - startTime;

        this.logger.info('Agent state transition completed', {
          agentId,
          transition,
          duration: Math.round(duration)
        });

        return {
          agentId,
          success: true,
          newState: transition.to,
          duration: Math.round(duration)
        };
      } catch (error) {
        await this.recordLifecycleEvent({
          id: createUUID(),
          agentId,
          event: 'error',
          timestamp: generateTimestamp(),
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            operation: 'transition-state',
            transition
          }
        });

        return {
          agentId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Batch state transitions
   */
  async batchTransitionStates(
    transitions: BatchTransition[]
  ): Promise<TransitionResult[]> {
    return this.runWithContext('batch-transition-states', async () => {
      const startTime = performance.now();

      const results = await Promise.all(
        transitions.map(({ agentId, transition }) =>
          this.transitionAgentState(agentId, transition)
        )
      );

      const duration = performance.now() - startTime;
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      this.logger.info('Batch state transitions completed', {
        totalTransitions: transitions.length,
        successful,
        failed,
        duration: Math.round(duration)
      });

      return results;
    });
  }

  /**
   * Delete an agent
   */
  async deleteAgent(
    agentId: string,
    options: DeleteAgentOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    return this.runWithContext('delete-agent', async () => {
      try {
        const agent = await this.agentRegistry.getAgent(agentId);
        if (!agent) {
          this.logger.warn('Attempted to delete non-existent agent', { agentId });
          return { success: false, error: 'Agent not found' };
        }

        // Check if agent is active
        if (agent.status === 'active' && !options.force) {
          return { success: false, error: 'Cannot delete active agent' };
        }

        // Force deactivate if needed
        if (agent.status === 'active' && options.force) {
          await this.agentRegistry.deactivateAgent(agentId);
        }

        // Archive data if requested
        if (options.archiveData) {
          await this.archiveAgentData(agentId, options);
        }

        // Delete the agent
        const deleted = await this.agentRegistry.deleteAgent(agentId);

        if (deleted) {
          // Record deletion event
          await this.recordLifecycleEvent({
            id: createUUID(),
            agentId,
            event: 'deleted',
            fromState: agent.status,
            timestamp: generateTimestamp(),
            metadata: {
              deletionOptions: options,
              agentName: agent.name,
              agentType: agent.type
            }
          });

          this.logger.info('Agent deleted successfully', {
            agentId,
            deletionOptions: options
          });

          return { success: true };
        } else {
          return { success: false, error: 'Failed to delete agent' };
        }
      } catch (error) {
        this.logger.error('Failed to delete agent', error as Error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Get lifecycle events for an agent
   */
  async getLifecycleEvents(
    agentId: string,
    options: LifecycleEventOptions = {}
  ): Promise<LifecycleEvent[]> {
    return this.runWithContext('get-lifecycle-events', async () => {
      try {
        let query = this.db
          .selectFrom('agent_lifecycle_events')
          .selectAll()
          .where('agent_id', '=', agentId);

        if (options.eventType) {
          query = query.where('event', '=', options.eventType as any);
        }

        if (options.startDate) {
          query = query.where('timestamp', '>=', new Date(options.startDate).getTime());
        }

        if (options.endDate) {
          query = query.where('timestamp', '<=', new Date(options.endDate).getTime());
        }

        query = query.orderBy('timestamp', 'desc');

        if (options.limit) {
          query = query.limit(options.limit);
        }

        if (options.offset) {
          query = query.offset(options.offset);
        }

        const rows = await query.execute();

        return rows.map(row => ({
          id: row.id,
          agentId: row.agent_id,
          event: row.event as LifecycleEvent['event'],
          fromState: row.from_state as string | undefined,
          toState: row.to_state as string | undefined,
          timestamp: typeof row.timestamp === 'number' ? row.timestamp : (row.timestamp as any).getTime(),
          metadata: JSON.parse(row.metadata || '{}')
        }));
      } catch (error) {
        this.logger.error('Failed to get lifecycle events', error as Error);
        throw error;
      }
    });
  }

  /**
   * Get lifecycle statistics for an agent
   */
  async getLifecycleStatistics(agentId: string): Promise<LifecycleStatistics> {
    return this.runWithContext('get-lifecycle-statistics', async () => {
      try {
        const events = await this.getLifecycleEvents(agentId);

        const activations = events.filter(e => e.event === 'activated');
        const deactivations = events.filter(e => e.event === 'deactivated');

        // Calculate total active time
        let totalActiveTime = 0;
        for (let i = 0; i < events.length; i++) {
          const event = events[i];
          if (event.event === 'activated') {
            // Find corresponding deactivation
            const deactivation = events.find(e =>
              e.event === 'deactivated' && e.timestamp > event.timestamp
            );
            if (deactivation) {
              totalActiveTime += deactivation.timestamp - event.timestamp;
            }
          }
        }

        const averageActiveSessionDuration = activations.length > 0
          ? totalActiveTime / activations.length
          : 0;

        return {
          totalEvents: events.length,
          activations: activations.length,
          deactivations: deactivations.length,
          totalActiveTime,
          averageActiveSessionDuration,
          lastActivation: activations[0]?.timestamp,
          lastDeactivation: deactivations[0]?.timestamp
        };
      } catch (error) {
        this.logger.error('Failed to get lifecycle statistics', error as Error);
        throw error;
      }
    });
  }

  /**
   * Execute operation within AsyncLocalStorage context
   */
  async runWithContext<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const context = this.logger.createContext?.('agent-lifecycle-manager', operation) || {
      correlationId: createUUID(),
      operation,
      timestamp: Date.now()
    };

    return this.als.run(context, fn);
  }

  /**
   * Dispose of the lifecycle manager
   */
  async dispose(): Promise<void> {
    this.logger.info('Disposing Agent Lifecycle Manager...');
    // Cleanup resources if needed
  }

  // Private helper methods

  private async recordLifecycleEvent(event: LifecycleEvent): Promise<void> {
    try {
      await this.db.insertInto('agent_lifecycle_events').values({
        id: event.id,
        agent_id: event.agentId,
        event: event.event,
        from_state: event.fromState,
        to_state: event.toState,
        timestamp: event.timestamp,
        metadata: JSON.stringify(event.metadata),
        created_at: Date.now()
      }).executeTakeFirst();
    } catch (error) {
      // Don't throw here to avoid infinite loops, but log the error
      this.logger.error('Failed to record lifecycle event', error as Error);
    }
  }

  private async saveAgentState(agentId: string, state: Record<string, any>): Promise<void> {
    try {
      const now = Date.now();

      // Try to insert first
      try {
        await this.db.insertInto('agent_states').values({
          id: createUUID(),
          agent_id: agentId,
          state_data: JSON.stringify(state),
          version: 1,
          created_at: now,
          updated_at: now
        }).execute();
      } catch (insertError) {
        // If insert fails (conflict), update instead
        await this.db
          .updateTable('agent_states')
          .set({
            state_data: JSON.stringify(state),
            updated_at: now
          })
          .where('agent_id', '=', agentId)
          .execute();
      }
    } catch (error) {
      this.logger.error('Failed to save agent state', error as Error);
      throw error;
    }
  }

  private async saveAgentCurrentState(agentId: string): Promise<void> {
    try {
      const agent = await this.agentRegistry.getAgent(agentId);
      if (agent) {
        const currentState = {
          status: agent.status,
          lastActivity: Date.now(),
          configuration: {
            modelConfig: agent.modelConfig,
            tools: agent.tools
          }
        };
        await this.saveAgentState(agentId, currentState);
      }
    } catch (error) {
      this.logger.error('Failed to save agent current state', error as Error);
    }
  }

  private async clearAgentCache(agentId: string): Promise<void> {
    // Implementation would clear any cached data for the agent
    this.logger.debug('Cleared cache for agent', { agentId });
  }

  private async notifyAgentStateChange(agentId: string, newState: string): Promise<void> {
    // Implementation would notify interested parties about state change
    this.logger.info('Notified agent state change', { agentId, newState });
  }

  private async transitionToErrorState(agentId: string, metadata?: Record<string, any>): Promise<Agent> {
    try {
      const agent = await this.agentRegistry.getAgent(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Update agent status to error in database directly
      await this.db
        .updateTable('agents')
        .set({
          status: 'error',
          updated_at: Date.now(),
          metadata: JSON.stringify({
            ...agent.metadata,
            errorState: metadata,
            errorTimestamp: Date.now()
          })
        })
        .where('id', '=', agentId)
        .executeTakeFirst();

      // Return updated agent
      return {
        ...agent,
        status: 'error',
        updatedAt: Date.now(),
        metadata: {
          ...agent.metadata,
          errorState: metadata,
          errorTimestamp: Date.now()
        }
      };
    } catch (error) {
      this.logger.error('Failed to transition agent to error state', error as Error);
      throw error;
    }
  }

  private async checkActivationConditions(condition: ActivateAgentOptions['condition']): Promise<void> {
    if (!condition) return;

    // Check concurrent agent limit
    if (condition.maxConcurrentAgents) {
      const activeCount = await this.db
        .selectFrom('agents')
        .select(eb => eb.fn.count('id').as('count'))
        .where('status', '=', 'active')
        .executeTakeFirst();

      const currentActive = Number(activeCount?.count || 0);
      if (currentActive >= condition.maxConcurrentAgents) {
        throw new Error(`Activation conditions not met: Too many active agents (${currentActive}/${condition.maxConcurrentAgents})`);
      }
    }

    // Check required resources (simplified)
    if (condition.requiredResources) {
      // In a real implementation, this would check system resource availability
      this.logger.debug('Checking required resources', { resources: condition.requiredResources });
    }
  }

  private async archiveAgentData(agentId: string, options: DeleteAgentOptions): Promise<void> {
    try {
      const agent = await this.agentRegistry.getAgent(agentId);
      if (!agent) return;

      const archiveData = {
        agentId,
        agentData: agent,
        archiveTimestamp: Date.now(),
        retainHistory: options.retainHistory,
        backupLocation: options.backupLocation
      };

      await this.db.insertInto('agent_archives').values({
        id: createUUID(),
        agent_id: agentId,
        archive_data: JSON.stringify(archiveData),
        backup_location: options.backupLocation || undefined,
        archive_reason: 'deletion',
        retained_history: options.retainHistory || false,
        archived_at: Date.now()
      }).execute();

      this.logger.info('Agent archived before deletion', { agentId, archiveData });
    } catch (error) {
      this.logger.error('Failed to archive agent data', error as Error);
      throw error;
    }
  }

  private isValidTransition(currentState: string, fromState: string, toState: string): boolean {
    // Basic validation rules
    if (currentState !== fromState) {
      return false;
    }

    // Define valid transitions
    const validTransitions: Record<string, string[]> = {
      'inactive': ['active', 'deleted'],
      'active': ['inactive', 'error'],
      'error': ['inactive', 'deleted']
    };

    return validTransitions[fromState]?.includes(toState) || false;
  }
}