/**
 * [TC-401] fastTrackQuiz Node Tests
 *
 * Tests for the fastTrackQuiz node which handles diagnostic assessment
 * for high-confidence learners using LangGraph interrupt functionality.
 *
 * CRITICAL: This node calls interrupt() and requires special testing patterns
 * using StateGraph streaming as documented in testing.md.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command, StateGraph, MemorySaver, START, END } from '@langchain/langgraph';
import { RunnableLambda } from '@langchain/core/runnables';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';

import { fastTrackQuizNode } from '../fastTrackQuiz';
import { WorkflowStateAnnotation } from '../../state';
import { isInterruptEvent, extractInterrupt, type InterruptEvent } from '../../interrupt';

// Mock dependencies factory
const makeDeps = () => {
  const mockLlm = new RunnableLambda({
    func: async (_input) => {
      return new AIMessage(`Let's quickly check what you know about JavaScript closures:

1. Can you explain what a closure is in your own words?
2. How would you use a closure to create a private counter?
3. What's a practical scenario where closures are essential?

Share your thoughts - there are no wrong answers here!`);
    },
  });

  return {
    providerFactory: {
      getModel: vi.fn().mockResolvedValue(mockLlm),
    },
    loggerService: {
      child: vi.fn().mockReturnValue({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      }),
    },
  } as any;
};

// Mock config for chunk-emitter
const createMockConfig = (): LangGraphRunnableConfig => ({
  writer: vi.fn(),
} as any);

// Create test graph for interrupt testing
const createTestGraph = (mockDeps: any) => {
  const graph = new StateGraph(WorkflowStateAnnotation)
    .addNode('fastTrackQuiz', fastTrackQuizNode(mockDeps))
    .addNode('complete', async (state: any) => ({ done: true }))
    .addEdge(START, 'fastTrackQuiz')
    .addEdge('fastTrackQuiz', 'complete')
    .addEdge('complete', END);

  return graph.compile({ checkpointer: new MemorySaver() });
};

describe('[TC-401] fastTrackQuiz Node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Unit Tests (Logic before interrupt)', () => {
    it('returns current state when quiz already generated (resume case)', async () => {
      const deps = makeDeps();
      const node = fastTrackQuizNode(deps);

      const existingQuiz = 'Existing quiz content here...';
      const state = {
        topic: 'JavaScript Closures',
        confidence: 0.8,
        practicePrompt: existingQuiz,
        messages: [
          new HumanMessage('Test message'),
          new AIMessage(existingQuiz), // Matching message
        ],
      } as any;

      const result = await node(state, createMockConfig());

      // Should return unchanged state
      expect(result).toEqual(state);

      // Should NOT call the model
      expect(deps.providerFactory.getModel).not.toHaveBeenCalled();
    });

    // NOTE: The following unit tests would call interrupt() and fail.
    // According to testing.md, nodes that call interrupt() must be tested
    // with StateGraph streaming, not directly. See "Interrupt Tests" section below.

    // The tests for quiz generation, resume logic, and state management
    // are handled in the "Interrupt Tests" section with proper StateGraph setup.
  });

  describe('Interrupt Tests (with StateGraph streaming)', () => {
    it('executes interrupt through StateGraph with streaming', async () => {
      const deps = makeDeps();
      const graph = createTestGraph(deps);

      /**
       * Streaming mode required: fastTrackQuiz node calls interrupt() for user interaction
       * Using streamMode: 'updates' allows us to capture interrupt events
       */
      const stream = await graph.stream(
        {
          topic: 'JavaScript Closures',
          confidence: 0.85,
          messages: [new HumanMessage('I know this well')],
          practicePrompt: null,
        },
        {
          configurable: { thread_id: 'test-fast-track-interrupt' },
          streamMode: 'updates' as const,
        }
      );

      let gotInterrupt = false;
      let interruptValue: any = null;

      for await (const evt of stream) {
        if (isInterruptEvent(evt)) {
          gotInterrupt = true;
          interruptValue = extractInterrupt(evt) as any;
          break;
        }
      }

      expect(gotInterrupt).toBe(true);
      expect(interruptValue).toMatchObject({
        type: 'await_user_input',
        prompt: expect.stringContaining('what you know about JavaScript closures'),
        questionId: expect.any(String),
        instruction: expect.stringContaining('Answer the diagnostic questions'),
      });
    });

    it('handles resume with string answer', async () => {
      const deps = makeDeps();
      const graph = createTestGraph(deps);

      // First, generate the quiz
      const stream1 = await graph.stream(
        {
          topic: 'Python Basics',
          confidence: 0.9,
          messages: [],
          practicePrompt: null,
        },
        {
          configurable: { thread_id: 'test-resume-string' },
          streamMode: 'updates' as const,
          interruptAfter: ['fastTrackQuiz'],
        }
      );

      // Get the interrupt event
      let interruptEvent: InterruptEvent | null = null;
      for await (const evt of stream1) {
        if (isInterruptEvent(evt)) {
          interruptEvent = evt;
          break;
        }
      }

      expect(interruptEvent).not.toBeNull();

      // Resume with string answer
      const resumeAnswer = "A closure is a function that remembers its outer variables";

      const stream2 = await graph.stream(
        new Command({ resume: resumeAnswer }),
        {
          configurable: { thread_id: 'test-resume-string' },
          streamMode: 'updates' as const,
        }
      );

      // Check the final state
      let sawFastTrackQuizUpdate = false;
      for await (const update of stream2) {
        if (update.fastTrackQuiz) {
          sawFastTrackQuizUpdate = true;
          expect(update.fastTrackQuiz.userAnswer).toBe(resumeAnswer);
        }
      }
      expect(sawFastTrackQuizUpdate).toBe(true);
    });

    it('handles resume with object answer property', async () => {
      const deps = makeDeps();
      const graph = createTestGraph(deps);

      // Similar pattern but with object resume value
      const stream1 = await graph.stream(
        {
          topic: 'CSS Flexbox',
          confidence: 0.8,
          messages: [],
          practicePrompt: null,
        },
        {
          configurable: { thread_id: 'test-resume-object' },
          streamMode: 'updates' as const,
          interruptAfter: ['fastTrackQuiz'],
        }
      );

      // Get the interrupt event
      let interruptEvent: InterruptEvent | null = null;
      for await (const evt of stream1) {
        if (isInterruptEvent(evt)) {
          interruptEvent = evt;
          break;
        }
      }

      expect(interruptEvent).not.toBeNull();

      // Resume with object containing 'answer'
      const resumeAnswer = {
        answer: "Flexbox is a layout system for arranging items in rows or columns",
        confidence: "high"
      };

      const stream2 = await graph.stream(
        new Command({ resume: resumeAnswer }),
        {
          configurable: { thread_id: 'test-resume-object' },
          streamMode: 'updates' as const,
        }
      );

      // Check the final state
      let sawFastTrackQuizUpdate = false;
      for await (const update of stream2) {
        if (update.fastTrackQuiz) {
          sawFastTrackQuizUpdate = true;
          expect(update.fastTrackQuiz.userAnswer).toBe(resumeAnswer.answer);
        }
      }
      expect(sawFastTrackQuizUpdate).toBe(true);
    });

    it('handles resume with object content property', async () => {
      const deps = makeDeps();
      const graph = createTestGraph(deps);

      const stream1 = await graph.stream(
        {
          topic: 'Async JavaScript',
          confidence: 0.9,
          messages: [],
          practicePrompt: null,
        },
        {
          configurable: { thread_id: 'test-resume-content' },
          streamMode: 'updates' as const,
          interruptAfter: ['fastTrackQuiz'],
        }
      );

      // Get the interrupt event
      let interruptEvent: InterruptEvent | null = null;
      for await (const evt of stream1) {
        if (isInterruptEvent(evt)) {
          interruptEvent = evt;
          break;
        }
      }

      expect(interruptEvent).not.toBeNull();

      // Resume with object containing 'content'
      const resumeAnswer = {
        content: "Async code runs later using promises or async/await",
        metadata: { timeTaken: "2 minutes" }
      };

      const stream2 = await graph.stream(
        new Command({ resume: resumeAnswer }),
        {
          configurable: { thread_id: 'test-resume-content' },
          streamMode: 'updates' as const,
        }
      );

      // Check the final state
      let sawFastTrackQuizUpdate = false;
      for await (const update of stream2) {
        if (update.fastTrackQuiz) {
          sawFastTrackQuizUpdate = true;
          expect(update.fastTrackQuiz.userAnswer).toBe(resumeAnswer.content);
        }
      }
      expect(sawFastTrackQuizUpdate).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles model generation failure with StateGraph', async () => {
      const deps = makeDeps();
      deps.providerFactory.getModel.mockRejectedValue(
        new Error('Model generation failed')
      );
      const graph = createTestGraph(deps);

      // Test that the graph stream catches and propagates the error
      await expect(
        graph.stream(
          {
            topic: 'Test Topic',
            confidence: 0.8,
            messages: [],
            practicePrompt: null,
          },
          {
            configurable: { thread_id: 'test-error' },
            streamMode: 'updates' as const,
          }
        )
      ).rejects.toThrow('Model generation failed');
    });

    it('verifies diagnostic language in quiz prompt', async () => {
      // Create a custom LLM that checks the prompt
      const customLlm = new RunnableLambda({
        func: async (input) => {
          const prompt = input[0].content as string;
          expect(prompt).toContain('diagnostic');
          expect(prompt).toContain('≥ 75%');
          expect(prompt).toContain('2-3 diagnostic questions');
          expect(prompt).toContain('Let\'s see what you already know');

          return new AIMessage('Diagnostic quiz content with proper language');
        },
      });

      const deps = {
        providerFactory: {
          getModel: vi.fn().mockResolvedValue(customLlm),
        },
      } as any;

      const graph = createTestGraph(deps);

      const stream = await graph.stream(
        {
          topic: 'JavaScript Promises',
          confidence: 0.9, // High confidence
          messages: [],
          practicePrompt: null,
        },
        {
          configurable: { thread_id: 'test-diagnostic-prompt' },
          streamMode: 'updates' as const,
        }
      );

      // Verify the prompt was correctly formatted
      let gotInterrupt = false;
      for await (const evt of stream) {
        if (isInterruptEvent(evt)) {
          gotInterrupt = true;
          const interruptValue = extractInterrupt(evt) as any;
          expect(interruptValue.type).toBe('await_user_input');
          expect(interruptValue.prompt).toContain('Diagnostic quiz content');
          expect(interruptValue.instruction).toContain('Answer the diagnostic questions');
          break;
        }
      }

      expect(gotInterrupt).toBe(true);
    });
  });

  /**
   * Note on Testing Limitations:
   *
   * The fastTrackQuiz node calls interrupt(), which requires special testing patterns:
   *
   * 1. Unit tests can only verify logic BEFORE interrupt() (e.g., resume detection)
   * 2. All other logic must be tested via StateGraph streaming
   * 3. We cannot directly test question IDs, state updates after interrupt,
   *    or answer extraction in unit tests - these are verified implicitly
   *    through the StateGraph interrupt tests.
   *
   * This follows the patterns documented in testing.md under
   * "LangGraph Workflow Node Testing Best Practices".
   */
});
