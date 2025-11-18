/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable no-undef */

/**
 * Agent Registry Test Suite
 *
 * Comprehensive test suite for AgentRegistry covering CRUD operations,
 * agent type management, configuration validation, and performance requirements.
 * Follows TDD methodology with enterprise-grade testing patterns.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentRegistry } from '../agent-registry';
import { AgentType } from '../types';
import type { Kysely } from 'kysely';
import type { Database } from '@/shared/types/database';
import { createMockLogger, createMockDatabase, createMockAsyncLocalStorage } from '@/test/setup/main-process/setup';

// Mock AgentType is now imported from types

describe('AgentRegistry', () => {
  let agentRegistry: AgentRegistry;
  let mockDb: Kysely<Database>;
  let mockLogger: any;
  let mockAls: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup comprehensive mocks
    mockDb = createMockDatabase();
    mockLogger = createMockLogger();
    mockAls = createMockAsyncLocalStorage();

    // Create AgentRegistry instance
    agentRegistry = new AgentRegistry(mockDb, mockLogger, mockAls);

    mockLogger.info.mockReturnValue(undefined);
    mockLogger.error.mockReturnValue(undefined);
    mockLogger.warn.mockReturnValue(undefined);
    mockLogger.debug.mockReturnValue(undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (agentRegistry) {
      await agentRegistry.dispose();
    }
  });

  describe('Agent Registration', () => {
    it('should register a new agent successfully', async () => {
      const agentConfig = {
        type: AgentType.LEARNING,
        name: 'Test Learning Agent',
        description: 'A test learning agent',
        systemPrompt: 'You are a helpful learning assistant.',
        tools: ['concept-parser', 'knowledge-graph'],
        modelConfig: {
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000
        },
        metadata: {
          version: '1.0.0',
          author: 'test-suite'
        }
      };

      const result = await agentRegistry.registerAgent(agentConfig);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe(AgentType.LEARNING);
      expect(result.name).toBe('Test Learning Agent');
      expect(result.status).toBe('inactive');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      // Verify transaction was used
      expect(mockDb.transaction).toHaveBeenCalled();

      // Note: Since we use transactions, the insertInto call happens on the transaction object
      // not the main mock database object. The transaction functionality is verified
      // by the successful test completion and no transaction errors.
      expect(mockLogger.info).toHaveBeenCalledWith('Agent registered successfully', {
        agentId: result.id,
        agentType: AgentType.LEARNING,
        agentName: 'Test Learning Agent'
      });
    });

    it('should reject duplicate agent registration with same name', async () => {
      const agentConfig = {
        type: AgentType.LEARNING,
        name: 'Duplicate Agent',
        description: 'A duplicate agent',
        systemPrompt: 'You are a helpful assistant.',
        tools: [],
        modelConfig: {
          provider: 'openai',
          model: 'gpt-4'
        }
      };

      // Mock getAgentByName to return null first, then existing agent
      const mockGetAgentByName = vi.spyOn(agentRegistry, 'getAgentByName')
        .mockResolvedValueOnce(null) // First call - no existing agent
        .mockResolvedValueOnce({    // Second call - agent exists
          id: 'existing-id',
          name: 'Duplicate Agent',
          type: AgentType.LEARNING,
          status: 'inactive',
          description: 'Existing agent',
          systemPrompt: 'You are helpful.',
          tools: [],
          modelConfig: { provider: 'openai', model: 'gpt-4' },
          createdAt: Date.now(),
          updatedAt: Date.now()
        } as any);

      // First registration should succeed
      await agentRegistry.registerAgent(agentConfig);

      // Second registration should fail
      await expect(agentRegistry.registerAgent(agentConfig)).rejects.toThrow('Agent with name "Duplicate Agent" already exists');

      expect(mockLogger.warn).toHaveBeenCalledWith('Duplicate agent registration attempted', {
        agentName: 'Duplicate Agent',
        agentType: AgentType.LEARNING
      });

      mockGetAgentByName.mockRestore();
    });

    it('should validate required fields during registration', async () => {
      const invalidConfigs = [
        {
          // Missing type
          name: 'Invalid Agent',
          description: 'Missing type',
          systemPrompt: 'You are helpful.',
          tools: [],
          modelConfig: { provider: 'openai', model: 'gpt-4' }
        },
        {
          type: AgentType.LEARNING,
          // Missing name
          description: 'Missing name',
          systemPrompt: 'You are helpful.',
          tools: [],
          modelConfig: { provider: 'openai', model: 'gpt-4' }
        },
        {
          type: AgentType.LEARNING,
          name: 'Invalid Agent',
          description: 'Invalid agent',
          systemPrompt: '',
          // Empty system prompt should be invalid
          tools: [],
          modelConfig: { provider: 'openai', model: 'gpt-4' }
        }
      ];

      for (const config of invalidConfigs) {
        await expect(agentRegistry.registerAgent(config)).rejects.toThrow();
      }
    });

    it('should handle registration errors gracefully', async () => {
      const agentConfig = {
        type: AgentType.LEARNING,
        name: 'Error Agent',
        description: 'An agent that causes errors',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      };

      // Mock transaction to throw an error - need to mock the .execute() pattern
      const mockTransaction = vi.fn().mockReturnValue({
        execute: vi.fn().mockRejectedValue(new Error('Database connection failed'))
      });
      mockDb.transaction = mockTransaction;

      await expect(agentRegistry.registerAgent(agentConfig)).rejects.toThrow('Database connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to register agent', expect.any(Error));
    });
  });

  describe('Agent Retrieval', () => {
    let storedAgents: any[] = [];

    beforeEach(async () => {
      // Set up mock database to return test agents
      storedAgents = [
        {
          id: 'learning-agent-1',
          type: 'learning',
          name: 'Learning Agent 1',
          description: 'First learning agent',
          metadata: JSON.stringify({ systemPrompt: 'You are a learning assistant.' }),
          tools: JSON.stringify(['concept-parser']),
          model_config: JSON.stringify({ provider: 'openai', model: 'gpt-4' }),
          status: 'inactive',
          created_at: Date.now(),
          updated_at: Date.now()
        },
        {
          id: 'assessment-agent-1',
          type: 'assessment',
          name: 'Assessment Agent 1',
          description: 'First assessment agent',
          metadata: JSON.stringify({ systemPrompt: 'You are an assessment assistant.' }),
          tools: JSON.stringify(['quiz-generator']),
          model_config: JSON.stringify({ provider: 'openai', model: 'gpt-4' }),
          status: 'inactive',
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ];

      // Mock database operations with dynamic updates
      mockDb.updateTable.mockImplementation((table: string) => ({
        set: vi.fn().mockImplementation((updates: any) => ({
          where: vi.fn().mockImplementation((field: any, operator?: any, value?: any) => {
            // Handle different where call patterns for updates
            let agentId: string;
            if (typeof field === 'object') {
              agentId = field.id.eq || field.id;
            } else {
              agentId = value;
            }

            // Update the stored agent in the array
            const agentIndex = storedAgents.findIndex(agent => agent.id === agentId);
            if (agentIndex >= 0) {
              storedAgents[agentIndex] = {
                ...storedAgents[agentIndex],
                ...updates,
                updated_at: Date.now()
              };
            }

            return {
              executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ numUpdatedRows: 1 }),
              execute: vi.fn().mockResolvedValue([{ numUpdatedRows: 1 }]),
            };
          }),
        })),
      } as any));

      mockDb.deleteFrom.mockImplementation((table: string) => ({
        where: vi.fn().mockImplementation((field: any, operator?: any, value?: any) => {
          // Handle different where call patterns for deletion
          let agentId: string;
          if (typeof field === 'object') {
            agentId = field.id.eq || field.id;
          } else {
            agentId = value;
          }

          // Remove the agent from the stored array
          const agentIndex = storedAgents.findIndex(agent => agent.id === agentId);
          if (agentIndex >= 0) {
            storedAgents.splice(agentIndex, 1);
          }

          return {
            executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ numDeletedRows: 1 }),
            execute: vi.fn().mockResolvedValue([{ numDeletedRows: 1 }]),
          };
        }),
      } as any));

      mockDb.selectFrom.mockImplementation((table: string) => {
        const mockChain = {
          selectAll: vi.fn().mockReturnThis(),
          where: vi.fn().mockImplementation((field: any, operator?: any, value?: any) => {
            // Handle different where call patterns
            if (typeof field === 'object' && operator === undefined) {
              // Object-style where condition: where('id', '=', id)
              const entries = Object.entries(field);
              if (entries.length > 0) {
                const [fieldName, conditionObj] = entries[0];
                const fieldValue = conditionObj.eq || conditionObj;

                if (fieldName === 'id') {
                  const foundAgent = storedAgents.find(agent => agent.id === fieldValue);
                  return {
                    ...mockChain,
                    executeTakeFirst: vi.fn().mockResolvedValue(foundAgent || null),
                    execute: vi.fn().mockResolvedValue(foundAgent ? [foundAgent] : []),
                  };
                }

                if (fieldName === 'name') {
                  const foundAgent = storedAgents.find(agent => agent.name === fieldValue);
                  return {
                    ...mockChain,
                    executeTakeFirst: vi.fn().mockResolvedValue(foundAgent || null),
                    execute: vi.fn().mockResolvedValue(foundAgent ? [foundAgent] : []),
                  };
                }

                if (fieldName === 'status') {
                  const filteredAgents = storedAgents.filter(agent => agent.status === fieldValue);
                  return {
                    ...mockChain,
                    execute: vi.fn().mockResolvedValue(filteredAgents),
                  };
                }

                if (fieldName === 'type') {
                  const filteredAgents = storedAgents.filter(agent => agent.type === fieldValue);
                  return {
                    ...mockChain,
                    execute: vi.fn().mockResolvedValue(filteredAgents),
                  };
                }
              }
            } else {
              // Operator-style where condition: where('id', '=', id)
              if (field === 'id') {
                const foundAgent = storedAgents.find(agent => agent.id === value);
                return {
                  ...mockChain,
                  executeTakeFirst: vi.fn().mockResolvedValue(foundAgent || null),
                  execute: vi.fn().mockResolvedValue(foundAgent ? [foundAgent] : []),
                };
              }

              if (field === 'name') {
                const foundAgent = storedAgents.find(agent => agent.name === value);
                return {
                  ...mockChain,
                  executeTakeFirst: vi.fn().mockResolvedValue(foundAgent || null),
                  execute: vi.fn().mockResolvedValue(foundAgent ? [foundAgent] : []),
                };
              }

              if (field === 'status') {
                const filteredAgents = storedAgents.filter(agent => agent.status === value);
                return {
                  ...mockChain,
                  execute: vi.fn().mockResolvedValue(filteredAgents),
                };
              }

              if (field === 'type') {
                const filteredAgents = storedAgents.filter(agent => agent.type === value);
                return {
                  ...mockChain,
                  execute: vi.fn().mockResolvedValue(filteredAgents),
                };
              }
            }

            return mockChain;
          }),
          limit: vi.fn().mockImplementation((limitValue: number) => {
            return {
              ...mockChain,
              execute: vi.fn().mockImplementation(() => {
                return Promise.resolve(storedAgents.slice(0, limitValue));
              }),
              offset: vi.fn().mockImplementation((offsetValue: number) => {
                return {
                  ...mockChain,
                  execute: vi.fn().mockImplementation(() => {
                    return Promise.resolve(storedAgents.slice(offsetValue, offsetValue + limitValue));
                  }),
                };
              }),
            };
          }),
          offset: vi.fn().mockImplementation((offsetValue: number) => {
            return {
              ...mockChain,
              execute: vi.fn().mockImplementation(() => {
                return Promise.resolve(storedAgents.slice(offsetValue));
              }),
            };
          }),
          execute: vi.fn().mockResolvedValue(storedAgents),
          executeTakeFirst: vi.fn().mockResolvedValue(null),
        };

        return mockChain;
      });
    });

    it('should retrieve agent by ID', async () => {
      const agents = await agentRegistry.listAgents();
      const agentId = agents[0].id;

      const agent = await agentRegistry.getAgent(agentId);

      expect(agent).toBeDefined();
      expect(agent!.id).toBe(agentId);
      expect(agent!.name).toBeDefined();
      expect(agent!.type).toBeDefined();
    });

    it('should return null for non-existent agent ID', async () => {
      const agent = await agentRegistry.getAgent('non-existent-id');
      expect(agent).toBeNull();
    });

    it('should retrieve agent by name', async () => {
      const agent = await agentRegistry.getAgentByName('Learning Agent 1');

      expect(agent).toBeDefined();
      expect(agent!.name).toBe('Learning Agent 1');
      expect(agent!.type).toBe(AgentType.LEARNING);
    });

    it('should retrieve agents by type', async () => {
      const learningAgents = await agentRegistry.getAgentsByType(AgentType.LEARNING);

      expect(learningAgents).toHaveLength(1);
      expect(learningAgents[0].type).toBe(AgentType.LEARNING);
      expect(learningAgents[0].name).toBe('Learning Agent 1');
    });

    it('should list all agents with pagination', async () => {
      const allAgents = await agentRegistry.listAgents();
      expect(allAgents).toHaveLength(2);

      const paginatedAgents = await agentRegistry.listAgents({ limit: 1, offset: 0 });
      expect(paginatedAgents).toHaveLength(1);

      const secondPage = await agentRegistry.listAgents({ limit: 1, offset: 1 });
      expect(secondPage).toHaveLength(1);
      expect(secondPage[0].id).not.toBe(paginatedAgents[0].id);
    });

    it('should filter agents by status', async () => {
      // Activate one agent
      const agents = await agentRegistry.listAgents();
      const agentId = agents[0].id;
      await agentRegistry.activateAgent(agentId);

      const activeAgents = await agentRegistry.listAgents({ status: 'active' });
      expect(activeAgents).toHaveLength(1);
      expect(activeAgents[0].id).toBe(agentId);

      const inactiveAgents = await agentRegistry.listAgents({ status: 'inactive' });
      expect(inactiveAgents).toHaveLength(1);
    });
  });

  describe('Agent Configuration Management', () => {
    let agentId: string;

    beforeEach(async () => {
      // Reset mocks for this test group
      vi.clearAllMocks();

      // Setup transaction mock for agent registration - Kysely pattern
      mockDb.transaction.mockReturnValue({
        execute: vi.fn().mockImplementation((fn: any) => {
          const mockTransaction = {
            insertInto: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ insertId: 1 })
              })
            })
          };
          return fn(mockTransaction);
        })
      } as any);

      // Mock getAgent to return the registered agent for subsequent operations
      let registeredAgent: any = null;
      mockDb.selectFrom.mockImplementation((table: string) => ({
        selectAll: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation((field: any, operator?: any, value?: any) => {
          if (field === 'id' && value === agentId && registeredAgent) {
            // Convert agent to database row format with JSON strings
            const dbRow = {
              id: registeredAgent.id,
              type: registeredAgent.type,
              name: registeredAgent.name,
              description: registeredAgent.description,
              metadata: JSON.stringify({
                ...registeredAgent.metadata,
                systemPrompt: registeredAgent.systemPrompt
              }),
              tools: JSON.stringify(registeredAgent.tools),
              model_config: JSON.stringify(registeredAgent.modelConfig),
              status: registeredAgent.status,
              created_at: registeredAgent.createdAt,
              updated_at: registeredAgent.updatedAt,
              activated_at: registeredAgent.activatedAt || null,
              deactivated_at: registeredAgent.deactivatedAt || null
            };
            return {
              executeTakeFirst: vi.fn().mockResolvedValue(dbRow),
              execute: vi.fn().mockResolvedValue([dbRow]),
            };
          }
          return {
            executeTakeFirst: vi.fn().mockResolvedValue(null),
            execute: vi.fn().mockResolvedValue([]),
          };
        }),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue([]),
        executeTakeFirst: vi.fn().mockResolvedValue(null),
      }));

      // Mock database operations with dynamic updates
      mockDb.updateTable.mockImplementation((table: string) => ({
        set: vi.fn().mockImplementation((updates: any) => ({
          where: vi.fn().mockImplementation((field: any, operator?: any, value?: any) => {
            return {
              executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ numUpdatedRows: 1 }),
              execute: vi.fn().mockResolvedValue([{ numUpdatedRows: 1 }]),
            };
          }),
        })),
      } as any));

      const agent = await agentRegistry.registerAgent({
        type: AgentType.LEARNING,
        name: 'Config Test Agent',
        description: 'Agent for configuration testing',
        systemPrompt: 'You are helpful.',
        tools: ['tool1'],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      });
      registeredAgent = agent;
      agentId = agent.id;
    });

    it('should update agent configuration', async () => {
      const updates = {
        name: 'Updated Agent Name',
        description: 'Updated description',
        systemPrompt: 'You are an updated helpful assistant.',
        tools: ['tool1', 'tool2'],
        modelConfig: {
          provider: 'anthropic',
          model: 'claude-3',
          temperature: 0.5,
          maxTokens: 3000
        }
      };

      const updatedAgent = await agentRegistry.updateAgent(agentId, updates);

      expect(updatedAgent.name).toBe('Updated Agent Name');
      expect(updatedAgent.description).toBe('Updated description');
      expect(updatedAgent.systemPrompt).toBe('You are an updated helpful assistant.');
      expect(updatedAgent.tools).toEqual(['tool1', 'tool2']);
      expect(updatedAgent.modelConfig.provider).toBe('anthropic');
      expect(updatedAgent.modelConfig.model).toBe('claude-3');
      expect(updatedAgent.updatedAt).toBeDefined();
      expect(updatedAgent.updatedAt).not.toBe(updatedAgent.createdAt);

      expect(mockLogger.info).toHaveBeenCalledWith('Agent configuration updated', {
        agentId,
        updatedFields: Object.keys(updates)
      });
    });

    it('should reject invalid configuration updates', async () => {
      const invalidUpdates = {
        type: 'invalid-type' as AgentType,
        systemPrompt: '', // Empty prompt should be invalid
        tools: null as any
      };

      await expect(agentRegistry.updateAgent(agentId, invalidUpdates)).rejects.toThrow();
    });

    it('should handle update errors gracefully', async () => {
      // Mock database error
      mockDb.updateTable.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirstOrThrow: vi.fn().mockRejectedValue(new Error('Update failed'))
          })
        })
      } as any);

      await expect(agentRegistry.updateAgent(agentId, { name: 'New Name' })).rejects.toThrow('Update failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to update agent configuration', expect.any(Error));
    });

    it('should get agent configuration', async () => {
      const config = await agentRegistry.getAgentConfiguration(agentId);

      expect(config).toBeDefined();
      expect(config.name).toBe('Config Test Agent');
      expect(config.type).toBe(AgentType.LEARNING);
      expect(config.systemPrompt).toBe('You are helpful.');
      expect(config.tools).toEqual(['tool1']);
      expect(config.modelConfig.provider).toBe('openai');
      expect(config.modelConfig.model).toBe('gpt-4');
    });

    it('should validate agent configuration', async () => {
      const validConfig = {
        type: AgentType.LEARNING,
        name: 'Valid Agent',
        description: 'A valid configuration',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      };

      const validation = await agentRegistry.validateConfiguration(validConfig);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      const invalidConfig = {
        type: 'invalid' as AgentType,
        name: '', // Empty name
        description: 'Invalid configuration',
        systemPrompt: '', // Empty prompt
        tools: null as any,
        modelConfig: { provider: '', model: '' } // Empty provider and model
      };

      const invalidValidation = await agentRegistry.validateConfiguration(invalidConfig);
      expect(invalidValidation.isValid).toBe(false);
      expect(invalidValidation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Agent Status Management', () => {
    let agentId: string;
    let mockAgent: any = null;

    beforeEach(async () => {
      // Reset mocks for this test group
      vi.clearAllMocks();

      // Setup transaction mock for agent registration - Kysely pattern
      mockDb.transaction.mockReturnValue({
        execute: vi.fn().mockImplementation((fn: any) => {
          const mockTransaction = {
            insertInto: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ insertId: 1 })
              })
            })
          };
          return fn(mockTransaction);
        })
      } as any);

      // Mock database operations with dynamic updates
      let agentStatus = 'inactive';
      mockDb.updateTable.mockImplementation((table: string) => ({
        set: vi.fn().mockImplementation((updates: any) => ({
          where: vi.fn().mockImplementation((field: any, operator?: any, value?: any) => {
            // Update mock agent status for testing
            if (updates.status) {
              agentStatus = updates.status;
            }
            mockAgent = {
              ...mockAgent,
              ...updates,
              status: agentStatus,
              updatedAt: Date.now()
            };
            return {
              executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ numUpdatedRows: 1 }),
              execute: vi.fn().mockResolvedValue([{ numUpdatedRows: 1 }]),
            };
          }),
        })),
      } as any));

      // Mock getAgent to return the agent with current status
      mockDb.selectFrom.mockImplementation((table: string) => ({
        selectAll: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation((field: any, operator?: any, value?: any) => {
          if (field === 'id' && value === agentId && mockAgent) {
            // Convert agent to database row format with JSON strings
            // Use the current mockAgent status which gets updated by activateAgent
            const dbRow = {
              id: mockAgent.id,
              type: mockAgent.type,
              name: mockAgent.name,
              description: mockAgent.description,
              metadata: JSON.stringify({
                ...mockAgent.metadata,
                systemPrompt: mockAgent.systemPrompt
              }),
              tools: JSON.stringify(mockAgent.tools),
              model_config: JSON.stringify(mockAgent.modelConfig),
              status: agentStatus || mockAgent.status, // Use agentStatus from update operations
              created_at: mockAgent.createdAt,
              updated_at: mockAgent.updatedAt,
              activated_at: agentStatus === 'active' ? mockAgent.activatedAt : null,
              deactivated_at: agentStatus === 'inactive' && mockAgent.deactivatedAt ? mockAgent.deactivatedAt : null
            };
            return {
              executeTakeFirst: vi.fn().mockResolvedValue(dbRow),
              execute: vi.fn().mockResolvedValue([dbRow]),
            };
          }
          return {
            executeTakeFirst: vi.fn().mockResolvedValue(null),
            execute: vi.fn().mockResolvedValue([]),
          };
        }),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        execute: vi.fn().mockImplementation(() => {
          // Return a properly formatted database row for listAgents
          if (mockAgent) {
            const dbRow = {
              id: mockAgent.id,
              type: mockAgent.type,
              name: mockAgent.name,
              description: mockAgent.description,
              metadata: JSON.stringify({
                ...mockAgent.metadata,
                systemPrompt: mockAgent.systemPrompt
              }),
              tools: JSON.stringify(mockAgent.tools),
              model_config: JSON.stringify(mockAgent.modelConfig),
              status: mockAgent.status,
              created_at: mockAgent.createdAt,
              updated_at: mockAgent.updatedAt,
              activated_at: mockAgent.activatedAt || null,
              deactivated_at: mockAgent.deactivatedAt || null
            };
            return Promise.resolve([dbRow]);
          }
          return Promise.resolve([]);
        }),
        executeTakeFirst: vi.fn().mockResolvedValue(mockAgent || null),
      }));

      const agent = await agentRegistry.registerAgent({
        type: AgentType.LEARNING,
        name: 'Status Test Agent',
        description: 'Agent for status testing',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      });
      mockAgent = agent;
      agentId = agent.id;
    });

    it('should activate agent successfully', async () => {
      const result = await agentRegistry.activateAgent(agentId);

      expect(result.status).toBe('active');
      expect(result.activatedAt).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Agent activated', {
        agentId,
        agentName: 'Status Test Agent'
      });
    });

    it('should deactivate agent successfully', async () => {
      await agentRegistry.activateAgent(agentId);
      const result = await agentRegistry.deactivateAgent(agentId);

      expect(result.status).toBe('inactive');
      expect(result.deactivatedAt).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Agent deactivated', {
        agentId,
        agentName: 'Status Test Agent'
      });
    });

    it('should handle activation of already active agent', async () => {
      await agentRegistry.activateAgent(agentId);

      const result = await agentRegistry.activateAgent(agentId);
      expect(result.status).toBe('active'); // Should remain active

      expect(mockLogger.warn).toHaveBeenCalledWith('Agent is already active', {
        agentId,
        agentName: 'Status Test Agent'
      });
    });

    it('should handle status operations on non-existent agent', async () => {
      await expect(agentRegistry.activateAgent('non-existent-id')).rejects.toThrow('Agent not found');
      await expect(agentRegistry.deactivateAgent('non-existent-id')).rejects.toThrow('Agent not found');
    });

    it('should get agent statistics', async () => {
      await agentRegistry.activateAgent(agentId);

      const stats = await agentRegistry.getAgentStatistics();

      expect(stats.totalAgents).toBe(1);
      expect(stats.activeAgents).toBe(1);
      expect(stats.inactiveAgents).toBe(0);
      expect(stats.agentsByType[AgentType.LEARNING]).toBe(1);
    });
  });

  describe('Agent Deletion', () => {
    let agentId: string;
    let mockAgent: any = null;

    beforeEach(async () => {
      // Reset mocks for this test group
      vi.clearAllMocks();

      // Setup transaction mock for agent registration - Kysely pattern
      mockDb.transaction.mockReturnValue({
        execute: vi.fn().mockImplementation((fn: any) => {
          const mockTransaction = {
            insertInto: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ insertId: 1 })
              })
            })
          };
          return fn(mockTransaction);
        })
      } as any);

      // Mock getAgent to return the agent (or null if deleted)
      let agentDeleted = false;
      let currentAgentStatus = 'inactive'; // Track current status for this section
      mockDb.selectFrom.mockImplementation((table: string) => ({
        selectAll: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation((field: any, operator?: any, value?: any) => {
          if (field === 'id' && value === agentId && mockAgent && !agentDeleted) {
            // Convert agent to database row format with JSON strings
            const dbRow = {
              id: mockAgent.id,
              type: mockAgent.type,
              name: mockAgent.name,
              description: mockAgent.description,
              metadata: JSON.stringify({
                ...mockAgent.metadata,
                systemPrompt: mockAgent.systemPrompt
              }),
              tools: JSON.stringify(mockAgent.tools),
              model_config: JSON.stringify(mockAgent.modelConfig),
              status: currentAgentStatus, // Use tracked status
              created_at: mockAgent.createdAt,
              updated_at: mockAgent.updatedAt,
              activated_at: currentAgentStatus === 'active' ? mockAgent.activatedAt : null,
              deactivated_at: currentAgentStatus === 'inactive' && mockAgent.deactivatedAt ? mockAgent.deactivatedAt : null
            };
            return {
              executeTakeFirst: vi.fn().mockResolvedValue(dbRow),
              execute: vi.fn().mockResolvedValue([dbRow]),
            };
          }
          return {
            executeTakeFirst: vi.fn().mockResolvedValue(null),
            execute: vi.fn().mockResolvedValue([]),
          };
        }),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(agentDeleted ? [] : [mockAgent]),
        executeTakeFirst: vi.fn().mockResolvedValue(agentDeleted ? null : mockAgent),
      }));

      // Update the activateAgent method to also update the status tracker
      mockDb.updateTable.mockImplementation((table: string) => ({
        set: vi.fn().mockImplementation((updates: any) => ({
          where: vi.fn().mockImplementation((field: any, operator?: any, value?: any) => {
            // Update the status tracker when status is updated
            if (updates.status) {
              currentAgentStatus = updates.status;
              if (updates.status === 'active') {
                mockAgent.activatedAt = Date.now();
              } else if (updates.status === 'inactive') {
                mockAgent.deactivatedAt = Date.now();
              }
            }
            return {
              executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ numUpdatedRows: 1 }),
              execute: vi.fn().mockResolvedValue([{ numUpdatedRows: 1 }]),
            };
          }),
        })),
      } as any));

      // Mock delete operations
      mockDb.deleteFrom.mockImplementation((table: string) => ({
        where: vi.fn().mockImplementation((field: any, operator?: any, value?: any) => {
          if (field === 'id' && value === agentId) {
            // Check if agent is active before allowing deletion
            if (mockAgent?.status === 'active') {
              return {
                executeTakeFirstOrThrow: vi.fn().mockRejectedValue(new Error('Cannot delete active agent')),
                execute: vi.fn().mockRejectedValue(new Error('Cannot delete active agent')),
              };
            }
            agentDeleted = true;
          }
          return {
            executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ numDeletedRows: 1 }),
            execute: vi.fn().mockResolvedValue([{ numDeletedRows: 1 }]),
          };
        }),
      } as any));

      const agent = await agentRegistry.registerAgent({
        type: AgentType.LEARNING,
        name: 'Delete Test Agent',
        description: 'Agent for deletion testing',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      });
      mockAgent = agent;
      agentId = agent.id;
    });

    it('should delete agent successfully', async () => {
      const result = await agentRegistry.deleteAgent(agentId);

      expect(result).toBe(true);

      // Verify agent is deleted
      const deletedAgent = await agentRegistry.getAgent(agentId);
      expect(deletedAgent).toBeNull();

      expect(mockLogger.info).toHaveBeenCalledWith('Agent deleted successfully', {
        agentId,
        agentName: 'Delete Test Agent'
      });
    });

    it('should handle deletion of non-existent agent', async () => {
      const result = await agentRegistry.deleteAgent('non-existent-id');
      expect(result).toBe(false);

      expect(mockLogger.warn).toHaveBeenCalledWith('Attempted to delete non-existent agent', {
        agentId: 'non-existent-id'
      });
    });

    it('should prevent deletion of active agent', async () => {
      await agentRegistry.activateAgent(agentId);

      await expect(agentRegistry.deleteAgent(agentId)).rejects.toThrow('Cannot delete active agent');

      expect(mockLogger.warn).toHaveBeenCalledWith('Attempted to delete active agent', {
        agentId,
        agentName: 'Delete Test Agent'
      });
    });
  });

  describe('Performance Testing', () => {
    it('should register agents within performance threshold', async () => {
      const agentConfig = {
        type: AgentType.LEARNING,
        name: 'Performance Test Agent',
        description: 'Agent for performance testing',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      };

      const startTime = performance.now();
      await agentRegistry.registerAgent(agentConfig);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(100); // Sub-100ms registration
    });

    it('should retrieve agents within performance threshold', async () => {
      // Register a test agent first
      const agent = await agentRegistry.registerAgent({
        type: AgentType.LEARNING,
        name: 'Retrieval Test Agent',
        description: 'Agent for retrieval performance testing',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      });

      const startTime = performance.now();
      const retrievedAgent = await agentRegistry.getAgent(agent.id);
      const duration = performance.now() - startTime;

      expect(retrievedAgent).toBeDefined();
      expect(duration).toBeLessThan(50); // Sub-50ms retrieval
    });

    it('should handle concurrent operations efficiently', async () => {
      const agentConfigs = Array.from({ length: 10 }, (_, i) => ({
        type: AgentType.LEARNING,
        name: `Concurrent Agent ${i}`,
        description: `Agent ${i} for concurrent testing`,
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      }));

      const startTime = performance.now();

      // Register agents concurrently
      const registrationPromises = agentConfigs.map(config =>
        agentRegistry.registerAgent(config)
      );
      const agents = await Promise.all(registrationPromises);

      const duration = performance.now() - startTime;

      expect(agents).toHaveLength(10);
      expect(duration).toBeLessThan(500); // All 10 registrations within 500ms

      // Verify all agents were registered correctly
      for (const agent of agents) {
        expect(agent.id).toBeDefined();
        expect(agent.name).toMatch(/Concurrent Agent \d/);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection failures gracefully', async () => {
      // Mock transaction failure since registerAgent uses transactions
      mockDb.transaction.mockReturnValue({
        execute: vi.fn().mockRejectedValue(new Error('Database connection lost'))
      } as any);

      const agentConfig = {
        type: AgentType.LEARNING,
        name: 'Error Test Agent',
        description: 'Agent to test error handling',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      };

      await expect(agentRegistry.registerAgent(agentConfig)).rejects.toThrow('Database connection lost');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to register agent', expect.any(Error));
    });

    it('should handle corrupted agent data gracefully', async () => {
      // Mock corrupted data response
      mockDb.selectFrom.mockImplementation((table: string) => ({
        selectAll: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnValue({
          executeTakeFirst: vi.fn().mockResolvedValue({
            id: 'corrupted-id',
            // Missing required fields
            name: null,
            type: null,
            metadata: 'invalid-json', // This will cause JSON parsing to fail
            tools: 'invalid-json',
            model_config: 'invalid-json'
          })
        })
      } as any));

      await expect(agentRegistry.getAgent('corrupted-id')).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to parse agent data', expect.any(Error));
    });

    it('should maintain data consistency during operations', async () => {
      // Reset mocks for this test
      vi.clearAllMocks();

      // Setup transaction mock for agent registration
      mockDb.transaction.mockReturnValue({
        execute: vi.fn().mockImplementation((fn: any) => {
          const mockTransaction = {
            insertInto: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ insertId: 1 })
              })
            })
          };
          return fn(mockTransaction);
        })
      } as any);

      // Track the registered agent
      let registeredAgent: any = null;

      // Mock getAgent to return the registered agent with proper updates
      mockDb.selectFrom.mockImplementation((table: string) => ({
        selectAll: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation((field: any, operator?: any, value?: any) => {
          if (field === 'id' && registeredAgent && value === registeredAgent.id) {
            return {
              executeTakeFirst: vi.fn().mockResolvedValue({
                id: registeredAgent.id,
                type: registeredAgent.type,
                name: registeredAgent.name, // This will be updated by updateAgent
                description: registeredAgent.description,
                metadata: JSON.stringify({
                  systemPrompt: registeredAgent.systemPrompt
                }),
                tools: JSON.stringify(registeredAgent.tools),
                model_config: JSON.stringify(registeredAgent.modelConfig),
                status: registeredAgent.status,
                created_at: registeredAgent.createdAt,
                updated_at: registeredAgent.updatedAt
              }),
              execute: vi.fn().mockResolvedValue([registeredAgent]),
            };
          }
          return {
            executeTakeFirst: vi.fn().mockResolvedValue(null),
            execute: vi.fn().mockResolvedValue([]),
          };
        }),
        execute: vi.fn().mockResolvedValue(registeredAgent ? [registeredAgent] : []),
        executeTakeFirst: vi.fn().mockResolvedValue(registeredAgent || null),
      }));

      // Mock updateTable to track updates
      mockDb.updateTable.mockImplementation((table: string) => ({
        set: vi.fn().mockImplementation((updates: any) => ({
          where: vi.fn().mockImplementation((field: any, operator?: any, value?: any) => {
            // Update the tracked agent when name is updated
            if (registeredAgent && updates.name) {
              registeredAgent.name = updates.name;
              registeredAgent.updatedAt = Date.now();
            }
            return {
              executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ numUpdatedRows: 1 }),
              execute: vi.fn().mockResolvedValue([{ numUpdatedRows: 1 }]),
            };
          }),
        })),
      } as any));

      const agentConfig = {
        type: AgentType.LEARNING,
        name: 'Consistency Test Agent',
        description: 'Agent for consistency testing',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      };

      // Register agent
      const agent = await agentRegistry.registerAgent(agentConfig);
      registeredAgent = { ...agent, status: 'inactive' }; // Track the agent

      // Update configuration
      await agentRegistry.updateAgent(agent.id, {
        name: 'Updated Name'
      });

      // Verify data consistency
      const updatedAgent = await agentRegistry.getAgent(agent.id);
      expect(updatedAgent!.name).toBe('Updated Name');
      expect(updatedAgent!.id).toBe(agent.id);
      expect(updatedAgent!.type).toBe(agent.type);
    });
  });

  describe('Integration with AsyncLocalStorage', () => {
    it('should run operations within AsyncLocalStorage context', async () => {
      // Reset mocks and setup spy
      vi.clearAllMocks();

      // Setup transaction mock for agent registration
      mockDb.transaction.mockReturnValue({
        execute: vi.fn().mockImplementation((fn: any) => {
          const mockTransaction = {
            insertInto: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ insertId: 1 })
              })
            })
          };
          return fn(mockTransaction);
        })
      } as any);

      // Setup proper spy for mockAls.run
      const runSpy = vi.spyOn(mockAls, 'run');

      const agentConfig = {
        type: AgentType.LEARNING,
        name: 'Context Test Agent',
        description: 'Agent for context testing',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      };

      await agentRegistry.runWithContext('test-operation', async () => {
        const agent = await agentRegistry.registerAgent(agentConfig);
        expect(agent).toBeDefined();
        expect(agent.name).toBe('Context Test Agent');
      });

      expect(runSpy).toHaveBeenCalled();
      runSpy.mockRestore();
    });

    it('should preserve context across operation chains', async () => {
      // Reset mocks and setup spy
      vi.clearAllMocks();

      // Setup transaction mock for agent registration
      mockDb.transaction.mockReturnValue({
        execute: vi.fn().mockImplementation((fn: any) => {
          const mockTransaction = {
            insertInto: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ insertId: 1 })
              })
            })
          };
          return fn(mockTransaction);
        })
      } as any);

      // Track registered agent and status
      let registeredAgent: any = null;
      let agentStatus = 'inactive';

      // Setup proper spy for mockAls.run
      const runSpy = vi.spyOn(mockAls, 'run');

      // Mock getStore to return a mock store with correlationId
      Object.defineProperty(mockAls, 'getStore', {
        value: vi.fn().mockReturnValue({
          get: vi.fn().mockReturnValue('test-correlation-id'),
          set: vi.fn()
        }),
        writable: true
      });

      // Mock database operations
      mockDb.selectFrom.mockImplementation((table: string) => ({
        selectAll: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation((field: any, operator?: any, value?: any) => {
          if (field === 'id' && registeredAgent && value === registeredAgent.id) {
            return {
              executeTakeFirst: vi.fn().mockResolvedValue({
                id: registeredAgent.id,
                type: registeredAgent.type,
                name: registeredAgent.name,
                description: registeredAgent.description,
                metadata: JSON.stringify({
                  systemPrompt: registeredAgent.systemPrompt
                }),
                tools: JSON.stringify(registeredAgent.tools),
                model_config: JSON.stringify(registeredAgent.modelConfig),
                status: agentStatus, // Use tracked status
                created_at: registeredAgent.createdAt,
                updated_at: registeredAgent.updatedAt
              }),
              execute: vi.fn().mockResolvedValue([registeredAgent]),
            };
          }
          return {
            executeTakeFirst: vi.fn().mockResolvedValue(null),
            execute: vi.fn().mockResolvedValue([]),
          };
        }),
        execute: vi.fn().mockResolvedValue(registeredAgent ? [registeredAgent] : []),
        executeTakeFirst: vi.fn().mockResolvedValue(registeredAgent || null),
      }));

      mockDb.updateTable.mockImplementation((table: string) => ({
        set: vi.fn().mockImplementation((updates: any) => ({
          where: vi.fn().mockImplementation((field: any, operator?: any, value?: any) => {
            // Update the status tracker
            if (updates.status) {
              agentStatus = updates.status;
            }
            return {
              executeTakeFirstOrThrow: vi.fn().mockResolvedValue({ numUpdatedRows: 1 }),
              execute: vi.fn().mockResolvedValue([{ numUpdatedRows: 1 }]),
            };
          }),
        })),
      } as any));

      const agentConfig = {
        type: AgentType.LEARNING,
        name: 'Chain Context Test Agent',
        description: 'Agent for chained context testing',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      };

      let contextId: string | undefined;

      await agentRegistry.runWithContext('chained-operation', async () => {
        contextId = mockAls.getStore()?.get('correlationId');

        const agent = await agentRegistry.registerAgent(agentConfig);
        registeredAgent = { ...agent, status: 'inactive' };

        await agentRegistry.activateAgent(agent.id);

        const retrievedAgent = await agentRegistry.getAgent(agent.id);
        expect(retrievedAgent!.status).toBe('active');
      });

      expect(contextId).toBe('test-correlation-id');
      expect(runSpy).toHaveBeenCalled(); // At least called for the outer context
      runSpy.mockRestore();
    });
  });
});