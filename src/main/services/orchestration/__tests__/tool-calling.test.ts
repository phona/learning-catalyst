/**
 * Tool Calling Orchestration Test Suite
 *
 * Comprehensive test suite for Tool Calling orchestration pattern covering
 * tool selection, execution, result aggregation, error handling, and performance
 * optimization for multi-agent systems.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToolCallingOrchestrator } from '@/services/orchestration/tool-calling-orchestrator';
import { AgentType } from '../../agents/types';
import type { Agent, ToolExecutionResult } from '@/services/orchestration/types';
import { createMockLogger, createMockDatabase, createMockAsyncLocalStorage } from '@/test/mocks';

// Mock tools for testing
const mockTools = {
  'concept-parser': {
    name: 'concept-parser',
    description: 'Parse and analyze concepts from text',
    execute: vi.fn().mockResolvedValue({
      success: true,
      concepts: ['machine learning', 'neural networks'],
      relationships: [['machine learning', 'subset of', 'AI']]
    })
  },
  'knowledge-graph': {
    name: 'knowledge-graph',
    description: 'Build and query knowledge graphs',
    execute: vi.fn().mockResolvedValue({
      success: true,
      nodes: 5,
      edges: 8,
      graph: { nodes: [], edges: [] }
    })
  },
  'quiz-generator': {
    name: 'quiz-generator',
    description: 'Generate quizzes based on content',
    execute: vi.fn().mockResolvedValue({
      success: true,
      questions: [
        { question: 'What is machine learning?', type: 'multiple-choice' }
      ],
      difficulty: 'medium'
    })
  },
  'session-search': {
    name: 'session-search',
    description: 'Search previous learning sessions',
    execute: vi.fn().mockResolvedValue({
      success: true,
      sessions: [
        { id: 'session-1', title: 'ML Basics', relevance: 0.9 }
      ],
      total: 1
    })
  },
  'error-tool': {
    name: 'error-tool',
    description: 'Tool that always fails',
    execute: vi.fn().mockRejectedValue(new Error('Tool execution failed'))
  }
};

describe('ToolCallingOrchestrator', () => {
  let orchestrator: ToolCallingOrchestrator;
  let mockDb: any;
  let mockLogger: any;
  let mockAls: any;
  let mockAgents: Agent[];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup comprehensive mocks
    mockDb = createMockDatabase();
    mockLogger = createMockLogger();
    mockAls = createMockAsyncLocalStorage();

    // Create mock agents
    mockAgents = [
      {
        id: 'learning-agent',
        type: AgentType.LEARNING,
        name: 'Learning Assistant',
        capabilities: ['concept-analysis', 'knowledge-building'],
        tools: ['concept-parser', 'knowledge-graph'],
        status: 'active',
        config: {
          model: 'gpt-4',
          temperature: 0.7,
          maxTools: 3
        }
      },
      {
        id: 'assessment-agent',
        type: AgentType.ASSESSMENT,
        name: 'Assessment Assistant',
        capabilities: ['quiz-generation', 'evaluation'],
        tools: ['quiz-generator'],
        status: 'active',
        config: {
          model: 'gpt-4',
          temperature: 0.3,
          maxTools: 2
        }
      },
      {
        id: 'practice-agent',
        type: AgentType.PRACTICE,
        name: 'Practice Assistant',
        capabilities: ['exercise-creation'],
        tools: ['session-search', 'quiz-generator'],
        status: 'active',
        config: {
          model: 'gpt-3.5-turbo',
          temperature: 0.5,
          maxTools: 4
        }
      }
    ];

    // Create ToolCallingOrchestrator instance
    orchestrator = new ToolCallingOrchestrator(
      mockDb,
      mockLogger,
      mockAls,
      mockTools
    );

    // Setup default mock behaviors
    mockDb.transaction.mockImplementation(async (fn) => {
      return fn(mockDb);
    });

    mockLogger.info.mockReturnValue(undefined);
    mockLogger.error.mockReturnValue(undefined);
    mockLogger.warn.mockReturnValue(undefined);
    mockLogger.debug.mockReturnValue(undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (orchestrator) {
      await orchestrator.dispose();
    }
  });

  describe('Tool Selection and Planning', () => {
    it('should select appropriate tools for learning task', async () => {
      const task = {
        type: 'concept-analysis',
        input: 'Explain machine learning and neural networks',
        context: {
          sessionId: 'session-123',
          userLevel: 'beginner'
        }
      };

      const plan = await orchestrator.createToolExecutionPlan(task, mockAgents);

      expect(plan.tools).toHaveLength(2);
      expect(plan.tools.map(t => t.name)).toContain('concept-parser');
      expect(plan.tools.map(t => t.name)).toContain('knowledge-graph');
      expect(plan.executionOrder).toEqual(['concept-parser', 'knowledge-graph']);
      expect(plan.dependencies).toBeDefined();
      expect(plan.estimatedDuration).toBeGreaterThan(0);

      expect(mockLogger.info).toHaveBeenCalledWith('Tool execution plan created', {
        taskType: task.type,
        toolCount: 2,
        estimatedDuration: plan.estimatedDuration
      });
    });

    it('should select tools for assessment task', async () => {
      const task = {
        type: 'quiz-generation',
        input: 'Create a quiz about neural networks',
        context: {
          difficulty: 'medium',
          questionCount: 5
        }
      };

      const plan = await orchestrator.createToolExecutionPlan(task, mockAgents);

      expect(plan.tools).toHaveLength(1);
      expect(plan.tools[0].name).toBe('quiz-generator');
      expect(plan.assignedAgent).toBe('assessment-agent');
    });

    it('should handle complex task requiring multiple agents', async () => {
      const task = {
        type: 'comprehensive-learning',
        input: 'Learn Python programming basics and create practice exercises',
        context: {
          userLevel: 'beginner',
          includeAssessment: true,
          sessionId: 'session-456'
        }
      };

      const plan = await orchestrator.createToolExecutionPlan(task, mockAgents);

      expect(plan.tools.length).toBeGreaterThan(2);
      expect(plan.tools.some(t => t.name === 'concept-parser')).toBe(true);
      expect(plan.tools.some(t => t.name === 'quiz-generator')).toBe(true);

      // Verify tool assignment to appropriate agents
      const learningAgentTools = plan.tools.filter(t => t.assignedAgent === 'learning-agent');
      const assessmentAgentTools = plan.tools.filter(t => t.assignedAgent === 'assessment-agent');

      expect(learningAgentTools.length).toBeGreaterThan(0);
      expect(assessmentAgentTools.length).toBeGreaterThan(0);
    });

    it('should optimize tool selection based on agent capabilities', async () => {
      const task = {
        type: 'knowledge-building',
        input: 'Build knowledge graph for data science concepts'
      };

      const plan = await orchestrator.createToolExecutionPlan(task, mockAgents);

      // Should prioritize learning agent for knowledge building
      const learningAgentAssignments = plan.tools.filter(t => t.assignedAgent === 'learning-agent');
      expect(learningAgentAssignments.length).toBeGreaterThan(0);

      // Should respect agent tool limits
      const agentToolCounts = plan.tools.reduce((acc, tool) => {
        acc[tool.assignedAgent] = (acc[tool.assignedAgent] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(agentToolCounts).forEach(([agentId, count]) => {
        const agent = mockAgents.find(a => a.id === agentId);
        expect(count).toBeLessThanOrEqual(agent?.config.maxTools || 10);
      });
    });

    it('should handle task with no available tools', async () => {
      const task = {
        type: 'unsupported-task',
        input: 'Perform an unsupported operation'
      };

      const plan = await orchestrator.createToolExecutionPlan(task, mockAgents);

      expect(plan.tools).toHaveLength(0);
      expect(plan.error).toContain('No suitable tools found');

      expect(mockLogger.warn).toHaveBeenCalledWith('No suitable tools found for task', {
        taskType: task.type,
        availableTools: Object.keys(mockTools)
      });
    });

    it('should handle tool selection with dependencies', async () => {
      const task = {
        type: 'dependent-analysis',
        input: 'Analyze concepts and then generate quiz'
      };

      // Mock tool with dependencies
      const toolsWithDeps = {
        ...mockTools,
        'dependent-quiz': {
          name: 'dependent-quiz',
          description: 'Generate quiz based on concept analysis',
          dependencies: ['concept-parser'],
          execute: vi.fn().mockResolvedValue({
            success: true,
            questions: []
          })
        }
      };

      const orchestratorWithDeps = new ToolCallingOrchestrator(
        mockDb,
        mockLogger,
        mockAls,
        toolsWithDeps
      );

      const plan = await orchestratorWithDeps.createToolExecutionPlan(task, mockAgents);

      expect(plan.tools.some(t => t.name === 'dependent-quiz')).toBe(true);
      expect(plan.dependencies['dependent-quiz']).toContain('concept-parser');
      expect(plan.executionOrder.indexOf('concept-parser')).toBeLessThan(
        plan.executionOrder.indexOf('dependent-quiz')
      );

      await orchestratorWithDeps.dispose();
    });
  });

  describe('Tool Execution', () => {
    it('should execute single tool successfully', async () => {
      const toolExecution = {
        name: 'concept-parser',
        agent: 'learning-agent',
        parameters: {
          content: 'Machine learning is a subset of AI',
          extractRelationships: true
        }
      };

      const result = await orchestrator.executeTool(toolExecution);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output.concepts).toContain('machine learning');
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.agentId).toBe('learning-agent');

      expect(mockTools['concept-parser'].execute).toHaveBeenCalledWith(toolExecution.parameters);
      expect(mockLogger.info).toHaveBeenCalledWith('Tool executed successfully', {
        toolName: 'concept-parser',
        agentId: 'learning-agent',
        executionTime: result.executionTime
      });
    });

    it('should execute multiple tools in sequence', async () => {
      const toolExecutions = [
        {
          name: 'concept-parser',
          agent: 'learning-agent',
          parameters: { content: 'Neural networks are amazing' }
        },
        {
          name: 'knowledge-graph',
          agent: 'learning-agent',
          parameters: { concepts: ['neural networks'] }
        }
      ];

      const results = await orchestrator.executeToolsSequentially(toolExecutions);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[1].input).toBeDefined(); // Should use output from first tool

      expect(mockTools['concept-parser'].execute).toHaveBeenCalled();
      expect(mockTools['knowledge-graph'].execute).toHaveBeenCalled();
    });

    it('should execute tools in parallel when possible', async () => {
      const toolExecutions = [
        {
          name: 'concept-parser',
          agent: 'learning-agent',
          parameters: { content: 'AI concepts' }
        },
        {
          name: 'session-search',
          agent: 'practice-agent',
          parameters: { query: 'machine learning' }
        }
      ];

      const startTime = performance.now();
      const results = await orchestrator.executeToolsParallel(toolExecutions);
      const duration = performance.now() - startTime;

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);

      // Parallel execution should be faster than sequential
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      expect(mockLogger.info).toHaveBeenCalledWith('Parallel tool execution completed', {
        toolCount: 2,
        duration: expect.any(Number),
        successCount: 2
      });
    });

    it('should handle tool execution failures gracefully', async () => {
      const toolExecution = {
        name: 'error-tool',
        agent: 'learning-agent',
        parameters: { input: 'trigger error' }
      };

      const result = await orchestrator.executeTool(toolExecution);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool execution failed');
      expect(result.executionTime).toBeGreaterThan(0);

      expect(mockLogger.error).toHaveBeenCalledWith('Tool execution failed', {
        toolName: 'error-tool',
        agentId: 'learning-agent',
        error: expect.any(Error)
      });
    });

    it('should continue execution after tool failure with fallback', async () => {
      const toolExecutions = [
        {
          name: 'error-tool',
          agent: 'learning-agent',
          parameters: { input: 'trigger error' }
        },
        {
          name: 'concept-parser',
          agent: 'learning-agent',
          parameters: { content: 'Fallback content' }
        }
      ];

      const results = await orchestrator.executeToolsSequentially(toolExecutions, {
        continueOnFailure: true,
        fallbackStrategy: 'skip'
      });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);

      expect(mockLogger.warn).toHaveBeenCalledWith('Tool failed, continuing with next tool', {
        toolName: 'error-tool',
        strategy: 'skip'
      });
    });

    it('should handle tool timeouts', async () => {
      const slowTool = {
        name: 'slow-tool',
        description: 'Tool that takes too long',
        execute: vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
          return { success: true, data: 'slow result' };
        })
      };

      const toolsWithTimeout = { ...mockTools, 'slow-tool': slowTool };
      const orchestratorWithTimeout = new ToolCallingOrchestrator(
        mockDb,
        mockLogger,
        mockAls,
        toolsWithTimeout
      );

      const toolExecution = {
        name: 'slow-tool',
        agent: 'learning-agent',
        parameters: {}
      };

      const result = await orchestratorWithTimeout.executeTool(toolExecution, {
        timeout: 1000 // 1 second timeout
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');

      await orchestratorWithTimeout.dispose();
    });

    it('should handle tool parameter validation', async () => {
      const toolExecution = {
        name: 'concept-parser',
        agent: 'learning-agent',
        parameters: {
          content: null, // Invalid parameter
          extractRelationships: 'invalid' // Invalid type
        }
      };

      const result = await orchestrator.executeTool(toolExecution);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid parameters');

      expect(mockLogger.warn).toHaveBeenCalledWith('Tool parameter validation failed', {
        toolName: 'concept-parser',
        validationErrors: expect.any(Array)
      });
    });
  });

  describe('Result Aggregation and Processing', () => {
    it('should aggregate results from multiple tools', async () => {
      const toolResults = [
        {
          toolName: 'concept-parser',
          success: true,
          output: {
            concepts: ['machine learning', 'neural networks'],
            relationships: [['machine learning', 'uses', 'neural networks']]
          },
          agentId: 'learning-agent',
          executionTime: 150
        },
        {
          toolName: 'knowledge-graph',
          success: true,
          output: {
            nodes: 2,
            edges: 1,
            graph: { nodes: [], edges: [] }
          },
          agentId: 'learning-agent',
          executionTime: 200
        }
      ];

      const aggregated = await orchestrator.aggregateResults(toolResults);

      expect(aggregated.success).toBe(true);
      expect(aggregated.results).toHaveLength(2);
      expect(aggregated.summary).toBeDefined();
      expect(aggregated.summary.totalTools).toBe(2);
      expect(aggregated.summary.successfulTools).toBe(2);
      expect(aggregated.summary.totalExecutionTime).toBe(350);
      expect(aggregated.combinedOutput).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Tool results aggregated successfully', {
        toolCount: 2,
        successCount: 2,
        totalExecutionTime: 350
      });
    });

    it('should handle partial success aggregation', async () => {
      const toolResults = [
        {
          toolName: 'concept-parser',
          success: true,
          output: { concepts: ['AI'] },
          agentId: 'learning-agent',
          executionTime: 100
        },
        {
          toolName: 'error-tool',
          success: false,
          error: 'Tool failed',
          agentId: 'assessment-agent',
          executionTime: 50
        },
        {
          toolName: 'quiz-generator',
          success: true,
          output: { questions: [] },
          agentId: 'assessment-agent',
          executionTime: 200
        }
      ];

      const aggregated = await orchestrator.aggregateResults(toolResults);

      expect(aggregated.success).toBe(false); // Overall failure due to error
      expect(aggregated.results).toHaveLength(3);
      expect(aggregated.summary.successfulTools).toBe(2);
      expect(aggregated.summary.failedTools).toBe(1);
      expect(aggregated.errors).toHaveLength(1);

      expect(mockLogger.warn).toHaveBeenCalledWith('Partial success in tool execution', {
        successCount: 2,
        failureCount: 1,
        totalTools: 3
      });
    });

    it('should format combined output intelligently', async () => {
      const toolResults = [
        {
          toolName: 'concept-parser',
          success: true,
          output: {
            concepts: ['machine learning'],
            definitions: { 'machine learning': 'Field of AI' }
          },
          agentId: 'learning-agent',
          executionTime: 100
        },
        {
          toolName: 'quiz-generator',
          success: true,
          output: {
            questions: [
              { question: 'What is machine learning?', options: [] }
            ]
          },
          agentId: 'assessment-agent',
          executionTime: 150
        }
      ];

      const aggregated = await orchestrator.aggregateResults(toolResults, {
        outputFormat: 'structured',
        includeMetadata: true
      });

      expect(aggregated.combinedOutput).toHaveProperty('concepts');
      expect(aggregated.combinedOutput).toHaveProperty('quiz');
      expect(aggregated.combinedOutput.concepts).toEqual(['machine learning']);
      expect(aggregated.combinedOutput.quiz).toHaveLength(1);
      expect(aggregated.metadata).toBeDefined();
    });

    it('should handle conflicting results from multiple tools', async () => {
      const toolResults = [
        {
          toolName: 'tool-1',
          success: true,
          output: { result: 'value-A', confidence: 0.8 },
          agentId: 'agent-1',
          executionTime: 100
        },
        {
          toolName: 'tool-2',
          success: true,
          output: { result: 'value-B', confidence: 0.9 },
          agentId: 'agent-2',
          executionTime: 100
        }
      ];

      const aggregated = await orchestrator.aggregateResults(toolResults, {
        conflictResolution: 'highest-confidence'
      });

      expect(aggregated.combinedOutput.result).toBe('value-B'); // Higher confidence wins
      expect(aggregated.combinedOutput.conflicts).toHaveLength(1);
      expect(aggregated.combinedOutput.conflicts[0].resolution).toBe('highest-confidence');
    });

    it('should generate execution summary with metrics', async () => {
      const toolResults = [
        {
          toolName: 'fast-tool',
          success: true,
          output: { data: 'quick result' },
          agentId: 'learning-agent',
          executionTime: 50
        },
        {
          toolName: 'slow-tool',
          success: true,
          output: { data: 'slow result' },
          agentId: 'assessment-agent',
          executionTime: 300
        }
      ];

      const aggregated = await orchestrator.aggregateResults(toolResults, {
        includeMetrics: true
      });

      expect(aggregated.metrics).toBeDefined();
      expect(aggregated.metrics.averageExecutionTime).toBe(175);
      expect(aggregated.metrics.fastestTool).toBe('fast-tool');
      expect(aggregated.metrics.slowestTool).toBe('slow-tool');
      expect(aggregated.metrics.agentDistribution).toEqual({
        'learning-agent': 1,
        'assessment-agent': 1
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle complete tool execution failure', async () => {
      const toolExecutions = [
        {
          name: 'error-tool',
          agent: 'learning-agent',
          parameters: { input: 'error' }
        },
        {
          name: 'non-existent-tool',
          agent: 'assessment-agent',
          parameters: {}
        }
      ];

      const results = await orchestrator.executeToolsSequentially(toolExecutions);

      expect(results.every(r => !r.success)).toBe(true);
      expect(results[0].error).toContain('Tool execution failed');
      expect(results[1].error).toContain('not found');

      expect(mockLogger.error).toHaveBeenCalledTimes(2);
    });

    it('should implement retry logic for transient failures', async () => {
      const flakyTool = {
        name: 'flaky-tool',
        description: 'Tool that fails initially',
        execute: vi.fn()
          .mockRejectedValueOnce(new Error('Temporary failure'))
          .mockResolvedValueOnce({ success: true, data: 'success after retry' })
      };

      const toolsWithFlaky = { ...mockTools, 'flaky-tool': flakyTool };
      const orchestratorWithRetry = new ToolCallingOrchestrator(
        mockDb,
        mockLogger,
        mockAls,
        toolsWithFlaky
      );

      const toolExecution = {
        name: 'flaky-tool',
        agent: 'learning-agent',
        parameters: {}
      };

      const result = await orchestratorWithRetry.executeTool(toolExecution, {
        retryAttempts: 2,
        retryDelay: 100
      });

      expect(result.success).toBe(true);
      expect(result.output.data).toBe('success after retry');
      expect(flakyTool.execute).toHaveBeenCalledTimes(2);

      expect(mockLogger.info).toHaveBeenCalledWith('Tool succeeded after retry', {
        toolName: 'flaky-tool',
        attempt: 2
      });

      await orchestratorWithRetry.dispose();
    });

    it('should handle agent unavailability during execution', async () => {
      const toolExecution = {
        name: 'concept-parser',
        agent: 'unavailable-agent',
        parameters: { content: 'test' }
      };

      const result = await orchestrator.executeTool(toolExecution);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Agent not available');

      expect(mockLogger.warn).toHaveBeenCalledWith('Agent not available for tool execution', {
        toolName: 'concept-parser',
        agentId: 'unavailable-agent'
      });
    });

    it('should provide fallback tools for critical failures', async () => {
      const toolExecution = {
        name: 'error-tool',
        agent: 'learning-agent',
        parameters: { input: 'test' }
      };

      const fallbackConfig = {
        'error-tool': 'concept-parser' // Use concept-parser as fallback
      };

      const result = await orchestrator.executeTool(toolExecution, {
        fallbackTools: fallbackConfig
      });

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.originalTool).toBe('error-tool');
      expect(result.actualTool).toBe('concept-parser');

      expect(mockLogger.info).toHaveBeenCalledWith('Fallback tool executed successfully', {
        originalTool: 'error-tool',
        fallbackTool: 'concept-parser'
      });
    });

    it('should handle cascading failures gracefully', async () => {
      const dependentExecutions = [
        {
          name: 'concept-parser',
          agent: 'learning-agent',
          parameters: { content: 'test content' },
          dependencies: []
        },
        {
          name: 'knowledge-graph',
          agent: 'learning-agent',
          parameters: { concepts: 'dependency-output' },
          dependencies: ['concept-parser']
        }
      ];

      // Mock first tool failure
      mockTools['concept-parser'].execute.mockRejectedValueOnce(new Error('First tool failed'));

      const results = await orchestrator.executeToolsWithDependencies(dependentExecutions);

      expect(results[0].success).toBe(false);
      expect(results[1].skipped).toBe(true);
      expect(results[1].skipReason).toContain('dependency failed');

      expect(mockLogger.warn).toHaveBeenCalledWith('Tool skipped due to dependency failure', {
        toolName: 'knowledge-graph',
        failedDependency: 'concept-parser'
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should optimize execution order based on dependencies', async () => {
      const toolExecutions = [
        {
          name: 'knowledge-graph',
          agent: 'learning-agent',
          parameters: {},
          dependencies: ['concept-parser']
        },
        {
          name: 'concept-parser',
          agent: 'learning-agent',
          parameters: {},
          dependencies: []
        },
        {
          name: 'quiz-generator',
          agent: 'assessment-agent',
          parameters: {},
          dependencies: ['concept-parser']
        }
      ];

      const optimizedPlan = await orchestrator.optimizeExecutionOrder(toolExecutions);

      expect(optimizedPlan[0].name).toBe('concept-parser'); // No dependencies first
      expect(optimizedPlan.slice(1).map(t => t.name)).toContain('knowledge-graph');
      expect(optimizedPlan.slice(1).map(t => t.name)).toContain('quiz-generator');
    });

    it('should batch compatible tools for parallel execution', async () => {
      const toolExecutions = [
        {
          name: 'concept-parser',
          agent: 'learning-agent',
          parameters: { content: 'content-1' }
        },
        {
          name: 'session-search',
          agent: 'practice-agent',
          parameters: { query: 'query-1' }
        },
        {
          name: 'quiz-generator',
          agent: 'assessment-agent',
          parameters: { topic: 'topic-1' }
        }
      ];

      const batches = await orchestrator.createExecutionBatches(toolExecutions);

      expect(batches.length).toBe(1); // All can run in parallel
      expect(batches[0]).toHaveLength(3);

      const results = await orchestrator.executeBatches(batches);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should cache tool results for repeated calls', async () => {
      const toolExecution = {
        name: 'concept-parser',
        agent: 'learning-agent',
        parameters: { content: 'identical content' }
      };

      // First execution
      const result1 = await orchestrator.executeTool(toolExecution, {
        cacheResults: true
      });

      // Second execution with same parameters
      const result2 = await orchestrator.executeTool(toolExecution, {
        cacheResults: true
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result2.fromCache).toBe(true);
      expect(mockTools['concept-parser'].execute).toHaveBeenCalledTimes(1); // Only called once

      expect(mockLogger.debug).toHaveBeenCalledWith('Tool result retrieved from cache', {
        toolName: 'concept-parser',
        cacheKey: expect.any(String)
      });
    });

    it('should monitor and optimize performance metrics', async () => {
      const toolExecutions = Array.from({ length: 5 }, (_, i) => ({
        name: 'concept-parser',
        agent: 'learning-agent',
        parameters: { content: `content-${i}` }
      }));

      const startTime = performance.now();
      const results = await orchestrator.executeToolsParallel(toolExecutions);
      const duration = performance.now() - startTime;

      expect(results).toHaveLength(5);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds

      const performanceMetrics = await orchestrator.getPerformanceMetrics();

      expect(performanceMetrics).toBeDefined();
      expect(performanceMetrics.averageExecutionTime).toBeGreaterThan(0);
      expect(performanceMetrics.toolExecutionCounts).toHaveProperty('concept-parser');
      expect(performanceMetrics.agentPerformance).toHaveProperty('learning-agent');
    });

    it('should handle resource constraints gracefully', async () => {
      const toolExecutions = Array.from({ length: 10 }, (_, i) => ({
        name: 'concept-parser',
        agent: 'learning-agent',
        parameters: { content: `content-${i}` }
      }));

      const results = await orchestrator.executeToolsParallel(toolExecutions, {
        maxConcurrency: 3,
        resourceLimits: {
          memory: 100 * 1024 * 1024, // 100MB
          cpu: 0.8 // 80% CPU usage
        }
      });

      expect(results).toHaveLength(10);
      expect(results.every(r => r.success)).toBe(true);

      // Verify resource constraints were respected
      expect(mockLogger.info).toHaveBeenCalledWith('Resource constraints applied', {
        maxConcurrency: 3,
        memoryLimit: 104857600,
        cpuLimit: 0.8
      });
    });
  });

  describe('Integration and Orchestration', () => {
    it('should orchestrate complete workflow from task to results', async () => {
      const task = {
        type: 'learning-session',
        input: 'Learn about machine learning and create assessment',
        context: {
          userLevel: 'intermediate',
          sessionId: 'session-789',
          includeQuiz: true
        }
      };

      const workflow = await orchestrator.executeTaskWorkflow(task, mockAgents);

      expect(workflow.success).toBe(true);
      expect(workflow.plan).toBeDefined();
      expect(workflow.executionResults).toBeDefined();
      expect(workflow.aggregatedResults).toBeDefined();
      expect(workflow.summary).toBeDefined();

      expect(workflow.plan.tools.length).toBeGreaterThan(1);
      expect(workflow.executionResults.length).toBe(workflow.plan.tools.length);
      expect(workflow.summary.totalTools).toBe(workflow.plan.tools.length);
      expect(workflow.summary.totalDuration).toBeGreaterThan(0);

      expect(mockLogger.info).toHaveBeenCalledWith('Task workflow completed successfully', {
        taskType: task.type,
        toolCount: workflow.plan.tools.length,
        duration: workflow.summary.totalDuration
      });
    });

    it('should handle workflow with conditional tool execution', async () => {
      const task = {
        type: 'adaptive-learning',
        input: 'Adapt learning based on user responses',
        context: {
          userResponses: ['correct', 'incorrect', 'correct'],
          adaptDifficulty: true
        }
      };

      const workflow = await orchestrator.executeTaskWorkflow(task, mockAgents, {
        conditionalExecution: true,
        adaptiveToolSelection: true
      });

      expect(workflow.success).toBe(true);
      expect(workflow.conditionalPaths).toBeDefined();
      expect(workflow.adaptations).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Adaptive workflow completed', {
        adaptationsCount: expect.any(Number),
        conditionalPaths: expect.any(Number)
      });
    });

    it('should provide detailed execution trace', async () => {
      const task = {
        type: 'traceable-task',
        input: 'Task with detailed tracing'
      };

      const workflow = await orchestrator.executeTaskWorkflow(task, mockAgents, {
        enableTracing: true,
        traceLevel: 'detailed'
      });

      expect(workflow.trace).toBeDefined();
      expect(workflow.trace.events).toBeDefined();
      expect(workflow.trace.events.length).toBeGreaterThan(0);

      // Verify trace contains expected events
      const eventTypes = workflow.trace.events.map(e => e.type);
      expect(eventTypes).toContain('workflow-started');
      expect(eventTypes).toContain('plan-created');
      expect(eventTypes).toContain('tool-execution');
      expect(eventTypes).toContain('workflow-completed');

      expect(mockLogger.debug).toHaveBeenCalledWith('Execution trace recorded', {
        traceId: workflow.trace.id,
        eventCount: workflow.trace.events.length
      });
    });
  });
});