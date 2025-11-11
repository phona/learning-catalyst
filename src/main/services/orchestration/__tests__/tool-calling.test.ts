/**
 * Tool Calling Orchestration Test Suite
 *
 * Test suite for ToolCallingOrchestrator that uses the actual execute() async generator API
 * instead of expecting individual orchestration methods. Tests the complete tool calling flow
 * including tool selection, execution, result integration, error handling, and limits enforcement.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToolCallingOrchestrator } from '@/main/services/agents/orchestration/tool-calling-orchestrator';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { ToolExecutorService } from '@/main/services/agents/tool-executor';
import { createMockLogger, createMockDatabase, createMockAsyncLocalStorage } from '@/test/setup/main-process/setup';

describe('ToolCallingOrchestrator', () => {
  let orchestrator: ToolCallingOrchestrator;
  let mockDependencies: any;
  let mockToolExecutor: ToolExecutorService;
  let mockLogger: any;
  let mockModel: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup comprehensive mocks
    mockLogger = createMockLogger();
    mockDependencies = {
      database: createMockDatabase(),
      logger: mockLogger,
      config: {},
      eventBus: {}
    };

    // Mock BaseLanguageModel
    mockModel = {
      invoke: vi.fn(),
      stream: vi.fn()
    } as any;

    // Mock ToolExecutorService
    mockToolExecutor = {
      executeTool: vi.fn(),
      getTool: vi.fn(),
      getRegisteredTools: vi.fn(),
      getBaseTools: vi.fn(),
      getStats: vi.fn(),
      getToolDefinitions: vi.fn(),
      getToolInfo: vi.fn(),
      validateToolArguments: vi.fn(),
      getAvailableTools: vi.fn()
    } as any;

    // Create ToolCallingOrchestrator instance
    orchestrator = new ToolCallingOrchestrator(
      mockDependencies,
      mockToolExecutor
    );

    // Setup default mock behaviors
    mockDependencies.database.transaction.mockImplementation(async (fn) => {
      return fn(mockDependencies.database);
    });

    mockLogger.info.mockReturnValue(undefined);
    mockLogger.error.mockReturnValue(undefined);
    mockLogger.warn.mockReturnValue(undefined);
    mockLogger.debug.mockReturnValue(undefined);

    // Setup mock model to return text response (no tool calls)
    mockModel.invoke.mockResolvedValue({
      content: 'I can help you with that concept without needing any tools.',
      additional_kwargs: {}
    });

    // Setup mock tool executor
    mockToolExecutor.getAvailableTools.mockReturnValue([
      'database-query',
      'file-read',
      'list-concepts'
    ]);

    mockToolExecutor.getToolDefinitions.mockResolvedValue([
      {
        name: 'database-query',
        description: 'Execute SQL queries on the local database',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            operation: { type: 'string', enum: ['select', 'insert', 'update', 'delete'] }
          }
        }
      },
      {
        name: 'file-read',
        description: 'Read the contents of a file',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            encoding: { type: 'string' }
          }
        }
      },
      {
        name: 'list-concepts',
        description: 'List concepts from knowledge graph',
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'number' },
            offset: { type: 'number' }
          }
        }
      }
    ]);

    mockToolExecutor.getToolInfo.mockImplementation(async (toolName: string) => {
      const tools: Record<string, any> = {
        'database-query': {
          name: 'database-query',
          description: 'Execute SQL queries',
          requiresAuth: false
        },
        'file-read': {
          name: 'file-read',
          description: 'Read file contents',
          requiresAuth: false
        },
        'list-concepts': {
          name: 'list-concepts',
          description: 'List concepts',
          requiresAuth: false
        }
      };
      return tools[toolName] || null;
    });

    mockToolExecutor.validateToolArguments.mockResolvedValue({
      valid: true,
      errors: []
    });

    mockToolExecutor.getRegisteredTools.mockReturnValue([
      {
        id: 'database-query',
        name: 'Database Query',
        description: 'Execute SQL queries on the local database',
        requiredDatabase: true
      },
      {
        id: 'file-read',
        name: 'Read File',
        description: 'Read the contents of a file from the file system',
        requiredDatabase: false
      },
      {
        id: 'list-concepts',
        name: 'List Concepts',
        description: 'List concepts from the knowledge graph',
        requiredDatabase: true
      }
    ]);

    mockToolExecutor.getTool.mockImplementation((toolId: string) => {
      const tools: Record<string, any> = {
        'database-query': {
          id: 'database-query',
          name: 'Database Query',
          description: 'Execute SQL queries',
          requiredDatabase: true
        },
        'file-read': {
          id: 'file-read',
          name: 'Read File',
          description: 'Read file contents',
          requiredDatabase: false
        },
        'list-concepts': {
          id: 'list-concepts',
          name: 'List Concepts',
          description: 'List concepts',
          requiredDatabase: true
        }
      };
      return tools[toolId];
    });

    mockToolExecutor.getStats.mockReturnValue({
      totalTools: 3,
      builtinTools: 3,
      customTools: 0,
      tools: [
        { id: 'database-query', name: 'Database Query', requiredDatabase: true },
        { id: 'file-read', name: 'Read File', requiredDatabase: false },
        { id: 'list-concepts', name: 'List Concepts', requiredDatabase: true }
      ]
    });

    mockToolExecutor.executeTool.mockImplementation(async (toolName: string, args: any, context: any) => {
      // Mock successful tool execution based on tool name
      switch (toolName) {
        case 'database-query':
          return {
            success: true,
            data: [{ id: 1, concept: 'machine learning' }],
            executionTime: 50,
            metadata: { operation: args.operation }
          };
        case 'file-read':
          return {
            success: true,
            data: { content: 'File content here', path: args.path },
            executionTime: 30,
            metadata: { path: args.path }
          };
        case 'list-concepts':
          return {
            success: true,
            data: { concepts: ['AI', 'ML', 'Neural Networks'], total: 3 },
            executionTime: 40,
            metadata: { limit: args.limit || 50 }
          };
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (orchestrator) {
      orchestrator.dispose();
    }
  });

  describe('Basic Tool Calling Flow', () => {
    it('should execute without tool calls when AI responds directly', async () => {
      const chunks: any[] = [];

      const execution = orchestrator.execute(
        mockModel,
        'Explain machine learning concepts',
        'You are a helpful AI assistant.',
        ['database-query', 'file-read'],
        { agentId: 'test-agent', sessionId: 'session-123' }
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should complete without tool calls
      expect(chunks.length).toBeGreaterThan(0);

      // Should have thinking phase
      const thinkingChunks = chunks.filter(c =>
        c.type === 'progress' && c.content.phase === 'thinking'
      );
      expect(thinkingChunks.length).toBeGreaterThan(0);

      // Should have completion phase
      const completeChunks = chunks.filter(c =>
        c.type === 'progress' && c.content.phase === 'complete'
      );
      expect(completeChunks).toHaveLength(1);
      expect(completeChunks[0].content.message).toContain('completed without additional tool calls');

      // Should have final data chunk
      const dataChunks = chunks.filter(c => c.type === 'data');
      expect(dataChunks).toHaveLength(1);
      expect(dataChunks[0].content.type).toBe('final_response');
      expect(dataChunks[0].content.iterations).toBe(1);
      expect(dataChunks[0].content.totalToolCalls).toBe(0);
      expect(dataChunks[0].content.toolResults).toEqual([]);

      // Model should have been called
      expect(mockModel.invoke).toHaveBeenCalledTimes(1);

      // Tool executor should not have been called
      expect(mockToolExecutor.executeTool).not.toHaveBeenCalled();
    });

    it('should handle multiple thinking iterations before completion', async () => {
      const chunks: any[] = [];

      // Mock model to require multiple iterations
      mockModel.invoke
        .mockResolvedValueOnce({
          content: 'Let me think about this step by step.',
          additional_kwargs: {}
        })
        .mockResolvedValueOnce({
          content: 'I have enough information to answer now.',
          additional_kwargs: {}
        });

      const execution = orchestrator.execute(
        mockModel,
        'Complex question requiring analysis',
        'You are an analytical assistant.',
        ['database-query'],
        {
          agentId: 'test-agent',
          sessionId: 'session-456',
          maxIterations: 3
        }
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should have multiple thinking phases
      const thinkingChunks = chunks.filter(c =>
        c.type === 'progress' && c.content.phase === 'thinking'
      );
      expect(thinkingChunks.length).toBe(2);

      // Should have completion on final iteration
      const completeChunks = chunks.filter(c =>
        c.type === 'progress' && c.content.phase === 'complete'
      );
      expect(completeChunks).toHaveLength(1);

      // Model should have been called twice
      expect(mockModel.invoke).toHaveBeenCalledTimes(2);
    });
  });

  describe('Tool Execution Flow', () => {
    it('should execute tools when AI requests tool calls', async () => {
      const chunks: any[] = [];

      // Mock model to request tool calls
      mockModel.invoke.mockResolvedValue({
        content: 'I need to analyze the concepts first.',
        additional_kwargs: {
          tool_calls: [
            {
              id: 'tool_1',
              name: 'database-query',
              args: { content: 'machine learning concepts', extractRelationships: true }
            }
          ]
        }
      });

      // Mock second model call after tool execution (no more tool calls)
      mockModel.invoke.mockResolvedValueOnce({
        content: 'I need to analyze the concepts first.',
        additional_kwargs: {
          tool_calls: [
            {
              id: 'tool_1',
              name: 'database-query',
              args: { content: 'machine learning concepts', extractRelationships: true }
            }
          ]
        }
      }).mockResolvedValueOnce({
        content: 'Based on the concept analysis, machine learning is a subset of AI.',
        additional_kwargs: {}
      });

      const execution = orchestrator.execute(
        mockModel,
        'Analyze machine learning concepts',
        'You are a concept analysis assistant.',
        ['database-query'],
        { agentId: 'test-agent', sessionId: 'session-789' }
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should have tool execution phase
      const toolExecutionChunks = chunks.filter(c =>
        c.type === 'progress' && c.content.phase === 'executing_tools'
      );
      expect(toolExecutionChunks).toHaveLength(1);
      expect(toolExecutionChunks[0].content.message).toContain('Executing 1 tool call(s)');
      expect(toolExecutionChunks[0].content.toolCalls).toEqual([{ name: 'database-query', id: 'tool_1' }]);

      // Should have final data chunk with tool results
      const dataChunks = chunks.filter(c => c.type === 'data');
      expect(dataChunks).toHaveLength(1);
      expect(dataChunks[0].content.type).toBe('final_response');
      expect(dataChunks[0].content.totalToolCalls).toBe(1);
      expect(dataChunks[0].content.toolResults).toHaveLength(1);
      expect(dataChunks[0].content.toolResults[0].toolName).toBe('database-query');
      expect(dataChunks[0].content.toolResults[0].success).toBe(true);

      // Tool executor should have been called
      expect(mockToolExecutor.executeTool).toHaveBeenCalledWith(
        'database-query',
        { content: 'machine learning concepts', extractRelationships: true },
        expect.objectContaining({
          agentId: 'test-agent',
          sessionId: 'session-789',
          toolCallId: 'tool_1'
        })
      );

      // Model should have been called twice (initial + after tool execution)
      expect(mockModel.invoke).toHaveBeenCalledTimes(2);
    });

    it('should execute multiple tools in a single iteration', async () => {
      const chunks: any[] = [];

      // Mock model to request multiple tool calls
      const mockToolCallResponse = {
        content: 'I need to analyze concepts and build a knowledge graph.',
        additional_kwargs: {
          tool_calls: [
            {
              id: 'tool_1',
              name: 'database-query',
              args: { content: 'neural networks' }
            },
            {
              id: 'tool_2',
              name: 'file-read',
              args: { concepts: ['neural networks'] }
            }
          ]
        }
      };

      mockModel.invoke
        .mockResolvedValueOnce(mockToolCallResponse)
        .mockResolvedValueOnce({
          content: 'Analysis complete. Neural networks are computational models.',
          additional_kwargs: {}
        });

      const execution = orchestrator.execute(
        mockModel,
        'Analyze neural networks comprehensively',
        'You are a comprehensive analysis assistant.',
        ['database-query', 'file-read'],
        { agentId: 'test-agent', sessionId: 'session-multi' }
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should execute both tools
      expect(mockToolExecutor.executeTool).toHaveBeenCalledTimes(2);

      // Should have both tool results
      const dataChunks = chunks.filter(c => c.type === 'data');
      expect(dataChunks[0].content.totalToolCalls).toBe(2);
      expect(dataChunks[0].content.toolResults).toHaveLength(2);

      // Should have called both tools with correct parameters
      expect(mockToolExecutor.executeTool).toHaveBeenCalledWith(
        'database-query',
        { content: 'neural networks' },
        expect.any(Object)
      );
      expect(mockToolExecutor.executeTool).toHaveBeenCalledWith(
        'file-read',
        { concepts: ['neural networks'] },
        expect.any(Object)
      );
    });

    it('should handle multiple iterations with tool calls', async () => {
      const chunks: any[] = [];

      // Mock multiple rounds of tool calls
      mockModel.invoke
        .mockResolvedValueOnce({
          content: 'Let me parse the concepts first.',
          additional_kwargs: {
            tool_calls: [
              {
                id: 'tool_1',
                name: 'database-query',
                args: { content: 'AI and ML' }
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          content: 'Now let me search for related sessions.',
          additional_kwargs: {
            tool_calls: [
              {
                id: 'tool_2',
                name: 'list-concepts',
                args: { query: 'machine learning' }
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          content: 'Based on the concept analysis and session search, here\'s what I found.',
          additional_kwargs: {}
        });

      const execution = orchestrator.execute(
        mockModel,
        'Comprehensive analysis with multiple tool rounds',
        'You are a thorough research assistant.',
        ['database-query', 'list-concepts'],
        { agentId: 'test-agent', sessionId: 'session-multi-iter' }
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should have executed tools in multiple iterations
      expect(mockToolExecutor.executeTool).toHaveBeenCalledTimes(2);

      // Should have completed after 3 iterations
      const dataChunks = chunks.filter(c => c.type === 'data');
      expect(dataChunks[0].content.iterations).toBe(3);
      expect(dataChunks[0].content.totalToolCalls).toBe(2);

      // Should have multiple thinking phases
      const thinkingChunks = chunks.filter(c =>
        c.type === 'progress' && c.content.phase === 'thinking'
      );
      expect(thinkingChunks.length).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle tool execution failures gracefully', async () => {
      const chunks: any[] = [];

      // Mock tool execution failure
      mockToolExecutor.executeTool.mockRejectedValueOnce(
        new Error('Tool execution failed: invalid arguments')
      );

      // Mock model to request tool call
      mockModel.invoke
        .mockResolvedValueOnce({
          content: 'I need to use a tool to process this.',
          additional_kwargs: {
            tool_calls: [
              {
                id: 'tool_error',
                name: 'database-query',
                args: { invalid: 'data' }
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          content: 'I encountered an error with the tool, but I can still help you.',
          additional_kwargs: {}
        });

      const execution = orchestrator.execute(
        mockModel,
        'Process this with tool error handling',
        'You are a resilient assistant.',
        ['database-query'],
        { agentId: 'test-agent', sessionId: 'session-error' }
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should have tool results with error
      const dataChunks = chunks.filter(c => c.type === 'data');
      expect(dataChunks[0].content.toolResults).toHaveLength(1);
      expect(dataChunks[0].content.toolResults[0].success).toBe(false);
      expect(dataChunks[0].content.toolResults[0].error).toContain('Tool execution failed');

      // Should still complete successfully
      expect(dataChunks[0].content.type).toBe('final_response');

      // Should log the error
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Tool call execution failed',
        expect.objectContaining({
          toolName: 'database-query',
          toolCallId: 'tool_error'
        })
      );
    });

    it('should handle tool not found errors', async () => {
      const chunks: any[] = [];

      // Mock tool info to return null (tool not found)
      mockToolExecutor.getToolInfo.mockResolvedValueOnce(null);

      // Mock model to request non-existent tool
      mockModel.invoke
        .mockResolvedValueOnce({
          content: 'I need to use this tool.',
          additional_kwargs: {
            tool_calls: [
              {
                id: 'tool_missing',
                name: 'non-existent-tool',
                args: {}
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          content: 'The tool was not available, but I can continue.',
          additional_kwargs: {}
        });

      const execution = orchestrator.execute(
        mockModel,
        'Use non-existent tool',
        'You are an adaptive assistant.',
        ['database-query'],
        { agentId: 'test-agent', sessionId: 'session-missing-tool' }
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should handle tool not found error
      const dataChunks = chunks.filter(c => c.type === 'data');
      expect(dataChunks[0].content.toolResults[0].success).toBe(false);
      expect(dataChunks[0].content.toolResults[0].error).toContain('not found or not available');
    });

    it('should handle tool validation errors', async () => {
      const chunks: any[] = [];

      // Mock validation failure
      mockToolExecutor.validateToolArguments.mockResolvedValueOnce({
        valid: false,
        errors: ['Missing required parameter: content']
      });

      // Mock model to request tool with invalid args
      mockModel.invoke
        .mockResolvedValueOnce({
          content: 'I need to parse something.',
          additional_kwargs: {
            tool_calls: [
              {
                id: 'tool_validation',
                name: 'database-query',
                args: { wrongParam: 'value' }
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          content: 'The tool arguments were invalid, but I can proceed.',
          additional_kwargs: {}
        });

      const execution = orchestrator.execute(
        mockModel,
        'Tool with invalid arguments',
        'You are a careful assistant.',
        ['database-query'],
        { agentId: 'test-agent', sessionId: 'session-validation' }
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should handle validation error
      const dataChunks = chunks.filter(c => c.type === 'data');
      expect(dataChunks[0].content.toolResults[0].success).toBe(false);
      expect(dataChunks[0].content.toolResults[0].error).toContain('Invalid tool arguments');
    });

    it('should handle authentication requirements for tools', async () => {
      const chunks: any[] = [];

      // Mock tool that requires auth but no session provided
      mockToolExecutor.getToolInfo.mockResolvedValueOnce({
        name: 'quiz-generator',
        description: 'Generate quizzes based on content',
        requiresAuth: true
      });

      // Mock model to request authenticated tool without session
      mockModel.invoke
        .mockResolvedValueOnce({
          content: 'I need to generate a quiz.',
          additional_kwargs: {
            tool_calls: [
              {
                id: 'tool_auth',
                name: 'quiz-generator',
                args: { topic: 'machine learning' }
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          content: 'The tool requires authentication, but I can still help.',
          additional_kwargs: {}
        });

      const execution = orchestrator.execute(
        mockModel,
        'Generate quiz without session',
        'You are a resourceful assistant.',
        ['quiz-generator'],
        { agentId: 'test-agent' } // No sessionId provided
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should handle auth requirement error
      const dataChunks = chunks.filter(c => c.type === 'data');
      expect(dataChunks[0].content.toolResults[0].success).toBe(false);
      expect(dataChunks[0].content.toolResults[0].error).toContain('requires authentication');
    });
  });

  describe('Limits and Constraints', () => {
    it('should respect maxToolCalls limit', async () => {
      const chunks: any[] = [];

      // Mock model to always request tool calls
      mockModel.invoke.mockImplementation(() => ({
        content: 'I need to use more tools.',
        additional_kwargs: {
          tool_calls: [
            {
              id: `tool_${Date.now()}`,
              name: 'database-query',
              args: { content: 'test content' }
            }
          ]
        }
      }));

      const execution = orchestrator.execute(
        mockModel,
        'Request many tool calls',
        'You are a tool-heavy assistant.',
        ['database-query'],
        {
          agentId: 'test-agent',
          sessionId: 'session-tool-limit'
        },
        { maxToolCalls: 2 }
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should reach tool call limit
      const limitReachedChunks = chunks.filter(c =>
        c.type === 'progress' && c.content.phase === 'limit_reached'
      );
      expect(limitReachedChunks).toHaveLength(1);
      expect(limitReachedChunks[0].content.message).toContain('Maximum tool calls reached');

      // Should have limit reached in final data
      const dataChunks = chunks.filter(c => c.type === 'data');
      expect(dataChunks[0].content.limitReached).toBe('tool_calls');

      // Should not exceed max tool calls
      expect(dataChunks[0].content.totalToolCalls).toBeLessThanOrEqual(2);
    });

    it('should respect maxIterations limit', async () => {
      const chunks: any[] = [];

      // Mock model to always continue thinking (no tool calls)
      mockModel.invoke.mockImplementation(() => ({
        content: 'I need more time to think about this.',
        additional_kwargs: {}
      }));

      const execution = orchestrator.execute(
        mockModel,
        'Complex question requiring many iterations',
        'You are a very thorough assistant.',
        ['database-query'],
        {
          agentId: 'test-agent',
          sessionId: 'session-iter-limit'
        },
        { maxIterations: 2 }
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should reach iteration limit
      const limitReachedChunks = chunks.filter(c =>
        c.type === 'progress' && c.content.phase === 'limit_reached'
      );
      expect(limitReachedChunks).toHaveLength(1);
      expect(limitReachedChunks[0].content.message).toContain('Maximum iterations reached');

      // Should have limit reached in final data
      const dataChunks = chunks.filter(c => c.type === 'data');
      expect(dataChunks[0].content.limitReached).toBe('iterations');

      // Should not exceed max iterations
      expect(dataChunks[0].content.iterations).toBeLessThanOrEqual(2);
    });

    it('should handle timeout limits', async () => {
      const chunks: any[] = [];
      const timeoutMs = 100;

      // Mock slow model that takes longer than timeout
      mockModel.invoke.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, timeoutMs + 50));
        return {
          content: 'Slow response',
          additional_kwargs: {}
        };
      });

      const execution = orchestrator.execute(
        mockModel,
        'Test timeout handling',
        'You are a slow assistant.',
        ['database-query'],
        {
          agentId: 'test-agent',
          sessionId: 'session-timeout'
        },
        { timeout: timeoutMs }
      );

      try {
        for await (const chunk of execution) {
          chunks.push(chunk);
        }
        fail('Should have thrown timeout error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('timed out');
      }
    });
  });

  describe('Security and Validation', () => {
    it('should validate tool calls before execution', async () => {
      const chunks: any[] = [];

      // Mock model to request tool call
      mockModel.invoke
        .mockResolvedValueOnce({
          content: 'I need to validate this tool call.',
          additional_kwargs: {
            tool_calls: [
              {
                id: 'tool_secure',
                name: 'database-query',
                args: { content: 'test data' }
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          content: 'Tool validation completed successfully.',
          additional_kwargs: {}
        });

      const execution = orchestrator.execute(
        mockModel,
        'Test tool validation',
        'You are a security-conscious assistant.',
        ['database-query'],
        { agentId: 'test-agent', sessionId: 'session-validation' }
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should have validated tool arguments
      expect(mockToolExecutor.validateToolArguments).toHaveBeenCalledWith(
        'database-query',
        { content: 'test data' }
      );

      // Should have checked tool info
      expect(mockToolExecutor.getToolInfo).toHaveBeenCalledWith('database-query');

      // Should execute tool successfully
      expect(mockToolExecutor.executeTool).toHaveBeenCalledWith(
        'database-query',
        { content: 'test data' },
        expect.objectContaining({
          agentId: 'test-agent',
          sessionId: 'session-validation',
          toolCallId: 'tool_secure',
          permissions: ['read', 'write'],
          timeout: 30000
        })
      );
    });

    it('should use correct execution context for tools', async () => {
      const chunks: any[] = [];

      // Mock model to request tool
      mockModel.invoke
        .mockResolvedValueOnce({
          content: 'I need to execute a tool with proper context.',
          additional_kwargs: {
            tool_calls: [
              {
                id: 'tool_context',
                name: 'list-concepts',
                args: { query: 'machine learning' }
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          content: 'Tool executed with proper context.',
          additional_kwargs: {}
        });

      const execution = orchestrator.execute(
        mockModel,
        'Test execution context',
        'You are a context-aware assistant.',
        ['list-concepts'],
        {
          agentId: 'context-test-agent',
          sessionId: 'context-test-session',
          additionalContext: 'test data'
        }
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should pass correct context to tool execution
      expect(mockToolExecutor.executeTool).toHaveBeenCalledWith(
        'list-concepts',
        { query: 'machine learning' },
        expect.objectContaining({
          agentId: 'context-test-agent',
          sessionId: 'context-test-session',
          toolCallId: 'tool_context',
          permissions: ['read', 'write'],
          timeout: 30000
        })
      );
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide accurate orchestrator statistics', () => {
      const stats = orchestrator.getStats();

      expect(stats).toEqual({
        name: 'Tool Calling Orchestrator',
        version: '1.0.0',
        capabilities: [
          'intelligent_tool_selection',
          'secure_tool_execution',
          'result_integration',
          'error_handling',
          'permission_validation',
          'timeout_management'
        ],
        supportedTools: 3 // database-query, file-read, list-concepts
      });
    });

    it('should track tool execution statistics in results', async () => {
      const chunks: any[] = [];

      // Mock model to request multiple tools with different execution times
      mockModel.invoke
        .mockResolvedValueOnce({
          content: 'I need to use multiple tools.',
          additional_kwargs: {
            tool_calls: [
              {
                id: 'tool_1',
                name: 'database-query',
                args: { content: 'test 1' }
              },
              {
                id: 'tool_2',
                name: 'file-read',
                args: { nodes: ['test'] }
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          content: 'All tools executed successfully.',
          additional_kwargs: {}
        });

      // Mock tool execution with timing
      let callCount = 0;
      mockToolExecutor.executeTool.mockImplementation(async (toolName: string, args: any, context: any) => {
        callCount++;
        // Simulate different execution times
        await new Promise(resolve => setTimeout(resolve, callCount * 10));

        return {
          result: `Result from ${toolName}`,
          executionTime: callCount * 10
        };
      });

      const execution = orchestrator.execute(
        mockModel,
        'Test execution statistics',
        'You are a statistical assistant.',
        ['database-query', 'file-read'],
        { agentId: 'stats-agent', sessionId: 'stats-session' }
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should track execution statistics
      const dataChunks = chunks.filter(c => c.type === 'data');
      const toolResults = dataChunks[0].content.toolResults;

      expect(toolResults).toHaveLength(2);
      expect(toolResults[0].executionTime).toBeGreaterThan(0);
      expect(toolResults[1].executionTime).toBeGreaterThan(0);
      expect(toolResults[0].toolName).toBe('database-query');
      expect(toolResults[1].toolName).toBe('file-read');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete workflow with mixed success and failure', async () => {
      const chunks: any[] = [];

      // Mock mixed tool execution results
      mockToolExecutor.executeTool
        .mockResolvedValueOnce({
          concepts: ['AI', 'ML'],
          relationships: [['ML', 'subset of', 'AI']]
        })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          sessions: [{ id: 'session-1', title: 'Related session' }],
          total: 1
        });

      // Mock model to request multiple tools
      mockModel.invoke
        .mockResolvedValueOnce({
          content: 'I need to use multiple tools.',
          additional_kwargs: {
            tool_calls: [
              {
                id: 'tool_success',
                name: 'database-query',
                args: { content: 'successful tool' }
              },
              {
                id: 'tool_fail',
                name: 'file-read',
                args: { data: 'failing tool' }
              },
              {
                id: 'tool_success2',
                name: 'list-concepts',
                args: { query: 'search query' }
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          content: 'Completed analysis despite one tool failure.',
          additional_kwargs: {}
        });

      const execution = orchestrator.execute(
        mockModel,
        'Complex workflow with mixed results',
        'You are a resilient assistant.',
        ['database-query', 'file-read', 'list-concepts'],
        { agentId: 'integration-agent', sessionId: 'integration-session' }
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should have mixed success and failure results
      const dataChunks = chunks.filter(c => c.type === 'data');
      const toolResults = dataChunks[0].content.toolResults;

      expect(toolResults).toHaveLength(3);
      expect(toolResults[0].success).toBe(true);
      expect(toolResults[1].success).toBe(false);
      expect(toolResults[2].success).toBe(true);

      // Should complete successfully despite partial failures
      expect(dataChunks[0].content.type).toBe('final_response');
      expect(dataChunks[0].content.totalToolCalls).toBe(3);

      // Should log both success and failure
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Tool call executed successfully',
        expect.any(Object)
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Tool call execution failed',
        expect.any(Object)
      );
    });

    it('should handle concurrent orchestration sessions', async () => {
      // Run multiple orchestrations concurrently
      const executions = Array.from({ length: 3 }, (_, i) =>
        orchestrator.execute(
          mockModel,
          `Concurrent session ${i}`,
          'You are a parallel assistant.',
          ['database-query'],
          { agentId: 'concurrent-agent', sessionId: `concurrent-${i}` }
        )
      );

      const results = await Promise.all(
        executions.map(async (execution) => {
          const chunks: any[] = [];
          for await (const chunk of execution) {
            chunks.push(chunk);
          }
          return chunks;
        })
      );

      // All should complete successfully
      expect(results).toHaveLength(3);
      results.forEach(chunks => {
        const dataChunks = chunks.filter(c => c.type === 'data');
        expect(dataChunks).toHaveLength(1);
        expect(dataChunks[0].content.type).toBe('final_response');
      });

      // Should have called model for each session
      expect(mockModel.invoke).toHaveBeenCalledTimes(3);
    });
  });
});