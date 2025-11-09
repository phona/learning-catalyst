/**
 * Agent Lifecycle Management Test Suite
 *
 * Comprehensive test suite for agent lifecycle operations including creation,
 * activation, deactivation, state transitions, and deletion. Tests ensure
 * proper state management, error handling, and performance requirements.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentLifecycleManager } from '../agent-lifecycle-manager';
import { AgentRegistry } from '../agent-registry';
import { AgentType } from '../types';
import { createMockLogger, createMockDatabase, createMockAsyncLocalStorage } from '@/test/setup/main-process/setup';

// Mock AgentRegistry
const mockAgentRegistry = {
  registerAgent: vi.fn(),
  getAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
  activateAgent: vi.fn(),
  deactivateAgent: vi.fn(),
  listAgents: vi.fn(),
  getAgentsByType: vi.fn()
} as any;

describe('AgentLifecycleManager', () => {
  let lifecycleManager: AgentLifecycleManager;
  let mockDb: Kysely<Database>;
  let mockLogger: any;
  let mockAls: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup comprehensive mocks
    mockDb = createMockDatabase();
    mockLogger = createMockLogger();
    mockAls = createMockAsyncLocalStorage();

    // Create AgentLifecycleManager instance
    lifecycleManager = new AgentLifecycleManager(
      mockAgentRegistry,
      mockDb,
      mockLogger,
      mockAls
    );

    // Setup default mock behaviors
    mockDb.transaction.mockImplementation(async (fn) => {
      return fn(mockDb);
    });

    mockLogger.info.mockReturnValue(undefined);
    mockLogger.error.mockReturnValue(undefined);
    mockLogger.warn.mockReturnValue(undefined);
    mockLogger.debug.mockReturnValue(undefined);

    // Setup AgentRegistry mock defaults
    mockAgentRegistry.registerAgent.mockImplementation((config) => {
      return Promise.resolve({
        id: 'test-agent-id',
        type: config.type,
        name: config.name,
        description: config.description,
        systemPrompt: config.systemPrompt,
        tools: config.tools,
        modelConfig: config.modelConfig,
        status: 'inactive',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    });

    mockAgentRegistry.getAgent.mockImplementation((id) => {
      if (id === 'test-agent-id') {
        return Promise.resolve({
          id: 'test-agent-id',
          type: AgentType.LEARNING,
          name: 'Test Agent',
          description: 'Test Description',
          systemPrompt: 'Test Prompt',
          tools: [],
          modelConfig: { provider: 'openai', model: 'gpt-4' },
          status: 'inactive',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      return Promise.resolve(null);
    });

    mockAgentRegistry.activateAgent.mockImplementation((id) => {
      return Promise.resolve({
        id,
        type: AgentType.LEARNING,
        name: 'Test Agent',
        description: 'Test Description',
        systemPrompt: 'Test Prompt',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' },
        status: 'active',
        activatedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    });

    mockAgentRegistry.deactivateAgent.mockImplementation((id) => {
      return Promise.resolve({
        id,
        type: AgentType.LEARNING,
        name: 'Test Agent',
        description: 'Test Description',
        systemPrompt: 'Test Prompt',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' },
        status: 'inactive',
        deactivatedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (lifecycleManager) {
      await lifecycleManager.dispose();
    }
  });

  describe('Agent Creation', () => {
    it('should create agent with full lifecycle tracking', async () => {
      const agentConfig = {
        type: AgentType.LEARNING,
        name: 'Lifecycle Test Agent',
        description: 'Agent for lifecycle testing',
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

      const agent = await lifecycleManager.createAgent(agentConfig);

      expect(agent).toBeDefined();
      expect(agent.id).toBeDefined();
      expect(agent.status).toBe('inactive');
      expect(agent.createdAt).toBeDefined();

      expect(mockAgentRegistry.registerAgent).toHaveBeenCalledWith(agentConfig);
      expect(mockDb.insertInto).toHaveBeenCalledWith('agent_lifecycle_events');
      expect(mockLogger.info).toHaveBeenCalledWith('Agent created with lifecycle tracking', {
        agentId: agent.id,
        agentType: AgentType.LEARNING,
        agentName: 'Lifecycle Test Agent'
      });
    });

    it('should create agent with auto-activation option', async () => {
      const agentConfig = {
        type: AgentType.LEARNING,
        name: 'Auto-Activate Agent',
        description: 'Agent that auto-activates',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      };

      const agent = await lifecycleManager.createAgent(agentConfig, { autoActivate: true });

      expect(agent.status).toBe('active');
      expect(agent.activatedAt).toBeDefined();

      expect(mockAgentRegistry.registerAgent).toHaveBeenCalledWith(agentConfig);
      expect(mockAgentRegistry.activateAgent).toHaveBeenCalledWith(agent.id);
    });

    it('should handle creation failures gracefully', async () => {
      const agentConfig = {
        type: AgentType.LEARNING,
        name: 'Error Agent',
        description: 'Agent that causes errors',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      };

      mockAgentRegistry.registerAgent.mockRejectedValue(new Error('Registration failed'));

      await expect(lifecycleManager.createAgent(agentConfig)).rejects.toThrow('Registration failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to create agent', expect.any(Error));
      expect(mockDb.insertInto).toHaveBeenCalledWith('agent_lifecycle_events');
    });

    it('should validate agent configuration during creation', async () => {
      const invalidConfig = {
        type: 'invalid-type' as AgentType,
        name: '', // Invalid empty name
        description: 'Invalid config',
        systemPrompt: '',
        tools: null as any,
        modelConfig: { provider: '', model: '' }
      };

      await expect(lifecycleManager.createAgent(invalidConfig)).rejects.toThrow();

      expect(mockAgentRegistry.registerAgent).not.toHaveBeenCalled();
    });

    it('should create agent with initial state', async () => {
      const agentConfig = {
        type: AgentType.LEARNING,
        name: 'State Test Agent',
        description: 'Agent for state testing',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      };

      const initialState = {
        lastActivity: Date.now(),
        sessionCount: 0,
        totalInteractions: 0,
        performanceMetrics: {
          averageResponseTime: 0,
          successRate: 1.0
        }
      };

      const agent = await lifecycleManager.createAgent(agentConfig, { initialState });

      expect(agent).toBeDefined();
      expect(mockDb.insertInto).toHaveBeenCalledWith('agent_states');
      expect(mockLogger.info).toHaveBeenCalledWith('Agent initial state created', {
        agentId: agent.id
      });
    });
  });

  describe('Agent Activation', () => {
    let agentId: string;

    beforeEach(async () => {
      const agent = await lifecycleManager.createAgent({
        type: AgentType.LEARNING,
        name: 'Activation Test Agent',
        description: 'Agent for activation testing',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      });
      agentId = agent.id;
    });

    it('should activate agent successfully', async () => {
      const result = await lifecycleManager.activateAgent(agentId);

      expect(result.status).toBe('active');
      expect(result.activatedAt).toBeDefined();

      expect(mockAgentRegistry.activateAgent).toHaveBeenCalledWith(agentId);
      expect(mockDb.updateTable).toHaveBeenCalledWith('agent_lifecycle_events');
      expect(mockLogger.info).toHaveBeenCalledWith('Agent activated successfully', {
        agentId,
        activationDuration: expect.any(Number)
      });
    });

    it('should handle activation of already active agent', async () => {
      await lifecycleManager.activateAgent(agentId);

      const result = await lifecycleManager.activateAgent(agentId);

      expect(result.status).toBe('active');
      expect(mockLogger.warn).toHaveBeenCalledWith('Agent is already active', {
        agentId
      });
    });

    it('should handle activation of non-existent agent', async () => {
      await expect(lifecycleManager.activateAgent('non-existent-id')).rejects.toThrow('Agent not found');

      expect(mockAgentRegistry.getAgent).toHaveBeenCalledWith('non-existent-id');
      expect(mockAgentRegistry.activateAgent).not.toHaveBeenCalled();
    });

    it('should handle activation failures gracefully', async () => {
      mockAgentRegistry.activateAgent.mockRejectedValue(new Error('Activation failed'));

      await expect(lifecycleManager.activateAgent(agentId)).rejects.toThrow('Activation failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to activate agent', expect.any(Error));
      expect(mockDb.updateTable).toHaveBeenCalledWith('agent_lifecycle_events');
    });

    it('should support conditional activation', async () => {
      const condition = {
        maxConcurrentAgents: 2,
        requiredResources: ['memory', 'cpu']
      };

      // Mock system state check
      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue({ active_count: 1 })
          })
        })
      } as any);

      const result = await lifecycleManager.activateAgent(agentId, { condition });

      expect(result.status).toBe('active');
      expect(mockLogger.info).toHaveBeenCalledWith('Conditional activation approved', {
        agentId,
        condition
      });
    });

    it('should reject activation when conditions not met', async () => {
      const condition = {
        maxConcurrentAgents: 1,
        requiredResources: ['memory', 'cpu']
      };

      // Mock system state check - already at limit
      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue({ active_count: 1 })
          })
        })
      } as any);

      await expect(lifecycleManager.activateAgent(agentId, { condition }))
        .rejects.toThrow('Activation conditions not met');

      expect(mockLogger.warn).toHaveBeenCalledWith('Activation conditions not met', {
        agentId,
        reason: expect.any(String)
      });
    });
  });

  describe('Agent Deactivation', () => {
    let agentId: string;

    beforeEach(async () => {
      const agent = await lifecycleManager.createAgent({
        type: AgentType.LEARNING,
        name: 'Deactivation Test Agent',
        description: 'Agent for deactivation testing',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      });
      agentId = agent.id;
      await lifecycleManager.activateAgent(agentId);
    });

    it('should deactivate agent successfully', async () => {
      const result = await lifecycleManager.deactivateAgent(agentId);

      expect(result.status).toBe('inactive');
      expect(result.deactivatedAt).toBeDefined();

      expect(mockAgentRegistry.deactivateAgent).toHaveBeenCalledWith(agentId);
      expect(mockDb.updateTable).toHaveBeenCalledWith('agent_lifecycle_events');
      expect(mockLogger.info).toHaveBeenCalledWith('Agent deactivated successfully', {
        agentId,
        activeDuration: expect.any(Number)
      });
    });

    it('should handle deactivation of already inactive agent', async () => {
      await lifecycleManager.deactivateAgent(agentId);

      const result = await lifecycleManager.deactivateAgent(agentId);

      expect(result.status).toBe('inactive');
      expect(mockLogger.warn).toHaveBeenCalledWith('Agent is already inactive', {
        agentId
      });
    });

    it('should handle forced deactivation', async () => {
      const result = await lifecycleManager.deactivateAgent(agentId, { force: true });

      expect(result.status).toBe('inactive');
      expect(mockLogger.info).toHaveBeenCalledWith('Agent force deactivated', {
        agentId
      });
    });

    it('should handle deactivation with cleanup', async () => {
      const cleanupOptions = {
        saveState: true,
        clearCache: true,
        notifyClients: true
      };

      const result = await lifecycleManager.deactivateAgent(agentId, cleanupOptions);

      expect(result.status).toBe('inactive');
      expect(mockDb.insertInto).toHaveBeenCalledWith('agent_states');
      expect(mockLogger.info).toHaveBeenCalledWith('Agent deactivated with cleanup', {
        agentId,
        cleanupOptions
      });
    });

    it('should handle deactivation failures gracefully', async () => {
      mockAgentRegistry.deactivateAgent.mockRejectedValue(new Error('Deactivation failed'));

      await expect(lifecycleManager.deactivateAgent(agentId)).rejects.toThrow('Deactivation failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to deactivate agent', expect.any(Error));
    });
  });

  describe('Agent State Transitions', () => {
    let agentId: string;

    beforeEach(async () => {
      const agent = await lifecycleManager.createAgent({
        type: AgentType.LEARNING,
        name: 'State Transition Agent',
        description: 'Agent for state transition testing',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      });
      agentId = agent.id;
    });

    it('should track valid state transitions', async () => {
      const transitions = [
        { from: 'inactive', to: 'active' },
        { from: 'active', to: 'inactive' },
        { from: 'inactive', to: 'active' },
        { from: 'active', to: 'error' }
      ];

      for (const transition of transitions) {
        const result = await lifecycleManager.transitionAgentState(agentId, transition);
        expect(result.success).toBe(true);
        expect(result.newState).toBe(transition.to);
      }

      expect(mockDb.insertInto).toHaveBeenCalledTimes(transitions.length + 1); // +1 for creation
    });

    it('should reject invalid state transitions', async () => {
      const invalidTransitions = [
        { from: 'active', to: 'active' }, // Same state
        { from: 'inactive', to: 'error' }, // Invalid transition
        { from: 'error', to: 'active' } // Requires recovery first
      ];

      for (const transition of invalidTransitions) {
        await expect(lifecycleManager.transitionAgentState(agentId, transition))
          .rejects.toThrow();
      }
    });

    it('should handle state transition with metadata', async () => {
      const transition = {
        from: 'inactive',
        to: 'active',
        metadata: {
          reason: 'User request',
          priority: 'high',
          initiator: 'system'
        }
      };

      const result = await lifecycleManager.transitionAgentState(agentId, transition);

      expect(result.success).toBe(true);
      expect(result.newState).toBe('active');
      expect(mockLogger.info).toHaveBeenCalledWith('Agent state transition completed', {
        agentId,
        transition,
        duration: expect.any(Number)
      });
    });

    it('should support batch state transitions', async () => {
      const agentIds = [agentId, 'agent-2', 'agent-3'];
      const transitions = agentIds.map(id => ({
        agentId: id,
        transition: { from: 'inactive', to: 'active' }
      }));

      // Mock multiple agents
      mockAgentRegistry.getAgent.mockImplementation((id) => {
        return Promise.resolve({
          id,
          type: AgentType.LEARNING,
          name: `Agent ${id}`,
          description: 'Test Agent',
          systemPrompt: 'Test',
          tools: [],
          modelConfig: { provider: 'openai', model: 'gpt-4' },
          status: 'inactive',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      });

      const results = await lifecycleManager.batchTransitionStates(transitions);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.newState).toBe('active');
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Batch state transitions completed', {
        totalTransitions: 3,
        successful: 3,
        failed: 0
      });
    });
  });

  describe('Agent Deletion', () => {
    let agentId: string;

    beforeEach(async () => {
      const agent = await lifecycleManager.createAgent({
        type: AgentType.LEARNING,
        name: 'Deletion Test Agent',
        description: 'Agent for deletion testing',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      });
      agentId = agent.id;
    });

    it('should delete agent successfully', async () => {
      const result = await lifecycleManager.deleteAgent(agentId);

      expect(result.success).toBe(true);
      expect(mockAgentRegistry.deleteAgent).toHaveBeenCalledWith(agentId);
      expect(mockLogger.info).toHaveBeenCalledWith('Agent deleted successfully', {
        agentId,
        deletionOptions: {}
      });
    });

    it('should handle deletion with archival', async () => {
      const archivalOptions = {
        archiveData: true,
        retainHistory: true,
        backupLocation: '/backups/agents'
      };

      const result = await lifecycleManager.deleteAgent(agentId, archivalOptions);

      expect(result.success).toBe(true);
      expect(mockDb.insertInto).toHaveBeenCalledWith('agent_archives');
      expect(mockLogger.info).toHaveBeenCalledWith('Agent archived before deletion', {
        agentId,
        archivalOptions
      });
    });

    it('should reject deletion of active agent', async () => {
      await lifecycleManager.activateAgent(agentId);

      await expect(lifecycleManager.deleteAgent(agentId)).rejects.toThrow('Cannot delete active agent');

      expect(mockAgentRegistry.deleteAgent).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('Attempted to delete active agent', {
        agentId
      });
    });

    it('should handle forced deletion of active agent', async () => {
      await lifecycleManager.activateAgent(agentId);

      const result = await lifecycleManager.deleteAgent(agentId, { force: true });

      expect(result.success).toBe(true);
      expect(mockAgentRegistry.deactivateAgent).toHaveBeenCalled();
      expect(mockAgentRegistry.deleteAgent).toHaveBeenCalledWith(agentId);
      expect(mockLogger.info).toHaveBeenCalledWith('Agent force deleted', {
        agentId
      });
    });

    it('should handle deletion of non-existent agent', async () => {
      const result = await lifecycleManager.deleteAgent('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Agent not found');
      expect(mockLogger.warn).toHaveBeenCalledWith('Attempted to delete non-existent agent', {
        agentId: 'non-existent-id'
      });
    });
  });

  describe('Lifecycle Event Tracking', () => {
    let agentId: string;

    beforeEach(async () => {
      const agent = await lifecycleManager.createAgent({
        type: AgentType.LEARNING,
        name: 'Event Tracking Agent',
        description: 'Agent for event tracking',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      });
      agentId = agent.id;
    });

    it('should track all lifecycle events', async () => {
      await lifecycleManager.activateAgent(agentId);
      await lifecycleManager.deactivateAgent(agentId);
      await lifecycleManager.activateAgent(agentId);

      const events = await lifecycleManager.getLifecycleEvents(agentId);

      expect(events).toHaveLength(4); // creation + 3 transitions
      expect(events[0].event).toBe('created');
      expect(events[1].event).toBe('activated');
      expect(events[2].event).toBe('deactivated');
      expect(events[3].event).toBe('activated');

      events.forEach(event => {
        expect(event.agentId).toBe(agentId);
        expect(event.timestamp).toBeDefined();
        expect(event.metadata).toBeDefined();
      });
    });

    it('should provide lifecycle statistics', async () => {
      await lifecycleManager.activateAgent(agentId);
      await lifecycleManager.deactivateAgent(agentId);
      await lifecycleManager.activateAgent(agentId);

      const stats = await lifecycleManager.getLifecycleStatistics(agentId);

      expect(stats.totalEvents).toBe(4);
      expect(stats.activations).toBe(2);
      expect(stats.deactivations).toBe(1);
      expect(stats.totalActiveTime).toBeGreaterThan(0);
      expect(stats.averageActiveSessionDuration).toBeGreaterThan(0);
    });

    it('should support event filtering', async () => {
      await lifecycleManager.activateAgent(agentId);
      await lifecycleManager.deactivateAgent(agentId);

      const activationEvents = await lifecycleManager.getLifecycleEvents(agentId, {
        eventType: 'activated'
      });

      expect(activationEvents).toHaveLength(1);
      expect(activationEvents[0].event).toBe('activated');

      const recentEvents = await lifecycleManager.getLifecycleEvents(agentId, {
        limit: 2,
        offset: 0
      });

      expect(recentEvents).toHaveLength(2);
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle lifecycle operations within performance thresholds', async () => {
      const agentConfig = {
        type: AgentType.LEARNING,
        name: 'Performance Test Agent',
        description: 'Agent for performance testing',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      };

      const startTime = performance.now();
      const agent = await lifecycleManager.createAgent(agentConfig);
      const createDuration = performance.now() - startTime;

      expect(createDuration).toBeLessThan(100); // Sub-100ms creation

      const activationStart = performance.now();
      await lifecycleManager.activateAgent(agent.id);
      const activationDuration = performance.now() - activationStart;

      expect(activationDuration).toBeLessThan(50); // Sub-50ms activation
    });

    it('should handle concurrent lifecycle operations', async () => {
      const agentConfigs = Array.from({ length: 5 }, (_, i) => ({
        type: AgentType.LEARNING,
        name: `Concurrent Agent ${i}`,
        description: `Agent ${i} for concurrent testing`,
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      }));

      const startTime = performance.now();

      // Create agents concurrently
      const createPromises = agentConfigs.map(config =>
        lifecycleManager.createAgent(config)
      );
      const agents = await Promise.all(createPromises);

      // Activate agents concurrently
      const activationPromises = agents.map(agent =>
        lifecycleManager.activateAgent(agent.id)
      );
      const activatedAgents = await Promise.all(activationPromises);

      const duration = performance.now() - startTime;

      expect(agents).toHaveLength(5);
      expect(activatedAgents).toHaveLength(5);
      expect(duration).toBeLessThan(500); // All operations within 500ms

      // Verify all agents are active
      activatedAgents.forEach(agent => {
        expect(agent.status).toBe('active');
      });
    });

    it('should maintain data consistency during failures', async () => {
      const agentConfig = {
        type: AgentType.LEARNING,
        name: 'Consistency Test Agent',
        description: 'Agent for consistency testing',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      };

      // Mock partial failure in registry
      mockAgentRegistry.registerAgent.mockResolvedValue({
        id: 'test-agent-id',
        type: AgentType.LEARNING,
        name: 'Consistency Test Agent',
        description: 'Test Description',
        systemPrompt: 'Test Prompt',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' },
        status: 'inactive',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      // Mock database failure for lifecycle events
      mockDb.insertInto.mockRejectedValue(new Error('Database error'));

      await expect(lifecycleManager.createAgent(agentConfig)).rejects.toThrow('Database error');

      // Verify registry was called but agent should be rolled back or marked as inconsistent
      expect(mockAgentRegistry.registerAgent).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to create agent', expect.any(Error));
    });

    it('should handle resource exhaustion gracefully', async () => {
      // Mock resource exhaustion
      mockDb.transaction.mockRejectedValue(new Error('Resource exhausted'));

      const agentConfig = {
        type: AgentType.LEARNING,
        name: 'Resource Test Agent',
        description: 'Agent for resource testing',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      };

      await expect(lifecycleManager.createAgent(agentConfig)).rejects.toThrow('Resource exhausted');

      expect(mockLogger.error).toHaveBeenCalledWith('Resource exhaustion during agent creation', expect.any(Error));
    });
  });

  describe('Integration with AsyncLocalStorage', () => {
    it('should maintain context across lifecycle operations', async () => {
      const agentConfig = {
        type: AgentType.LEARNING,
        name: 'Context Test Agent',
        description: 'Agent for context testing',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      };

      let contextId: string | undefined;

      await lifecycleManager.runWithContext('lifecycle-test', async () => {
        contextId = mockAls.getStore()?.get('correlationId');

        const agent = await lifecycleManager.createAgent(agentConfig);
        await lifecycleManager.activateAgent(agent.id);
        await lifecycleManager.deactivateAgent(agent.id);

        expect(agent.id).toBeDefined();
      });

      expect(contextId).toBeDefined();
      expect(mockAls.run).toHaveBeenCalled();
    });

    it('should preserve context across state transitions', async () => {
      const agentConfig = {
        type: AgentType.LEARNING,
        name: 'Transition Context Agent',
        description: 'Agent for transition context testing',
        systemPrompt: 'You are helpful.',
        tools: [],
        modelConfig: { provider: 'openai', model: 'gpt-4' }
      };

      const agent = await lifecycleManager.createAgent(agentConfig);

      await lifecycleManager.runWithContext('state-transition', async () => {
        await lifecycleManager.transitionAgentState(agent.id, {
          from: 'inactive',
          to: 'active'
        });
      });

      expect(mockAls.run).toHaveBeenCalledTimes(2); // Once for creation, once for transition
    });
  });
});