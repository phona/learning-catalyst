/**
 * Agent Registry Service
 *
 * Central registry for managing AI agents in the Learning Catalyst system.
 * Provides CRUD operations, lifecycle management, and configuration
 * validation for all agent types.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { Kysely } from 'kysely';
import type { Database } from '@/main/services/database/kysely-schema';
import { AgentType } from './types';
import { createUUID, generateTimestamp } from '@/shared/utils/helpers';

export interface AgentConfiguration {
  type: AgentType;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  modelConfig: {
    provider: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
  metadata?: Record<string, any>;
}

export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  modelConfig: AgentConfiguration['modelConfig'];
  status: 'active' | 'inactive' | 'error';
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  activatedAt?: number;
  deactivatedAt?: number;
}

export interface AgentValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface AgentStatistics {
  totalAgents: number;
  activeAgents: number;
  inactiveAgents: number;
  agentsByType: Record<AgentType, number>;
}

export interface ListAgentsOptions {
  limit?: number;
  offset?: number;
  status?: Agent['status'];
  type?: AgentType;
}

/**
 * Agent Registry Service
 * Manages agent lifecycle, configuration, and persistence
 */
export class AgentRegistry {
  constructor(
    private db: Kysely<Database>,
    private logger: any,
    private als: AsyncLocalStorage<any>
  ) {}

  /**
   * Register a new agent
   */
  async registerAgent(config: AgentConfiguration): Promise<Agent> {
    return this.runWithContext('register-agent', async () => {
      try {
        // Validate configuration
        const validation = await this.validateConfiguration(config);
        if (!validation.isValid) {
          throw new Error(`Invalid agent configuration: ${validation.errors.join(', ')}`);
        }

        // Check for duplicate names
        const existingAgent = await this.getAgentByName(config.name);
        if (existingAgent) {
          this.logger.warn('Duplicate agent registration attempted', {
            agentName: config.name,
            agentType: config.type
          });
          throw new Error(`Agent with name "${config.name}" already exists`);
        }

        const now = generateTimestamp();
        const agent: Agent = {
          id: createUUID(),
          type: config.type,
          name: config.name,
          description: config.description,
          systemPrompt: config.systemPrompt,
          tools: [...config.tools],
          modelConfig: { ...config.modelConfig },
          status: 'inactive',
          metadata: config.metadata ? { ...config.metadata } : undefined,
          createdAt: now,
          updatedAt: now
        };

        // Persist to database
        // Store systemPrompt in metadata along with other metadata
        const combinedMetadata = {
          ...agent.metadata,
          systemPrompt: agent.systemPrompt
        };

        await this.db.transaction().execute(async (trx) => {
          await trx.insertInto('agents').values({
            id: agent.id,
            type: agent.type as any,
            name: agent.name,
            description: agent.description,
            model_config: JSON.stringify(agent.modelConfig),
            tools: JSON.stringify(agent.tools),
            capabilities: JSON.stringify([]),
            metadata: JSON.stringify(combinedMetadata),
            status: agent.status,
            created_at: agent.createdAt,
            updated_at: agent.updatedAt
          }).executeTakeFirstOrThrow();
        });

        this.logger.info('Agent registered successfully', {
          agentId: agent.id,
          agentType: agent.type,
          agentName: agent.name
        });

        return agent;
      } catch (error) {
        this.logger.error('Failed to register agent', error as Error);
        throw error;
      }
    });
  }

  /**
   * Get agent by ID
   */
  async getAgent(id: string): Promise<Agent | null> {
    return this.runWithContext('get-agent', async () => {
      try {
        const row = await this.db
          .selectFrom('agents')
          .selectAll()
          .where('id', '=', id)
          .executeTakeFirst();

        if (!row) {
          return null;
        }

        return this.mapRowToAgent(row);
      } catch (error) {
        this.logger.error('Failed to retrieve agent', error as Error);
        throw error;
      }
    });
  }

