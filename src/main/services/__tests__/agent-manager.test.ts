/**
 * Agent Manager Service Tests
 *
 * Unit tests for the main thread agent manager service.
 * Tests agent registration, execution, streaming, and lifecycle management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentManagerMain } from '@/main/services/agents/agent-manager';
import { ToolExecutorService } from '@/main/services/tool-executor';
import { LoggerFactory } from '@/main/services/logger';
import { ServiceConfigManager } from '@/main/services/config';
import { TestUtils, mockElectron, createMockDatabase } from '@/test/setup/main-process/setup';


// Mock the LangChainProviderAdapter
vi.mock('@/main/services/concept-parsing/langchain-adapter', () => ({
  LangChainProviderAdapter: {
    createModel: vi.fn().mockResolvedValue({
      invoke: async () => ({ content: 'Mock AI response' }),
      getModelInfo: () => ({ modelId: 'mock-model', provider: 'mock' })
    })
  }
}));

// Create mock concept pipeline instance
const mockConceptPipeline = {
  processContent: vi.fn().mockResolvedValue({
    concepts: [{ id: '1', name: 'Test Concept', type: 'concept' }],
    relationships: [],
    statistics: { totalConcepts: 1, totalRelationships: 0, processingTime: 100, confidence: 0.8 },
    success: true,
    errors: []
  })
};

// Mock the ConceptProcessingPipeline
vi.mock('@/main/services/concept-parsing', () => ({
  ConceptProcessingPipeline: vi.fn().mockImplementation(() => mockConceptPipeline)
}));

describe('AgentManagerMain', () => {
  let agentManager: AgentManagerMain;
  let toolExecutor: ToolExecutorService;
  let mockDependencies: any;

  beforeEach(() => {
    // Set up test dependencies
    const loggerFactory = LoggerFactory.getInstance();
    const logger = loggerFactory.createContextAwareLogger();
    const config = ServiceConfigManager.getInstance();
    const als = loggerFactory.getAsyncLocalStorage();

    mockDependencies = {
      database: createMockDatabase(),
      als,
      logger,
      config: config.getConfig()
    };

    toolExecutor = new ToolExecutorService(mockDependencies);
    agentManager = new AgentManagerMain(mockDependencies, toolExecutor);
  });

  afterEach(() => {
    if (agentManager) {
      agentManager.dispose();
    }
    if (toolExecutor) {
      toolExecutor.dispose();
    }
  });

  describe('Agent Registration', () => {
    it('should register agents successfully', () => {
      const agentConfig = TestUtils.createMockAgentConfig('test-agent', 'concept-parser');

      expect(() => agentManager.registerAgent(agentConfig)).not.toThrow();
      expect(agentManager.getAgent('test-agent')).toEqual(agentConfig);
    });

    it('should throw error when registering duplicate agent', () => {
      const agentConfig = TestUtils.createMockAgentConfig('duplicate-agent', 'concept-parser');

      agentManager.registerAgent(agentConfig);

      expect(() => agentManager.registerAgent(agentConfig)).toThrow('already registered');
    });

    it('should unregister agents', () => {
      const agentConfig = TestUtils.createMockAgentConfig('temp-agent', 'concept-parser');

      agentManager.registerAgent(agentConfig);
      expect(agentManager.getAgent('temp-agent')).toBeDefined();

      agentManager.unregisterAgent('temp-agent');
      expect(agentManager.getAgent('temp-agent')).toBeUndefined();
    });

    it('should list all registered agents', () => {
      const agent1 = TestUtils.createMockAgentConfig('agent-1', 'concept-parser');
      const agent2 = TestUtils.createMockAgentConfig('agent-2', 'chat-agent');

      agentManager.registerAgent(agent1);
      agentManager.registerAgent(agent2);

      const agents = agentManager.getRegisteredAgents();
      expect(agents).toHaveLength(2);
      expect(agents.map(a => a.id)).toContain('agent-1');
      expect(agents.map(a => a.id)).toContain('agent-2');
    });
  });

  describe('Agent Execution', () => {
    beforeEach(() => {
      const agentConfig = TestUtils.createMockAgentConfig('test-concept-parser', 'concept-parser');
      agentManager.registerAgent(agentConfig);
    });

    it('should execute concept parser agent successfully', async () => {
      const request = {
        agentId: 'test-concept-parser',
        input: 'Test content for concept parsing',
        context: TestUtils.createMockContext('test-session', 'concept-parsing'),
        options: { stream: false }
      };

      const result = agentManager.executeAgent(request);
      const chunks = [];

      for await (const chunk of result) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].type).toBe('start');

      // Find data chunk
      const dataChunk = chunks.find(chunk => chunk.type === 'data');
      expect(dataChunk).toBeDefined();
      expect(dataChunk?.content).toHaveProperty('concepts');
      expect(dataChunk?.content).toHaveProperty('relationships');

      // Find complete chunk
      const completeChunk = chunks.find(chunk => chunk.type === 'complete');
      expect(completeChunk).toBeDefined();
      expect(completeChunk?.content).toHaveProperty('agentId', 'test-concept-parser');
    });

    it('should handle streaming agent execution', async () => {
      const request = {
        agentId: 'test-concept-parser',
        input: 'Test content for streaming',
        context: TestUtils.createMockContext('test-session', 'streaming'),
        options: { stream: true }
      };

      const result = agentManager.executeAgent(request);
      const chunks = [];

      for await (const chunk of result) {
        chunks.push(chunk);
      }

      expect(chunks.some(chunk => chunk.type === 'progress')).toBe(true);
      expect(chunks.some(chunk => chunk.type === 'data')).toBe(true);
      expect(chunks.some(chunk => chunk.type === 'complete')).toBe(true);
    });

    it('should throw error for non-existent agent', async () => {
      const request = {
        agentId: 'non-existent-agent',
        input: 'Test input',
        context: TestUtils.createMockContext(),
        options: {}
      };

      await expect(agentManager.executeAgent(request)).rejects.toThrow('not found');
    });

    it('should throw error for disabled agent', async () => {
      const disabledAgent = TestUtils.createMockAgentConfig('disabled-agent', 'concept-parser');
      disabledAgent.enabled = false;

      agentManager.registerAgent(disabledAgent);

      const request = {
        agentId: 'disabled-agent',
        input: 'Test input',
        context: TestUtils.createMockContext(),
        options: {}
      };

      await expect(agentManager.executeAgent(request)).rejects.toThrow('disabled');
    });
  });

  describe('Execution Management', () => {
    beforeEach(() => {
      const agentConfig = TestUtils.createMockAgentConfig('test-agent', 'concept-parser');
      agentManager.registerAgent(agentConfig);
    });

    it('should track active executions', async () => {
      const request = {
        agentId: 'test-agent',
        input: 'Test content',
        context: TestUtils.createMockContext(),
        options: { stream: false }
      };

      // Start execution but don't await completion
      const executionPromise = agentManager.executeAgent(request);

      // Check if execution is tracked
      const activeExecutions = agentManager.getActiveExecutions();
      expect(activeExecutions.length).toBeGreaterThan(0);

      // Complete the execution
      const result = [];
      for await (const chunk of executionPromise) {
        result.push(chunk);
      }

      // Execution should be cleaned up after completion
      await TestUtils.waitFor(100);
      const finalExecutions = agentManager.getActiveExecutions();
      expect(finalExecutions.length).toBe(0);
    });

    it('should cancel active executions', async () => {
      const request = {
        agentId: 'test-agent',
        input: 'Test content',
        context: TestUtils.createMockContext(),
        options: { stream: true }
      };

      // Start execution
      const executionPromise = agentManager.executeAgent(request);
      const executionId = request.context.id;

      // Cancel execution
      const cancelResult = agentManager.cancelExecution(executionId);
      expect(cancelResult).toBe(true);

      // Try to consume chunks - should be cancelled
      const chunks = [];
      try {
        for await (const chunk of executionPromise) {
          chunks.push(chunk);
          break; // Stop after first chunk
        }
      } catch (error) {
        // Expected due to cancellation
      }

      // Check execution status
      const status = agentManager.getExecutionStatus(executionId);
      expect(status.found).toBe(false);
    });

    it('should provide execution status', async () => {
      const request = {
        agentId: 'test-agent',
        input: 'Test content',
        context: TestUtils.createMockContext(),
        options: { stream: false }
      };

      const executionId = request.context.id;

      // Start execution
      const executionPromise = agentManager.executeAgent(request);

      // Check status
      let status = agentManager.getExecutionStatus(executionId);
      expect(status.found).toBe(true);
      expect(status.execution).toBeDefined();
      expect(status.execution?.agentId).toBe('test-agent');

      // Complete execution
      for await (const chunk of executionPromise) {
        // Consume all chunks
      }

      // Check final status
      status = agentManager.getExecutionStatus(executionId);
      expect(status.found).toBe(false);
    });
  });

  describe('Agent Types', () => {
    it('should handle chat-agent execution', async () => {
      const chatAgent = TestUtils.createMockAgentConfig('chat-agent', 'chat-agent');
      agentManager.registerAgent(chatAgent);

      const request = {
        agentId: 'chat-agent',
        input: 'Hello, how are you?',
        context: TestUtils.createMockContext(),
        options: { stream: false }
      };

      const result = agentManager.executeAgent(request);
      const chunks = [];

      for await (const chunk of result) {
        chunks.push(chunk);
      }

      expect(chunks.some(chunk => chunk.type === 'data')).toBe(true);

      const dataChunk = chunks.find(chunk => chunk.type === 'data');
      expect(dataChunk?.content).toHaveProperty('message');
      expect(dataChunk?.content).toHaveProperty('type', 'ai_response');
    });

    it('should handle learning-coach agent (placeholder)', async () => {
      const coachAgent = TestUtils.createMockAgentConfig('coach-agent', 'learning-coach');
      agentManager.registerAgent(coachAgent);

      const request = {
        agentId: 'coach-agent',
        input: 'Help me learn TypeScript',
        context: TestUtils.createMockContext(),
        options: { stream: false }
      };

      const result = agentManager.executeAgent(request);
      const chunks = [];

      for await (const chunk of result) {
        chunks.push(chunk);
      }

      expect(chunks.some(chunk => chunk.type === 'data')).toBe(true);

      const dataChunk = chunks.find(chunk => chunk.type === 'data');
      expect(dataChunk?.content).toHaveProperty('message');
      expect(dataChunk?.content).toHaveProperty('type', 'not_implemented');
    });

    it('should handle content-discoverer agent (placeholder)', async () => {
      const discovererAgent = TestUtils.createMockAgentConfig('discoverer-agent', 'content-discoverer');
      agentManager.registerAgent(discovererAgent);

      const request = {
        agentId: 'discoverer-agent',
        input: 'Find learning resources',
        context: TestUtils.createMockContext(),
        options: { stream: false }
      };

      const result = agentManager.executeAgent(request);
      const chunks = [];

      for await (const chunk of result) {
        chunks.push(chunk);
      }

      expect(chunks.some(chunk => chunk.type === 'data')).toBe(true);

      const dataChunk = chunks.find(chunk => chunk.type === 'data');
      expect(dataChunk?.content).toHaveProperty('message');
      expect(dataChunk?.content).toHaveProperty('type', 'not_implemented');
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide agent manager statistics', () => {
      const agent1 = TestUtils.createMockAgentConfig('agent-1', 'concept-parser');
      const agent2 = TestUtils.createMockAgentConfig('agent-2', 'chat-agent');
      agent2.enabled = false; // Disabled agent

      agentManager.registerAgent(agent1);
      agentManager.registerAgent(agent2);

      const stats = agentManager.getStats();

      expect(stats).toHaveProperty('totalAgents', 2);
      expect(stats).toHaveProperty('enabledAgents', 1);
      expect(stats).toHaveProperty('activeExecutions', 0);
      expect(stats).toHaveProperty('agentTypes');
      expect(stats.agentTypes['concept-parser']).toBe(1);
      expect(stats.agentTypes['chat-agent']).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle execution errors gracefully', async () => {
      const agentConfig = TestUtils.createMockAgentConfig('error-agent', 'concept-parser');
      agentManager.registerAgent(agentConfig);

      // Mock the concept pipeline to throw an error
      mockConceptPipeline.processContent = async () => {
        throw new Error('Test execution error');
      };

      const request = {
        agentId: 'error-agent',
        input: 'Test content',
        context: TestUtils.createMockContext(),
        options: { stream: false }
      };

      const result = agentManager.executeAgent(request);
      const chunks = [];

      for await (const chunk of result) {
        chunks.push(chunk);
      }

      expect(chunks.some(chunk => chunk.type === 'error')).toBe(true);

      const errorChunk = chunks.find(chunk => chunk.type === 'error');
      expect(errorChunk?.content).toHaveProperty('error');
      expect(errorChunk?.content.error).toContain('Test execution error');
    });
  });
});