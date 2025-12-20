/**
 * Unit Tests: Practice Subgraph - Ask Question Node
 *
 * PURPOSE:
 * Verify that the askQuestion node correctly generates practice questions
 * and initiates the practice flow. Entry point of the practice subgraph.
 *
 * TEST STRATEGY:
 * 1. Test question generation for various topics
 * 2. Test knowledge context inclusion
 * 3. Test interrupt behavior for user input
 * 4. Test streaming with chunk emitter
 * 5. Test question uniqueness (UUID generation)
 * 6. Test state updates (currentQuestion, attemptCount, etc.)
 * 7. Test error handling
 *
 * LANGGRAPH PATTERN:
 * - Direct LLM invocation with ChatPromptTemplate
 * - Uses interrupt() for user interaction
 * - Uses chunk-emitter for streaming
 * - Updates practice state (currentQuestion, attemptCount, etc.)
 *
 * DEPENDENCIES:
 * - providerFactory.getModel() for LLM
 * - chunk-emitter for streaming
 * - @langchain/langgraph interrupt
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { askQuestionNode } from '../nodes/askQuestion';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import { PracticeState, DEFAULT_PRACTICE_STATE } from '../types';

// Mock the interrupt function
vi.mock('@langchain/langgraph', () => ({
  interrupt: vi.fn().mockResolvedValue('User answer to question'),
}));

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

// Mock config writer
const createMockConfig = (): LangGraphRunnableConfig => ({
  writer: vi.fn(),
} as any);

// Mock dependencies
const createMockDeps = () => ({
  providerFactory: {
    getModel: vi.fn().mockResolvedValue({
      invoke: vi.fn(),
    }),
  },
  loggerService: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  agentManager: {},
  checkpointer: {},
  configService: {},
  knowledgeService: {},
  practiceService: {},
  learningService: {},
});

describe('askQuestion node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate practice question for topic', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `Let's practice what you've learned about closures!

Question: Imagine you have a function that creates counter functions. Each counter should maintain its own count. How would you implement this using closures?

Context: You're building a simple counter system where each counter starts at 0 and increments when called.

Think about:
- How do inner functions access outer variables?
- What happens to the outer function's scope when it returns?

Give it a try!`,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = askQuestionNode({
      providerFactory: mockProviderFactory,
    });

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
      attemptCount: 0,
      focusConcepts: ['closures', 'scope'],
      relatedConcepts: ['functions', 'variables'],
    };

    const topic = 'JavaScript Closures';

    const result = await askQuestionNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Verify question was generated
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toBeInstanceOf(AIMessage);
    expect(result.messages[0].content).toContain('closure');
    expect(result.messages[0].content).toContain('practice');

    // Verify state updates
    expect(result.practice).toBeDefined();
    expect(result.practice.currentQuestion).toBeDefined();
    expect(result.practice.attemptCount).toBe(1);
    expect(result.practice.conversationTurns).toBe(1);
  });

  it('should include knowledge context in question', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `Question about closures:

Given this code:
\`\`\`javascript
function outer() {
  let count = 0;
  return function() {
    count++;
    return count;
  };
}
\`\`\`

What will happen when you call the returned function twice?`,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
      focusConcepts: ['closures', 'scope', 'lexical environment'],
      relatedConcepts: ['functions', 'variables', 'memory'],
    };

    const topic = 'JavaScript Closures';

    await askQuestionNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Verify model was called with context
    expect(mockProviderFactory.getModel).toHaveBeenCalled();
  });

  it('should handle empty focus concepts', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Question without specific focus concepts',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
      focusConcepts: [],
      relatedConcepts: [],
    };

    const topic = 'JavaScript Basics';

    const result = await askQuestionNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Should still generate a question
    expect(result.messages[0].content).toBeDefined();
    expect(result.practice?.currentQuestion).toBeDefined();
  });

  it('should use interrupt to wait for user response', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Question content',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
      attemptCount: 0,
    };

    const topic = 'Test Topic';

    const result = await askQuestionNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Verify interrupt was called
    expect(vi.mocked(vi.importedMock('@langchain/langgraph').interrupt))
      .toHaveBeenCalled();
  });

  it('should increment attempt count', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Question',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const initialAttempts = 3;

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
      attemptCount: initialAttempts,
    };

    const topic = 'Test Topic';

    const result = await askQuestionNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Should increment attempt count
    expect(result.practice?.attemptCount).toBe(initialAttempts + 1);
  });

  it('should increment conversation turns', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Question',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
      conversationTurns: 5,
    };

    const topic = 'Test Topic';

    const result = await askQuestionNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Should increment conversation turns
    expect(result.practice?.conversationTurns).toBe(6);
  });

  it('should generate unique question IDs', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Question',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const { generateId } = await import('../../../utils/chunk-emitter');

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
    };

    const topic = 'Test Topic';

    await askQuestionNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Verify unique ID was generated
    expect(generateId).toHaveBeenCalled();
  });

  it('should emit chunks for streaming if config provides writer', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Streaming question content',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const { createChunkEmitter } = await import('../../../utils/chunk-emitter');
    const mockEmitter = {
      textStart: vi.fn(),
      textDelta: vi.fn(),
      textEnd: vi.fn(),
      toolInputStart: vi.fn(),
      toolOutputAvailable: vi.fn(),
    };
    vi.mocked(createChunkEmitter).mockReturnValue(mockEmitter as any);

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
    };

    const topic = 'Test Topic';

    await askQuestionNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Verify chunk emitter was used
    expect(createChunkEmitter).toHaveBeenCalled();
    expect(mockEmitter.textStart).toHaveBeenCalled();
    expect(mockEmitter.textEnd).toHaveBeenCalled();
  });

  it('should work without streaming config', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Non-streaming question',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
    };

    const topic = 'Test Topic';

    // Should work without config
    const result = await askQuestionNode(createMockDeps())(
      state,
      topic
    );

    expect(result.messages).toBeDefined();
    expect(result.messages[0]).toBeInstanceOf(AIMessage);
  });

  it('should propagate errors from model invocation', async () => {
    const mockModel = {
      invoke: vi.fn().mockRejectedValue(new Error('Model unavailable')),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
    };

    const topic = 'Test Topic';

    await expect(
      askQuestionNode(createMockDeps())(
        state,
        topic,
        createMockConfig()
      )
    ).rejects.toThrow('Model unavailable');
  });

  it('should handle empty topic gracefully', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Question without topic context',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
    };

    const topic = '';

    const result = await askQuestionNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Should still generate a question
    expect(result.messages[0].content).toBeDefined();
    expect(result.practice?.currentQuestion).toBeDefined();
  });

  it('should preserve other practice state properties', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Question',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
      currentQuestion: 'Previous question',
      expectedAnswer: 'Previous answer',
      hintsGiven: 2,
      isComplete: false,
      focusConcepts: ['concept1', 'concept2'],
      relatedConcepts: ['related1'],
      attemptCount: 1,
      failureStreak: 1,
      needsRemediation: true,
      shouldCircuitBreak: false,
    };

    const topic = 'Test Topic';

    const result = await askQuestionNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Should preserve existing properties
    expect(result.practice?.hintsGiven).toBe(2);
    expect(result.practice?.isComplete).toBe(false);
    expect(result.practice?.focusConcepts).toEqual(['concept1', 'concept2']);
    expect(result.practice?.relatedConcepts).toEqual(['related1']);
    expect(result.practice?.failureStreak).toBe(1);
    expect(result.practice?.needsRemediation).toBe(true);
    expect(result.practice?.shouldCircuitBreak).toBe(false);
  });

  it('should build prompt with topic and concepts', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Question',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
      focusConcepts: ['closures', 'scope'],
      relatedConcepts: ['functions'],
    };

    const topic = 'JavaScript Closures';

    await askQuestionNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Verify model was called
    expect(mockProviderFactory.getModel).toHaveBeenCalled();

    // Get the messages passed to the model
    const modelCalls = mockModel.invoke.mock.calls;
    expect(modelCalls.length).toBeGreaterThan(0);

    const messages = modelCalls[0][0];
    expect(Array.isArray(messages)).toBe(true);

    // Should include system and user messages
    const systemMessage = messages.find((m: any) => m.role === 'system');
    const userMessage = messages.find((m: any) => m.role === 'user');

    expect(systemMessage).toBeDefined();
    expect(userMessage).toBeDefined();

    // User message should include topic and concepts
    if (userMessage) {
      expect(userMessage.content).toContain('Closures');
    }
  });

  it('should handle very long topic names', async () => {
    const longTopic = 'Advanced JavaScript Concepts Including Closures Scope Chain and Memory Management'.repeat(5);

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Question for long topic',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
    };

    const result = await askQuestionNode(createMockDeps())(
      state,
      longTopic,
      createMockConfig()
    );

    // Should handle long topics
    expect(result.messages[0].content).toBeDefined();
  });

  it('should handle many focus concepts', async () => {
    const manyConcepts = Array.from({ length: 10 }, (_, i) => `concept${i}`);

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Question',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
      focusConcepts: manyConcepts,
    };

    const topic = 'Test Topic';

    const result = await askQuestionNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Should handle many concepts
    expect(result.practice?.focusConcepts).toEqual(manyConcepts);
  });

  it('should reset current question on new ask', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'New question',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
      currentQuestion: 'Old question',
      expectedAnswer: 'Old answer',
    };

    const topic = 'Test Topic';

    const result = await askQuestionNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Should update current question
    expect(result.practice?.currentQuestion).toBe('New question');
  });

  it('should generate conversational questions', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `Great job on the previous explanation! Let's practice.

Here's a question to test your understanding:

Can you think of a situation where you'd want to use a closure in real code? Try to come up with a specific example.

Don't worry if you're not sure - we can work through it together!`,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
    };

    const topic = 'Closures';

    const result = await askQuestionNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Should have conversational tone
    expect(result.messages[0].content).toMatch(/Great job|Let's practice/i);
    expect(result.messages[0].content).toContain('question');
  });

  it('should include context in question', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `Question with context:

You're building a todo list application. You want to create a function that generates unique IDs for each todo item.

Context: Each ID should increment automatically and never repeat.

Question: How would you implement this using closures?`,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
    };

    const topic = 'Closures';

    const result = await askQuestionNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Should include context
    expect(result.messages[0].content).toContain('context');
    expect(result.messages[0].content).toContain('todo');
  });

  it('should track question generation attempts', async () => {
    const testAttempts = [0, 1, 5, 10];

    for (const attempt of testAttempts) {
      vi.clearAllMocks();

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: `Question attempt ${attempt}`,
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const state: PracticeState = {
        ...DEFAULT_PRACTICE_STATE,
        attemptCount: attempt,
      };

      const topic = 'Test Topic';

      const result = await askQuestionNode(createMockDeps())(
        state,
        topic,
        createMockConfig()
      );

      // Should increment from initial value
      expect(result.practice?.attemptCount).toBe(attempt + 1);
    }
  });

  it('should mark practice as not complete when asking question', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Question',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
      isComplete: true, // Was complete
    };

    const topic = 'Test Topic';

    const result = await askQuestionNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Should reset to not complete
    expect(result.practice?.isComplete).toBe(false);
  });
});
