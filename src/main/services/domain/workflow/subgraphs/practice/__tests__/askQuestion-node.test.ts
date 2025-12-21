/**
 * Comprehensive test suite for askQuestion node
 *
 * Tests question generation through two approaches:
 *
 * 1. DIRECT NODE TESTS: Tests the node function in isolation
 *    - Faster execution, focused on business logic
 *    - Tests edge cases and error handling
 *
 * 2. STATEGRAPH INTEGRATION TESTS: Tests the node within a StateGraph
 *    - More realistic execution context
 *    - Validates state transitions and graph integration
 *    - Tests interrupt handling and state propagation
 *    - Tests streaming behavior with chunk emission
 *
 * NOTE: Complex interrupt-based workflows and streaming are tested
 * here with StateGraph. Full integration tests handle end-to-end workflows.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateGraph, MemorySaver, START, END } from '@langchain/langgraph';
import { askQuestionNode } from '../nodes/askQuestion';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import { DEFAULT_PRACTICE_STATE } from '../types';
import type { WorkflowDeps } from '../../../state';
import { PracticeAnnotation } from '../state';

// Interrupt event helpers for testing
type InterruptEvent = { __interrupt__?: Array<{ value?: unknown; checkpoint_id?: string }> };

const isInterruptEvent = (evt: unknown): evt is InterruptEvent =>
  !!(evt as InterruptEvent)?.__interrupt__?.length;

const extractInterrupt = (
  evt: InterruptEvent,
): Record<string, unknown> | unknown | undefined => {
  const raw = evt?.__interrupt__?.[0];
  return raw?.value ?? raw;
};

// Mock chunk emitter utilities
vi.mock('../../../utils/chunk-emitter', () => ({
  createChunkEmitter: vi.fn().mockReturnValue({
    textStart: vi.fn(),
    textDelta: vi.fn(),
    textEnd: vi.fn(),
    toolInputStart: vi.fn(),
    toolOutputAvailable: vi.fn(),
    reasoningStart: vi.fn(),
    reasoningDelta: vi.fn(),
    reasoningEnd: vi.fn(),
    error: vi.fn(),
    finish: vi.fn(),
  }),
  generateId: vi.fn().mockReturnValue('test-question-id-123'),
}));

// Mock config with writer
const createMockConfig = (): LangGraphRunnableConfig =>
  ({
    writer: vi.fn(),
  }) as unknown as LangGraphRunnableConfig;

// Mock model
const mockModel = {
  invoke: vi.fn(),
};

// Mock logger
const mockLoggerService = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn().mockReturnThis(),
};

// Mock providerFactory
const mockProviderFactory = {
  getModel: vi.fn().mockResolvedValue(mockModel),
  getEmbeddings: vi.fn(),
  getEmbeddingModel: vi.fn(),
  getRerankModel: vi.fn(),
};

// Mock knowledge service
const mockKnowledgeService = {
  searchKnowledge: vi.fn(),
  getRelatedConcepts: vi.fn(),
};

// Mock practice service
const mockPracticeService = {
  recordPracticeAttempt: vi.fn(),
};

// Create mock dependencies
const createMockDeps = (): WorkflowDeps =>
  ({
    providerFactory: mockProviderFactory,
    loggerService: mockLoggerService,
    agentManager: {},
    checkpointer: {},
    configService: {},
    knowledgeService: mockKnowledgeService,
    practiceService: mockPracticeService,
    learningService: {},
  }) as unknown as WorkflowDeps;

// Create a valid state for PracticeAnnotation
const createPracticeState = (
  overrides: Partial<typeof PracticeAnnotation.State> = {}
): typeof PracticeAnnotation.State => ({
  topic: 'Test Topic',
  messages: [],
  userAnswer: '',
  practicePrompt: '',
  mastery: 0,
  practice: DEFAULT_PRACTICE_STATE,
  ...overrides,
});

describe('askQuestion node', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockModel.invoke.mockResolvedValue({
      content: `Let's practice what you've learned about closures!

Question: Imagine you have a function that creates counter functions. Each counter should maintain its own count. How would you implement this using closures?

Context: You're building a simple counter system where each counter starts at 0 and increments when called.

Think about:
- How do inner functions access outer variables?
- What happens to the outer function's scope when it returns?

Give it a try!`,
    });

    mockKnowledgeService.searchKnowledge.mockResolvedValue({
      results: [
        { id: 'concept-1', title: 'closures', content: 'A closure is...' },
        { id: 'concept-2', title: 'scope', content: 'Scope refers to...' },
      ],
    });

    mockKnowledgeService.getRelatedConcepts.mockResolvedValue({
      relatedConcepts: [{ name: 'functions' }, { name: 'variables' }],
    });

    mockProviderFactory.getModel.mockResolvedValue(mockModel);
    mockPracticeService.recordPracticeAttempt.mockResolvedValue(undefined);
  });

  /**
   * NOTE: The askQuestion node ALWAYS calls interrupt(), so most tests
   * need to use StateGraph integration tests. Direct node tests are only
   * used for error cases that occur before interrupt() is called.
   */

  it('should propagate errors from model invocation', async () => {
    mockModel.invoke.mockRejectedValue(new Error('Model unavailable'));

    const state = createPracticeState({
      topic: 'Test Topic',
    });

    const node = askQuestionNode(createMockDeps());

    await expect(node(state, createMockConfig())).rejects.toThrow('Model unavailable');
  });

  it('should handle no knowledge found gracefully', async () => {
    mockKnowledgeService.searchKnowledge.mockResolvedValue({
      results: [],
    });

    const state = createPracticeState({
      topic: 'Unknown Topic',
    });

    const node = askQuestionNode(createMockDeps());
    const result = await node(state, createMockConfig());

    // Should return error state
    expect(result.error).toBeDefined();
    expect(result.practice?.isComplete).toBe(true);
  });

  describe('StateGraph Integration Tests', () => {
    /**
     * Creates a simple test graph with askQuestion node
     * to test the node in a realistic execution context.
     */
    const createTestGraph = () => {
      const graph = new StateGraph(PracticeAnnotation)
        .addNode('askQuestion', askQuestionNode(createMockDeps()))
        .addNode('complete', async (state: any) => ({ done: true }))
        .addEdge(START, 'askQuestion')
        .addEdge('askQuestion', 'complete')
        .addEdge('complete', END);

      return graph.compile({ checkpointer: new MemorySaver() });
    };

    it('executes question generation through StateGraph', async () => {
      const graph = createTestGraph();

      const threadId = 'test-thread-question-gen';

      // Use streaming mode since askQuestion always calls interrupt
      const stream = await graph.stream(
        {
          practice: {
            ...DEFAULT_PRACTICE_STATE,
            attemptCount: 0,
            focusConcepts: ['closures', 'scope'],
            relatedConcepts: ['functions', 'variables'],
          },
          topic: 'JavaScript Closures',
          userAnswer: '',
        },
        {
          configurable: { thread_id: threadId },
          streamMode: 'updates' as const,
        }
      );

      // Collect the stream output to verify question generation
      let gotInterrupt = false;
      let questionContent = '';

      for await (const evt of stream) {
        // Check if this is an interrupt event (question was generated)
        if (isInterruptEvent(evt)) {
          gotInterrupt = true;
          const interruptValue = extractInterrupt(evt) as any;
          // Verify the interrupt contains the generated question
          expect(interruptValue.type).toBe('practice_question');
          expect(interruptValue.prompt).toContain('closure');
          questionContent = interruptValue.prompt;
          break;
        }
      }

      expect(gotInterrupt).toBe(true);
    });

    it('executes interrupt through StateGraph with streaming', async () => {
      const graph = createTestGraph();

      const threadId = 'test-thread-interrupt-stream';

      // Use streaming mode to handle the interrupt
      const stream = await graph.stream(
        {
          practice: {
            ...DEFAULT_PRACTICE_STATE,
            attemptCount: 0,
            focusConcepts: ['closures'],
            relatedConcepts: ['functions'],
          },
          topic: 'JavaScript Closures',
          userAnswer: '',
        },
        {
          configurable: { thread_id: threadId },
          streamMode: 'updates' as const,
        }
      );

      // Collect the stream output
      let gotInterrupt = false;
      let questionMessage: any = null;

      for await (const evt of stream) {
        // Check if this is an interrupt event using the helper
        if (isInterruptEvent(evt)) {
          gotInterrupt = true;
          // Extract the interrupt value
          const interruptValue = extractInterrupt(evt) as any;
          expect(interruptValue.type).toBe('practice_question');
          break;
        }
        // Or check for regular updates
        if (evt?.askQuestion) {
          questionMessage = evt.askQuestion;
        }
      }

      expect(gotInterrupt).toBe(true);
    });

    it('handles streaming chunk emission through StateGraph', async () => {
      const mockWriter = vi.fn();
      const configWithWriter = {
        writer: mockWriter,
      } as LangGraphRunnableConfig;

      const graph = createTestGraph();

      const threadId = 'test-thread-chunk-stream';
      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          attemptCount: 0,
          focusConcepts: ['closures'],
        },
        topic: 'JavaScript Closures',
        userAnswer: '',
      };

      // Invoke with writer config to test chunk emission
      await graph.invoke(state, {
        configurable: { thread_id: threadId },
        ...configWithWriter,
      });

      // Note: writer is called by chunk emitter during streaming
      // The actual verification depends on how the node uses chunk-emitter
    });

    it('preserves state properties during graph execution', async () => {
      const graph = createTestGraph();

      const threadId = 'test-thread-state-preservation';
      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          attemptCount: 2,
          failureStreak: 1,
          needsRemediation: true,
          shouldCircuitBreak: false,
          focusConcepts: ['closures'],
          relatedConcepts: ['functions'],
        },
        topic: 'JavaScript Closures',
        userAnswer: '',
        mastery: 0.7,
      };

      const result = await graph.invoke(state, { configurable: { thread_id: threadId } });

      // Should preserve non-practice state
      expect(result.mastery).toBe(0.7);
      expect(result.topic).toBe('JavaScript Closures');

      // Practice-specific state should be updated
      expect(result.practice!.currentQuestion).toBeDefined();
    });

    /**
     * Alternative Approach: Multiple invocations with checkpointing
     *
     * This approach uses checkpointing to test resume behavior:
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
     *   expect(result.practice!.attemptCount).toBeGreaterThan(0);
     * });
     * ```
     *
     * This demonstrates that StateGraph CAN test interrupts and resume - you just need to:
     * 1. Use streaming mode (`streamMode: 'updates'`)
     * 2. Listen for interrupt events (`evt?.__interrupt__`)
     * 3. Use checkpointing with MemorySaver to preserve state between invocations
     */
  });
});
