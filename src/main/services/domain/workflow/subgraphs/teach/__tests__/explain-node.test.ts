import { describe, it, expect, vi, beforeEach } from 'vitest';
import { explainNode } from '../nodes/explain';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import { TeachState, DEFAULT_TEACH_STATE } from '../types';

describe('explain node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate initial explanation for round 1', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `Let's explore closures in JavaScript!

A closure is a function that remembers the environment in which it was created. Think of it like a backpack that a function carries with it, containing all the variables from its birthplace.

Example:
\`\`\`javascript
function createCounter() {
  let count = 0;  // This variable is "closed over"
  return function() {
    count++;
    return count;
  };
}

const counter = createCounter();
counter(); // Returns 1
counter(); // Returns 2
\`\`\`

The inner function "closes over" the count variable, keeping it alive even after createCounter() finishes running.

Does this make sense? Would you like me to explain any part in more detail?`,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = explainNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
      gaps: [],
      understandingLevel: 0.3,
    };

    const topic = 'JavaScript Closures';

    const result = await explainNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Verify model was called
    expect(mockProviderFactory.getModel).toHaveBeenCalled();

    // Verify explanation was generated
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toBeInstanceOf(AIMessage);
    expect(result.messages[0].content).toContain('closure');
    expect(result.messages[0].content).toContain('JavaScript');

    // Verify state updates
    expect(result.teach).toBeDefined();
    expect(result.teach.teachingRound).toBe(1);
  });

  it('should generate gap-focused explanation for subsequent rounds', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `Great question about closure edge cases!

Let me explain the common pitfalls:

1. **Memory Leaks**: Closures can prevent garbage collection
\`\`\`javascript
// Bad - keeps largeObject in memory
function bad() {
  const largeObject = new Array(1000000);
  return () => largeObject[0];
}
\`\`\`

2. **Loop Variables**: Classic mistake with var
\`\`\`javascript
// Bad - all callbacks print 5
for (var i = 0; i < 5; i++) {
  setTimeout(() => console.log(i), 100);
}
\`\`\`

Solutions:
- Use let instead of var
- Create new scope for each iteration
- Use IIFE (Immediately Invoked Function Expression)

What specific edge case were you wondering about?`,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 2,
      gaps: ['closure edge cases', 'memory leaks'],
      understandingLevel: 0.6,
    };

    const topic = 'JavaScript Closures';

    const result = await explainNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Should focus on gaps
    expect(result.messages[0].content).toContain('edge cases');
    expect(result.messages[0].content).toContain('memory');
  });

  it('should handle different understanding levels', async () => {
    const testLevels = [
      { level: 0.1, expected: 'beginner-friendly' },
      { level: 0.5, expected: 'moderate depth' },
      { level: 0.8, expected: 'advanced concepts' },
    ];

    for (const { level, expected } of testLevels) {
      vi.clearAllMocks();

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: `Explanation at level ${level}`,
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const state: TeachState = {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 1,
        understandingLevel: level,
      };

      const topic = 'Test Topic';

      await explainNode(createMockDeps())(
        state,
        topic,
        createMockConfig()
      );

      // Verify model was called with understanding level context
      expect(mockProviderFactory.getModel).toHaveBeenCalled();
    }
  });

  it('should use interrupt to wait for user response', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Explanation content',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
    };

    const topic = 'Test Topic';

    const result = await explainNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Verify interrupt was called
    expect(vi.mocked(vi.importedMock('@langchain/langgraph').interrupt))
      .toHaveBeenCalled();
  });

  it('should handle empty topic gracefully', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Unable to explain without topic',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
    };

    const topic = '';

    const result = await explainNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Should still generate a response
    expect(result.messages).toBeDefined();
    expect(result.messages[0]).toBeInstanceOf(AIMessage);
  });

  it('should emit chunks for streaming if config provides writer', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Streaming explanation content',
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

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
    };

    const topic = 'Test Topic';

    await explainNode(createMockDeps())(
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
        content: 'Non-streaming explanation',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
    };

    const topic = 'Test Topic';

    // Should work without config
    const result = await explainNode(createMockDeps())(
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

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
    };

    const topic = 'Test Topic';

    await expect(
      explainNode(createMockDeps())(
        state,
        topic,
        createMockConfig()
      )
    ).rejects.toThrow('Model unavailable');
  });

  it('should increment teaching round', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Explanation',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
    };

    const topic = 'Test Topic';

    const result = await explainNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Teaching round should be incremented for next iteration
    expect(result.teach?.teachingRound).toBe(2);
  });

  it('should preserve gaps in state', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Explanation',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const gaps = ['gap1', 'gap2', 'gap3'];
    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
      gaps,
    };

    const topic = 'Test Topic';

    const result = await explainNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Gaps should be preserved
    expect(result.teach?.gaps).toEqual(gaps);
  });

  it('should build prompt with topic, round, and gaps', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Explanation',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 3,
      gaps: ['specific gap'],
    };

    const topic = 'Advanced Topic';

    await explainNode(createMockDeps())(
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

    // Should include system and human messages
    const systemMessage = messages.find((m: any) => m.role === 'system');
    const humanMessage = messages.find((m: any) => m.role === 'human');

    expect(systemMessage).toBeDefined();
    expect(humanMessage).toBeDefined();

    // Human message should include topic and round
    if (humanMessage) {
      expect(humanMessage.content).toContain('Advanced Topic');
      expect(humanMessage.content).toContain('3');
    }
  });

  it('should generate unique IDs for explanations', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Explanation',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const { generateId } = await import('../../../utils/chunk-emitter');

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
    };

    const topic = 'Test Topic';

    await explainNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Verify ID was generated
    expect(generateId).toHaveBeenCalled();
  });

  it('should update understanding level if provided', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Explanation',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
      understandingLevel: 0.5,
    };

    const topic = 'Test Topic';

    const result = await explainNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Understanding level should be updated
    expect(result.teach?.understandingLevel).toBe(0.5);
  });

  it('should handle very long explanations', async () => {
    const longExplanation = 'x'.repeat(10000);

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: longExplanation,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
    };

    const topic = 'Test Topic';

    const result = await explainNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Should handle long content
    expect(result.messages[0].content.length).toBe(10000);
  });

  it('should respect maxRounds limit', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Explanation',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 5,
      maxRounds: 5,
    };

    const topic = 'Test Topic';

    const result = await explainNode(createMockDeps())(
      state,
      topic,
      createMockConfig()
    );

    // Should handle max rounds
    expect(result.teach?.teachingRound).toBe(5);
    expect(result.teach?.maxRounds).toBe(5);
  });
});
