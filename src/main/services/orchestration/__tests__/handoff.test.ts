/**
 * Handoff Orchestration Test Suite
 *
 * Test suite for HandoffOrchestrator that uses the actual execute() async generator API
 * instead of expecting individual handoff methods. Tests the complete orchestration flow
 * including agent execution, handoff decisions, context preservation, and seamless transitions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HandoffOrchestrator } from '@/main/services/agents/orchestration/handoff-orchestrator';
import { AgentType } from '@/main/services/agents/types';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { createMockLogger, createMockDatabase, createMockAsyncLocalStorage } from '@/test/setup/main-process/setup';

// Mock agents for testing
const mockAgents = [
  {
    id: 'learning-agent',
    type: AgentType.LEARNING,
    name: 'Learning Assistant',
    description: 'Explains concepts and builds knowledge',
    capabilities: ['concept-explanation', 'knowledge-building'],
    enabled: true
  },
  {
    id: 'assessment-agent',
    type: AgentType.ASSESSMENT,
    name: 'Assessment Assistant',
    description: 'Creates quizzes and evaluates understanding',
    capabilities: ['quiz-generation', 'evaluation', 'feedback'],
    enabled: true
  },
  {
    id: 'tutoring-agent',
    type: AgentType.TUTORING,
    name: 'Tutoring Assistant',
    description: 'Provides personalized guidance',
    capabilities: ['personalized-guidance', 'socratic-questioning'],
    enabled: true
  },
  {
    id: 'practice-agent',
    type: AgentType.PRACTICE,
    name: 'Practice Assistant',
    description: 'Creates exercises and interactive problems',
    capabilities: ['exercise-generation', 'interactive-problems'],
    enabled: true
  }
];

describe('HandoffOrchestrator', () => {
  let orchestrator: HandoffOrchestrator;
  let mockDb: any;
  let mockLogger: any;
  let mockConfig: any;
  let mockEventBus: any;
  let mockAgentManager: any;
  let mockModel: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup comprehensive mocks
    mockDb = createMockDatabase();
    mockLogger = createMockLogger();
    mockConfig = {};
    mockEventBus = {};

    // Mock BaseLanguageModel
    mockModel = {
      invoke: vi.fn(),
      stream: vi.fn()
    } as any;

    // Mock AgentManagerMain
    mockAgentManager = {
      getAgent: vi.fn(),
      getRegisteredAgents: vi.fn(() => mockAgents),
      executeAgent: vi.fn(),
      activateAgentForSession: vi.fn()
    };

    // Create HandoffOrchestrator instance
    orchestrator = new HandoffOrchestrator(
      {
        database: mockDb,
        logger: mockLogger,
        config: mockConfig,
        eventBus: mockEventBus
      },
      mockAgentManager
    );

    // Setup default mock behaviors
    mockDb.transaction.mockImplementation(async (fn) => {
      return fn(mockDb);
    });

    mockLogger.info.mockReturnValue(undefined);
    mockLogger.error.mockReturnValue(undefined);
    mockLogger.warn.mockReturnValue(undefined);
    mockLogger.debug.mockReturnValue(undefined);

    // Setup mock model to return handoff decision
    mockModel.invoke.mockResolvedValue({
      content: JSON.stringify({
        shouldHandoff: false,
        reason: 'Current agent can handle this request',
        confidence: 0.9
      })
    });

    // Setup mock agent execution that captures context
    mockAgentManager.executeAgent.mockImplementation(({ agentId, input, context }) => {
      return (async function* () {
        yield {
          type: 'progress',
          content: { message: 'Starting agent execution' },
          timestamp: Date.now()
        };
        yield {
          type: 'data',
          content: {
            message: `Response from ${agentId}`, // Include agent-specific message
            context: context // Include context in response
          },
          timestamp: Date.now()
        };
      })();
    });

    // Setup mock agent manager to return agents
    mockAgentManager.getAgent.mockImplementation((id: string) => {
      return mockAgents.find(agent => agent.id === id);
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (orchestrator) {
      orchestrator.dispose();
    }
  });

  describe('Handoff Orchestration Flow', () => {
    it('should execute handoff orchestration without handoffs', async () => {
      const chunks: any[] = [];

      // Execute orchestration with no handoffs expected
      const execution = orchestrator.execute(
        mockModel,
        'learning-agent',
        'Explain machine learning concepts',
        'session-123'
      );

      // Collect all chunks
      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Verify orchestration completed
      expect(chunks.length).toBeGreaterThan(0);

      // Should have agent start and completion chunks
      const agentStartChunks = chunks.filter(c =>
        c.type === 'progress' && c.content.phase === 'agent_start'
      );
      const agentCompleteChunks = chunks.filter(c =>
        c.type === 'progress' && c.content.phase === 'agent_complete'
      );
      const finalSummaryChunks = chunks.filter(c =>
        c.type === 'data' && c.content.type === 'orchestration_summary'
      );

      expect(agentStartChunks).toHaveLength(1);
      expect(agentCompleteChunks).toHaveLength(1);
      expect(finalSummaryChunks).toHaveLength(1);

      // Verify agent execution was called
      expect(mockAgentManager.executeAgent).toHaveBeenCalledWith({
        agentId: 'learning-agent',
        input: expect.any(Object),
        context: expect.any(Object),
        options: expect.objectContaining({
          maxIterations: 3,
          timeout: 60000,
          stream: true
        })
      });

      // Verify model was called for handoff evaluation
      expect(mockModel.invoke).toHaveBeenCalled();
    });

    it('should orchestrate handoff between agents', async () => {
      const chunks: any[] = [];

      // Mock model to recommend handoff
      mockModel.invoke.mockResolvedValueOnce({
        content: JSON.stringify({
          shouldHandoff: true,
          targetAgentId: 'assessment-agent',
          reason: 'User requested assessment',
          confidence: 0.85
        })
      });

      // Mock model to not recommend further handoffs
      mockModel.invoke.mockResolvedValueOnce({
        content: JSON.stringify({
          shouldHandoff: false,
          reason: 'Assessment agent can handle this',
          confidence: 0.9
        })
      });

      const execution = orchestrator.execute(
        mockModel,
        'learning-agent',
        'I understand the concepts. Can you test my understanding?',
        'session-456',
        { maxHandoffs: 2 }
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should have handoff chunk
      const handoffChunks = chunks.filter(c =>
        c.type === 'progress' && c.content.phase === 'handoff'
      );

      expect(handoffChunks).toHaveLength(1);
      expect(handoffChunks[0].content.fromAgentId).toBe('learning-agent');
      expect(handoffChunks[0].content.toAgentId).toBe('assessment-agent');
      expect(handoffChunks[0].content.reason).toContain('assessment');

      // Should have activated new agent for session
      expect(mockAgentManager.activateAgentForSession).toHaveBeenCalledWith(
        'assessment-agent',
        'session-456',
        'primary'
      );

      // Should have executed both agents
      expect(mockAgentManager.executeAgent).toHaveBeenCalledTimes(2);
    });

    it('should preserve context during handoffs', async () => {
      const chunks: any[] = [];

      // Mock handoff decision
      mockModel.invoke.mockResolvedValueOnce({
        content: JSON.stringify({
          shouldHandoff: true,
          targetAgentId: 'tutoring-agent',
          reason: 'User needs personalized guidance',
          confidence: 0.8,
          contextSummary: 'User was learning about neural networks but got confused'
        })
      });

      // Mock no further handoffs
      mockModel.invoke.mockResolvedValueOnce({
        content: JSON.stringify({
          shouldHandoff: false,
          reason: 'Tutoring agent can provide guidance',
          confidence: 0.9
        })
      });

      const execution = orchestrator.execute(
        mockModel,
        'learning-agent',
        'I\'m confused about neural networks. Can you help me step by step?',
        'session-789',
        {
          maxHandoffs: 2,
          userGoals: ['understand-neural-networks', 'step-by-step-guidance']
        }
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should have handoff with context preservation
      const handoffChunks = chunks.filter(c =>
        c.type === 'progress' && c.content.phase === 'handoff'
      );

      expect(handoffChunks).toHaveLength(1);
      expect(handoffChunks[0].content.confidence).toBe(0.8);

      // Verify user goals were preserved in context through conversation history
      const agentExecutionCalls = mockAgentManager.executeAgent.mock.calls;
      expect(agentExecutionCalls).toHaveLength(2); // Should have called both agents

      // Check that context includes user goals in the input
      const secondCallInput = agentExecutionCalls[1][0].input;
      expect(secondCallInput.context.userGoals).toContain('understand-neural-networks');
      expect(secondCallInput.context.userGoals).toContain('step-by-step-guidance');
    });

    it('should limit maximum handoffs', async () => {
      const chunks: any[] = [];

      // Mock model to always recommend handoffs with different targets
      let handoffCount = 0;
      mockModel.invoke.mockImplementation(() => {
        handoffCount++;
        const targets = ['assessment-agent', 'practice-agent', 'tutoring-agent'];
        return {
          content: JSON.stringify({
            shouldHandoff: true,
            targetAgentId: targets[handoffCount - 1],
            reason: 'Continue handoff chain',
            confidence: 0.7
          })
        };
      });

      const execution = orchestrator.execute(
        mockModel,
        'learning-agent',
        'Start learning process',
        'session-limit',
        { maxHandoffs: 2 }
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should have only 2 handoffs due to limit
      const handoffChunks = chunks.filter(c =>
        c.type === 'progress' && c.content.phase === 'handoff'
      );

      expect(handoffChunks).toHaveLength(2);

      // Should complete gracefully without infinite loop
      const summaryChunks = chunks.filter(c =>
        c.type === 'data' && c.content.type === 'orchestration_summary'
      );

      expect(summaryChunks).toHaveLength(1);
      expect(summaryChunks[0].content.summary.totalHandoffs).toBeLessThanOrEqual(2);
    });

    it('should handle handoff evaluation failures gracefully', async () => {
      const chunks: any[] = [];

      // Mock model to throw error
      mockModel.invoke.mockRejectedValue(new Error('Model evaluation failed'));

      const execution = orchestrator.execute(
        mockModel,
        'learning-agent',
        'Explain something',
        'session-error'
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should complete with no handoffs when evaluation fails
      const handoffChunks = chunks.filter(c =>
        c.type === 'progress' && c.content.phase === 'handoff'
      );

      expect(handoffChunks).toHaveLength(0);

      // Should still execute the original agent
      expect(mockAgentManager.executeAgent).toHaveBeenCalledTimes(1);

      // Should log the evaluation error
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Handoff decision evaluation failed',
        expect.any(Error)
      );
    });

    it('should handle agent execution errors during handoffs', async () => {
      const chunks: any[] = [];

      // Mock successful first agent execution
      mockAgentManager.executeAgent.mockReturnValueOnce((async function* () {
        yield {
          type: 'progress',
          content: { message: 'Starting first agent' },
          timestamp: Date.now()
        };
        yield {
          type: 'data',
          content: { message: 'First agent response' },
          timestamp: Date.now()
        };
      })());

      // Mock handoff recommendation
      mockModel.invoke.mockResolvedValueOnce({
        content: JSON.stringify({
          shouldHandoff: true,
          targetAgentId: 'assessment-agent',
          reason: 'Handoff to assessment',
          confidence: 0.8
        })
      });

      // Mock second agent execution failure - throw an error that gets caught
      mockAgentManager.executeAgent.mockReturnValueOnce(
        Promise.reject(new Error('Simulated agent execution error'))
      );

      // Mock no further handoffs after error
      mockModel.invoke.mockResolvedValueOnce({
        content: JSON.stringify({
          shouldHandoff: false,
          reason: 'No further handoffs needed',
          confidence: 0.9
        })
      });

      const execution = orchestrator.execute(
        mockModel,
        'learning-agent',
        'Trigger handoff with error',
        'session-error-handoff'
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should have error chunk
      const errorChunks = chunks.filter(c => c.type === 'error');
      expect(errorChunks).toHaveLength(1);
      expect(errorChunks[0].content.agentId).toBe('assessment-agent');
      expect(errorChunks[0].content.error).toContain('Agent execution failed');

      // Should still complete orchestration
      const summaryChunks = chunks.filter(c =>
        c.type === 'data' && c.content.type === 'orchestration_summary'
      );
      expect(summaryChunks).toHaveLength(1);
    });

    it('should respect timeout limits', async () => {
      const chunks: any[] = [];

      // Set very short timeout
      const timeoutMs = 100;

      const execution = orchestrator.execute(
        mockModel,
        'learning-agent',
        'Start process',
        'session-timeout',
        { timeout: timeoutMs }
      );

      // Add delay before checking timeout
      await new Promise(resolve => setTimeout(resolve, timeoutMs + 50));

      try {
        for await (const chunk of execution) {
          chunks.push(chunk);
        }
      } catch (error) {
        // Should timeout gracefully
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('timed out');
      }
    });

    it('should provide orchestration statistics', () => {
      const stats = orchestrator.getStats();

      expect(stats).toEqual({
        name: 'Handoff Orchestrator',
        version: '1.0.0',
        capabilities: [
          'intelligent_handoff_decisions',
          'context_preservation',
          'seamless_transitions',
          'conversation_history',
          'agent_coordination',
          'user_goal_tracking'
        ],
        availableAgents: mockAgents.length
      });
    });

    it('should track conversation history across agents', async () => {
      const chunks: any[] = [];

      // Mock handoff sequence
      mockModel.invoke.mockResolvedValueOnce({
        content: JSON.stringify({
          shouldHandoff: true,
          targetAgentId: 'assessment-agent',
          reason: 'Assessment needed',
          confidence: 0.8
        })
      });

      mockModel.invoke.mockResolvedValueOnce({
        content: JSON.stringify({
          shouldHandoff: true,
          targetAgentId: 'practice-agent',
          reason: 'Practice needed',
          confidence: 0.7
        })
      });

      mockModel.invoke.mockResolvedValueOnce({
        content: JSON.stringify({
          shouldHandoff: false,
          reason: 'Complete',
          confidence: 0.9
        })
      });

      const execution = orchestrator.execute(
        mockModel,
        'learning-agent',
        'Complete learning journey',
        'session-history',
        { maxHandoffs: 3 }
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Get final summary
      const summaryChunks = chunks.filter(c =>
        c.type === 'data' && c.content.type === 'orchestration_summary'
      );

      expect(summaryChunks).toHaveLength(1);
      const summary = summaryChunks[0].content.summary;

      // Should track all agents involved
      expect(summary.agentsInvolved).toContain('learning-agent');
      expect(summary.agentsInvolved).toContain('assessment-agent');
      expect(summary.agentsInvolved).toContain('practice-agent');

      // Should track transitions
      expect(summary.transitions).toHaveLength(2);
      expect(summary.totalHandoffs).toBe(2);
      expect(summary.totalMessages).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid agent IDs gracefully', async () => {
      const chunks: any[] = [];

      // Mock agent not found
      mockAgentManager.getAgent.mockReturnValueOnce(undefined);

      const execution = orchestrator.execute(
        mockModel,
        'invalid-agent',
        'Test input',
        'session-invalid'
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should have error chunk
      const errorChunks = chunks.filter(c => c.type === 'error');
      expect(errorChunks).toHaveLength(1);
      expect(errorChunks[0].content.error).toContain('not found');
    });

    it('should handle no available agents for handoff', async () => {
      const chunks: any[] = [];

      // Mock no registered agents
      mockAgentManager.getRegisteredAgents.mockReturnValue([]);

      const execution = orchestrator.execute(
        mockModel,
        'learning-agent',
        'Test input',
        'session-no-agents'
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should complete without handoffs
      const handoffChunks = chunks.filter(c =>
        c.type === 'progress' && c.content.phase === 'handoff'
      );
      expect(handoffChunks).toHaveLength(0);

      // Model should not be called for handoff evaluation since no agents available
      expect(mockModel.invoke).not.toHaveBeenCalled();
    });

    it('should handle malformed handoff decisions', async () => {
      const chunks: any[] = [];

      // Mock model to return malformed JSON
      mockModel.invoke.mockResolvedValue({
        content: 'Some text before { shouldHandoff: true, targetAgentId: "invalid-agent", malformed JSON } some text after'
      });

      const execution = orchestrator.execute(
        mockModel,
        'learning-agent',
        'Test input',
        'session-malformed'
      );

      for await (const chunk of execution) {
        chunks.push(chunk);
      }

      // Should complete gracefully with fallback behavior
      const summaryChunks = chunks.filter(c =>
        c.type === 'data' && c.content.type === 'orchestration_summary'
      );
      expect(summaryChunks).toHaveLength(1);

      // Should log warning about failed parsing
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to parse handoff decision JSON',
        expect.objectContaining({
          responseContent: 'Some text before { shouldHandoff: true, targetAgentId: "invalid-agent", malformed JSON } some text after',
          error: expect.any(String)
        })
      );
    });

    it('should handle concurrent orchestration sessions', async () => {
      // Run multiple orchestrations concurrently
      const executions = Array.from({ length: 3 }, (_, i) =>
        orchestrator.execute(
          mockModel,
          'learning-agent',
          `Concurrent session ${i}`,
          `session-concurrent-${i}`
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
        const summaryChunks = chunks.filter(c =>
          c.type === 'data' && c.content.type === 'orchestration_summary'
        );
        expect(summaryChunks).toHaveLength(1);
      });

      // Should have called agent manager for each session
      expect(mockAgentManager.executeAgent).toHaveBeenCalledTimes(3);
    });
  });
});