  /**
   * Get agent by name
   */
  async getAgentByName(name: string): Promise<Agent | null> {
    return this.runWithContext('get-agent-by-name', async () => {
      try {
        const row = await this.db
          .selectFrom('agents')
          .selectAll()
          .where('name', '=', name)
          .executeTakeFirst();

        if (!row) {
          return null;
        }

        return this.mapRowToAgent(row);
      } catch (error) {
        this.logger.error('Failed to retrieve agent by name', error as Error);
        throw error;
      }
    });
  }

  /**
   * Get agents by type
   */
  async getAgentsByType(type: AgentType): Promise<Agent[]> {
    return this.runWithContext('get-agents-by-type', async () => {
      try {
        const rows = await this.db
          .selectFrom('agents')
          .selectAll()
          .where('type', '=', type as any)
          .execute();

        return rows.map(row => this.mapRowToAgent(row));
      } catch (error) {
        this.logger.error('Failed to retrieve agents by type', error as Error);
        throw error;
      }
    });
  }

  /**
   * List all agents with optional filtering
   */
  async listAgents(options: ListAgentsOptions = {}): Promise<Agent[]> {
    return this.runWithContext('list-agents', async () => {
      try {
        let query = this.db.selectFrom('agents').selectAll();

        if (options.status) {
          query = query.where('status', '=', options.status);
        }

        if (options.type) {
          query = query.where('type', '=', options.type as any);
        }

        if (options.limit) {
          query = query.limit(options.limit);
        }

        if (options.offset) {
          query = query.offset(options.offset);
        }

        const rows = await query.execute();
        return rows.map(row => this.mapRowToAgent(row));
      } catch (error) {
        this.logger.error('Failed to list agents', error as Error);
        throw error;
      }
    });
  }

  /**
   * Update agent configuration
   */
  async updateAgent(id: string, updates: Partial<AgentConfiguration>): Promise<Agent> {
    return this.runWithContext('update-agent', async () => {
      try {
        const existingAgent = await this.getAgent(id);
        if (!existingAgent) {
          throw new Error(`Agent with ID ${id} not found`);
        }

        // Create updated configuration
        const updatedConfig: AgentConfiguration = {
          type: updates.type || existingAgent.type,
          name: updates.name || existingAgent.name,
          description: updates.description || existingAgent.description,
          systemPrompt: updates.systemPrompt || existingAgent.systemPrompt,
          tools: updates.tools || existingAgent.tools,
          modelConfig: updates.modelConfig || existingAgent.modelConfig,
          metadata: updates.metadata || existingAgent.metadata
        };

        // Validate updated configuration
        const validation = await this.validateConfiguration(updatedConfig);
        if (!validation.isValid) {
          throw new Error(`Invalid updated configuration: ${validation.errors.join(', ')}`);
        }

        const now = generateTimestamp();
        const updatedAgent: Agent = {
          ...existingAgent,
          ...updatedConfig,
          updatedAt: now
        };

        // Update in database
        await this.db
          .updateTable('agents')
          .set({
            name: updatedAgent.name,
            description: updatedAgent.description,
            metadata: updatedAgent.metadata ? JSON.stringify(updatedAgent.metadata) : '',
            updated_at: updatedAgent.updatedAt
          })
          .where('id', '=', id)
          .executeTakeFirstOrThrow();

        this.logger.info('Agent configuration updated', {
          agentId: id,
          updatedFields: Object.keys(updates)
        });

        return updatedAgent;
      } catch (error) {
        this.logger.error('Failed to update agent configuration', error as Error);
        throw error;
      }
    });
  }

