/**
 * Comprehensive test suite for handleConversation node
 *
 * Tests conversation handling through two approaches:
 *
 * 1. DIRECT NODE TESTS: Tests the node function in isolation
 *    - Faster execution, focused on business logic
 *    - Tests give_up scenarios and edge cases
 *
 * 2. STATEGRAPH INTEGRATION TESTS: Tests the node within a StateGraph
 *    - More realistic execution context
 *    - Validates state transitions and graph integration
 *    - Tests interrupt handling and state propagation
 *
 * NOTE: Complex interrupt-based workflows (multi-turn conversations,
 * graph navigation) are tested here with StateGraph. Full integration
 * tests handle end-to-end workflows.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command, StateGraph, MemorySaver, START, END } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { handleConversationNode } from '../handleConversation';
import { PracticeAnnotation } from '../../state';
import { DEFAULT_PRACTICE_STATE } from '../../types';
import type { UserIntent } from '../../types';
import type { WorkflowDeps } from '../../../../state';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { extractInterrupt, isInterruptEvent } from '../../../../interrupt';

// Mock dependencies (only stateful external ones)
const mockLoggerService = {
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  child: vi.fn().mockReturnThis(),
};

const mockProviderFactory = {
  getModel: vi.fn(),
};

const mockModel = {
  invoke: vi.fn(),  // AI model - makes network calls (STATEFUL - MOCK)
};

// Config writer for chunk streaming (stateful callback)
const mockWriter = vi.fn();

const createMockConfig = (): LangGraphRunnableConfig => ({
  writer: mockWriter,
} as any);

const mockDeps = {
  agentManager: {} as any,
  loggerService: mockLoggerService,
  checkpointer: {} as any,
  configService: {} as any,
  providerFactory: mockProviderFactory,
  knowledgeService: {} as any,
  practiceService: {} as any,
  learningService: {} as any,
} as unknown as WorkflowDeps;

describe('handleConversationNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProviderFactory.getModel.mockResolvedValue(mockModel);
  });

  describe('Give Up Scenarios', () => {
    it('reveals answer and marks complete', async () => {
      const node = handleConversationNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          userIntent: 'give_up',
          hintsGiven: 2,
          currentQuestion: 'What is a closure in JavaScript?',
          focusConcepts: ['closure', 'scope'],
        },
        topic: 'JavaScript',
        userAnswer: 'I don\'t know',
      };

      const result = await node(state as any, createMockConfig());

      expect(result.messages[0]).toBeInstanceOf(HumanMessage);
      expect(result.messages[1]).toBeInstanceOf(AIMessage);
      expect(result.messages[1].content).toContain('No worries');
      expect(result.messages[1].content).toContain('closure, scope');
      expect(result.practice.isComplete).toBe(true);
    });

    it('provides encouraging message when giving up', async () => {
      const node = handleConversationNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          userIntent: 'give_up',
          hintsGiven: 0,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
        },
        topic: 'JavaScript',
        userAnswer: 'I give up',
      };

      const result = await node(state as any, createMockConfig());

      expect(result.messages[0]).toBeInstanceOf(HumanMessage);
      expect(result.messages[1]).toBeInstanceOf(AIMessage);
      expect(result.messages[1].content).toContain('helpful explanation');
      expect(result.messages[1].content).toContain('next practice');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing practice state', async () => {
      const node = handleConversationNode(mockDeps);

      const state = {
        practice: undefined,
        topic: 'JavaScript',
      };

      await expect(node(state as any, createMockConfig())).rejects.toThrow();
    });

    it('handles undefined user answer on give up', async () => {
      const node = handleConversationNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          userIntent: 'give_up',
          hintsGiven: 0,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
        },
        topic: 'JavaScript',
        userAnswer: undefined,
      };

      const result = await node(state as any, createMockConfig());

      expect(result.practice.isComplete).toBe(true);
    });
  });

  describe('Logging', () => {
    it('logs give up scenario separately', async () => {
      const node = handleConversationNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          userIntent: 'give_up',
          hintsGiven: 1,
          conversationTurns: 2,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
        },
        topic: 'JavaScript',
      };

      await node(state as any, createMockConfig());

      expect(mockLoggerService.info).toHaveBeenCalledWith(
        'handleConversationNode: user gave up',
        expect.objectContaining({
          topic: 'JavaScript',
          conversationTurns: 3,
          durationMs: expect.any(Number),
        })
      );
    });
  });

  describe('StateGraph Integration Tests', () => {
    /**
     * Creates a simple test graph with handleConversation node
     * to test the node in a realistic execution context.
     */
    const createTestGraph = () => {
      const graph = new StateGraph(PracticeAnnotation)
        .addNode('conversation', handleConversationNode(mockDeps))
        .addNode('complete', async (state: any) => ({ done: true }))
        .addEdge(START, 'conversation')
        .addEdge('conversation', 'complete')
        .addEdge('complete', END);

      return graph.compile({ checkpointer: new MemorySaver() });
    };

    it('executes give_up scenario through StateGraph', async () => {
      const graph = createTestGraph();

      const threadId = 'test-thread-give-up';
      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          userIntent: 'give_up' as UserIntent,
          hintsGiven: 2,
          conversationTurns: 1,
          currentQuestion: 'What is a closure in JavaScript?',
          focusConcepts: ['closure', 'scope'],
        },
        topic: 'JavaScript',
        userAnswer: 'I give up',
      };

      const result = await graph.invoke(state, { configurable: { thread_id: threadId } });

      // Messages now include both HumanMessage (user answer) and AIMessage (assistant response)
      const lastAIMessage = result.messages.filter((m: any) => m instanceof AIMessage).slice(-1)[0];
      expect(lastAIMessage.content).toContain('No worries');
      expect(lastAIMessage.content).toContain('closure, scope');
      expect(result.practice.isComplete).toBe(true);
      expect(result.practice.conversationTurns).toBe(2);
    });

    it('executes hint_request through StateGraph with streaming and resume', async () => {
      // Mock the model for hint generation
      mockProviderFactory.getModel.mockResolvedValueOnce({
        invoke: vi.fn().mockResolvedValue({
          content: 'A closure is a function that has access to variables from its outer scope.',
        }),
      });

      const graph = createTestGraph();

      const threadId = 'test-thread-hint-stream';

      // Use streaming mode to handle the interrupt
      const stream = await graph.stream(
        {
          practice: {
            ...DEFAULT_PRACTICE_STATE,
            userIntent: 'hint_request',
            hintsGiven: 0,
            conversationTurns: 0,
            currentQuestion: 'What is a closure in JavaScript?',
            focusConcepts: ['closure', 'scope'],
          },
          topic: 'JavaScript',
          userAnswer: 'Can I get a hint?',
        },
        {
          configurable: { thread_id: threadId },
          streamMode: 'updates' as const,
        }
      );

      // Collect the stream output
      let gotInterrupt = false;
      let hintMessage: any = null;

      for await (const evt of stream) {
        // Check if this is an interrupt event using the helper
        if (isInterruptEvent(evt)) {
          gotInterrupt = true;
          // Extract the interrupt value
          const interruptValue = extractInterrupt(evt) as any;
          expect(interruptValue.prompt).toContain('Hint 1/3');
          expect(interruptValue.prompt).toContain('closure');
          expect(interruptValue.type).toBe('practice_followup');
          break;
        }
        // Or check for regular updates
        if (evt?.conversation) {
          hintMessage = evt.conversation;
        }
      }

      expect(gotInterrupt).toBe(true);
    });

    it('resumes practice_followup and persists user reply to checkpoint messages', async () => {
      const checkpointer = new MemorySaver();
      const graph = new StateGraph(PracticeAnnotation)
        .addNode('conversation', handleConversationNode(mockDeps))
        .addNode('complete', async (_state: any) => ({ done: true }))
        .addEdge(START, 'conversation')
        .addEdge('conversation', 'complete')
        .addEdge('complete', END)
        .compile({ checkpointer });

      const threadId = 'test-thread-hint-resume-persistence';

      const stream1 = await graph.stream(
        {
          practice: {
            ...DEFAULT_PRACTICE_STATE,
            userIntent: 'off_topic',
            hintsGiven: 0,
            conversationTurns: 0,
            currentQuestion: 'What is a closure in JavaScript?',
            focusConcepts: ['closure', 'scope'],
          },
          topic: 'JavaScript',
          userAnswer: 'Let’s talk about something else',
        },
        { configurable: { thread_id: threadId }, streamMode: 'updates' as const },
      );

      let interruptPrompt: string | undefined;
      for await (const evt of stream1) {
        if (isInterruptEvent(evt)) {
          interruptPrompt = String((extractInterrupt(evt) as any)?.prompt ?? '');
          break;
        }
      }
      expect(interruptPrompt).toContain("Let's focus on the question");

      const resumeText = 'Thanks, let me try again.';
      const stream2 = await graph.stream(
        new Command({ resume: resumeText }),
        { configurable: { thread_id: threadId }, streamMode: 'updates' as const },
      );

      let lastConversationUpdate: any = null;
      for await (const evt of stream2) {
        if ((evt as any)?.conversation) {
          lastConversationUpdate = (evt as any).conversation;
        }
      }

      expect(lastConversationUpdate?.userAnswer).toBe(resumeText);
      expect(lastConversationUpdate?.messages?.[0]).toBeInstanceOf(AIMessage);
      expect(lastConversationUpdate?.messages?.[0]?.content).toBe(interruptPrompt);
      expect(lastConversationUpdate?.messages?.[1]).toBeInstanceOf(HumanMessage);
      expect(lastConversationUpdate?.messages?.[1]?.content).toBe(resumeText);

      const tuple = await checkpointer.getTuple({ configurable: { thread_id: threadId } } as any);
      expect(tuple).toBeDefined();

      const savedMessages = (tuple as any)?.checkpoint?.channel_values?.messages as any[] | undefined;
      expect(Array.isArray(savedMessages)).toBe(true);
      expect(
        (savedMessages ?? []).some((m) => HumanMessage.isInstance(m) && m.content === resumeText),
      ).toBe(true);
    });

    it('handles max conversation turns with streaming interrupt', async () => {
      const graph = createTestGraph();

      const threadId = 'test-thread-max-turns-stream';

      // Use streaming mode
      const stream = await graph.stream(
        {
          practice: {
            ...DEFAULT_PRACTICE_STATE,
            userIntent: 'thinking_aloud',
            hintsGiven: 0,
            conversationTurns: 4, // At the limit
            currentQuestion: 'What is a closure?',
            focusConcepts: ['closure'],
          },
          topic: 'JavaScript',
          userAnswer: 'Let me think about this...',
        },
        {
          configurable: { thread_id: threadId },
          streamMode: 'updates' as const,
        }
      );

      let gotInterrupt = false;
      for await (const evt of stream) {
        if (isInterruptEvent(evt)) {
          gotInterrupt = true;
          // Extract and verify the interrupt
          const interruptValue = extractInterrupt(evt) as any;
          // Should be a practice_final_attempt interrupt
          expect(interruptValue.type).toBe('practice_final_attempt');
          expect(interruptValue.prompt).toContain('conversation');
          break;
        }
      }

      expect(gotInterrupt).toBe(true);
    });

    it('preserves other state properties during graph execution', async () => {
      const graph = createTestGraph();

      const threadId = 'test-thread-state-preservation';
      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          userIntent: 'give_up' as UserIntent,
          hintsGiven: 0,
          conversationTurns: 0,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          attemptCount: 2,
          failureStreak: 0,
          needsRemediation: false,
          shouldCircuitBreak: false,
        },
        topic: 'JavaScript',
        userAnswer: 'I give up',
        mastery: 0.5,
      };

      const result = await graph.invoke(state, { configurable: { thread_id: threadId } });

      // Should preserve non-practice state
      expect(result.mastery).toBe(0.5);
      expect(result.topic).toBe('JavaScript');

      // Practice-specific state should be updated
      expect(result.practice.isComplete).toBe(true);
    });

    /**
     * Alternative Approach: Multiple invocations with same thread_id
     *
     * This approach uses checkpointing to save state between invocations:
     *
     * ```typescript
     * it('resumes after interrupt with multiple invocations', async () => {
     *   const graph = createTestGraph();
     *   const threadId = 'test-multiple-invocations';
     *
     *   // First invocation - will hit interrupt
     *   const stream1 = await graph.stream(initialState, {
     *     configurable: { thread_id: threadId },
     *     streamMode: 'updates'
     *   });
     *
     *   // Consume until interrupt
     *   for await (const evt of stream1) {
     *     if (evt?.__interrupt__) break;
     *   }
     *
     *   // Second invocation with same thread_id - resumes from checkpoint
     *   const result = await graph.invoke({}, {
     *     configurable: { thread_id: threadId }
     *   });
     *
     *   // Verify state was preserved and updated
     *   expect(result.practice.conversationTurns).toBeGreaterThan(0);
     * });
     * ```
     *
     * This demonstrates that StateGraph CAN test interrupts - you just need to:
     * 1. Use streaming mode (`streamMode: 'updates'`)
     * 2. Listen for interrupt events (`evt?.__interrupt__`)
     * 3. Either resume with new input or verify the interrupt payload
     */
  });
});