  /**
   * Activate an agent
   */
  async activateAgent(id: string): Promise<Agent> {
    return this.runWithContext('activate-agent', async () => {
      try {
        const agent = await this.getAgent(id);
        if (!agent) {
          throw new Error('Agent not found');
        }

        if (agent.status === 'active') {
          this.logger.warn('Agent is already active', {
            agentId: id,
            agentName: agent.name
          });
          return agent;
        }

        const now = generateTimestamp();
        const activatedAgent: Agent = {
          ...agent,
          status: 'active',
          activatedAt: now,
          updatedAt: now
        };

        await this.db
          .updateTable('agents')
          .set({
            status: 'active',
            activated_at: activatedAgent.activatedAt!,
            updated_at: activatedAgent.updatedAt
          })
          .where('id', '=', id)
          .executeTakeFirstOrThrow();

        this.logger.info('Agent activated', {
          agentId: id,
          agentName: agent.name
        });

        return activatedAgent;
      } catch (error) {
        this.logger.error('Failed to activate agent', error as Error);
        throw error;
      }
    });
  }

  /**
   * Deactivate an agent
   */
  async deactivateAgent(id: string): Promise<Agent> {
    return this.runWithContext('deactivate-agent', async () => {
      try {
        const agent = await this.getAgent(id);
        if (!agent) {
          throw new Error('Agent not found');
        }

        const now = generateTimestamp();
        const deactivatedAgent: Agent = {
          ...agent,
          status: 'inactive',
          deactivatedAt: now,
          updatedAt: now
        };

        await this.db
          .updateTable('agents')
          .set({
            status: 'inactive',
            deactivated_at: deactivatedAgent.deactivatedAt!,
            updated_at: deactivatedAgent.updatedAt
          })
          .where('id', '=', id)
          .executeTakeFirstOrThrow();

        this.logger.info('Agent deactivated', {
          agentId: id,
          agentName: agent.name
        });

        return deactivatedAgent;
      } catch (error) {
        this.logger.error('Failed to deactivate agent', error as Error);
        throw error;
      }
    });
  }

  /**
   * Delete an agent
   */
  async deleteAgent(id: string): Promise<boolean> {
    return this.runWithContext('delete-agent', async () => {
      try {
        const agent = await this.getAgent(id);
        if (!agent) {
          this.logger.warn('Attempted to delete non-existent agent', {
            agentId: id
          });
          return false;
        }

        if (agent.status === 'active') {
          this.logger.warn('Attempted to delete active agent', {
            agentId: id,
            agentName: agent.name
          });
          throw new Error('Cannot delete active agent');
        }

        await this.db.deleteFrom('agents').where('id', '=', id).executeTakeFirstOrThrow();

        this.logger.info('Agent deleted successfully', {
          agentId: id,
          agentName: agent.name
        });

        return true;
      } catch (error) {
        this.logger.error('Failed to delete agent', error as Error);
        throw error;
      }
    });
  }

  /**
   * Get agent configuration
   */
  async getAgentConfiguration(id: string): Promise<AgentConfiguration | null> {
    return this.runWithContext('get-agent-configuration', async () => {
      try {
        const agent = await this.getAgent(id);
        if (!agent) {
          return null;
        }

        return {
          type: agent.type,
          name: agent.name,
          description: agent.description,
          systemPrompt: agent.systemPrompt,
          tools: [...agent.tools],
          modelConfig: { ...agent.modelConfig },
          metadata: agent.metadata ? { ...agent.metadata } : undefined
        };
      } catch (error) {
        this.logger.error('Failed to get agent configuration', error as Error);
        throw error;
      }
    });
  }

  /**
   * Validate agent configuration
   */
  async validateConfiguration(config: AgentConfiguration): Promise<AgentValidationResult> {
    const errors: string[] = [];

    // Validate type
    if (!Object.values(AgentType).includes(config.type)) {
      errors.push(`Invalid agent type: ${config.type}`);
    }

    // Validate name
    if (!config.name || config.name.trim().length === 0) {
      errors.push('Agent name is required');
    }

    if (config.name && config.name.length > 100) {
      errors.push('Agent name must be less than 100 characters');
    }

    // Validate description
    if (!config.description || config.description.trim().length === 0) {
      errors.push('Agent description is required');
    }

    // Validate system prompt
    if (!config.systemPrompt || config.systemPrompt.trim().length === 0) {
      errors.push('System prompt is required');
    }

    // Validate tools
    if (!Array.isArray(config.tools)) {
      errors.push('Tools must be an array');
    }

    // Validate model config
    if (!config.modelConfig) {
      errors.push('Model configuration is required');
    } else {
      if (!config.modelConfig.provider || config.modelConfig.provider.trim().length === 0) {
        errors.push('Model provider is required');
      }

      if (!config.modelConfig.model || config.modelConfig.model.trim().length === 0) {
        errors.push('Model name is required');
      }

      if (config.modelConfig.temperature !== undefined) {
        if (typeof config.modelConfig.temperature !== 'number' ||
            config.modelConfig.temperature < 0 ||
            config.modelConfig.temperature > 2) {
          errors.push('Temperature must be a number between 0 and 2');
        }
      }

      if (config.modelConfig.maxTokens !== undefined) {
        if (typeof config.modelConfig.maxTokens !== 'number' ||
            config.modelConfig.maxTokens <= 0) {
          errors.push('Max tokens must be a positive number');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get agent statistics
   */
  async getAgentStatistics(): Promise<AgentStatistics> {
    return this.runWithContext('get-agent-statistics', async () => {
      try {
        const agents = await this.listAgents();

        const stats: AgentStatistics = {
          totalAgents: agents.length,
          activeAgents: agents.filter(a => a.status === 'active').length,
          inactiveAgents: agents.filter(a => a.status === 'inactive').length,
          agentsByType: {} as Record<AgentType, number>
        };

        // Count by type
        for (const agentType of Object.values(AgentType) as AgentType[]) {
          stats.agentsByType[agentType] = agents.filter(a => a.type === agentType).length;
        }

        return stats;
      } catch (error) {
        this.logger.error('Failed to get agent statistics', error as Error);
        throw error;
      }
    });
  }

  /**
   * Execute operation within AsyncLocalStorage context
   */
  async runWithContext<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const context = this.logger.createContext?.('agent-registry', operation) || {
      correlationId: createUUID(),
      operation,
      timestamp: Date.now()
    };

    return this.als.run(context, fn);
  }

  /**
   * Dispose of the agent registry
   */
  async dispose(): Promise<void> {
    this.logger.info('Disposing Agent Registry...');
    // Cleanup resources if needed
  }

  /**
   * Map database row to Agent object
   */
  private mapRowToAgent(row: any): Agent {
    try {
      const metadata = row.metadata ? JSON.parse(row.metadata) : {};
      const { systemPrompt, ...otherMetadata } = metadata;

      return {
        id: row.id,
        type: row.type as AgentType,
        name: row.name,
        description: row.description,
        systemPrompt: systemPrompt || '',
        tools: JSON.parse(row.tools || '[]'),
        modelConfig: JSON.parse(row.model_config || '{}'),
        status: row.status as Agent['status'],
        metadata: Object.keys(otherMetadata).length > 0 ? otherMetadata : undefined,
        createdAt: typeof row.created_at === 'number' ? row.created_at : row.created_at.getTime(),
        updatedAt: typeof row.updated_at === 'number' ? row.updated_at : row.updated_at.getTime(),
        activatedAt: row.activated_at ? (typeof row.activated_at === 'number' ? row.activated_at : row.activated_at.getTime()) : undefined,
        deactivatedAt: row.deactivated_at ? (typeof row.deactivated_at === 'number' ? row.deactivated_at : row.deactivated_at.getTime()) : undefined
      };
    } catch (error) {
      this.logger.error('Failed to parse agent data', error as Error);
      throw new Error(`Invalid agent data: ${error}`);
    }
  }
}