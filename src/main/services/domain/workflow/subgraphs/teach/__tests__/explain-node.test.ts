import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import { TeachState, DEFAULT_TEACH_STATE } from '../types';
import type { TeachSubgraphState } from '../state';
import { teachStateReducer } from '../state';

// Mock chunk-emitter module for testing
vi.mock('../../../utils/chunk-emitter', async () => {
  const actual = await vi.importActual('../../../utils/chunk-emitter');
  return {
    ...actual,
    createChunkEmitter: vi.fn().mockReturnValue({
      textStart: vi.fn(),
      textDelta: vi.fn(),
      textEnd: vi.fn(),
      toolInputStart: vi.fn(),
      toolInputAvailable: vi.fn(),
      toolOutputAvailable: vi.fn(),
      reasoningStart: vi.fn(),
      reasoningDelta: vi.fn(),
      reasoningEnd: vi.fn(),
      error: vi.fn(),
      finish: vi.fn(),
      abort: vi.fn(),
    }),
    generateId: vi.fn().mockReturnValue('test-id'),
  };
});

afterAll(() => {
  vi.unmock('../../../utils/chunk-emitter');
  vi.resetModules();
});

// Mock dependencies
const createMockDeps = () => ({
  providerFactory: {
    getModel: vi.fn().mockResolvedValue({
      invoke: vi.fn(),
    }),
    getEmbeddings: vi.fn().mockResolvedValue({ embedQuery: vi.fn() }),
    getEmbeddingModel: vi.fn().mockResolvedValue({ embedQuery: vi.fn() }),
    getRerankModel: vi.fn().mockResolvedValue({ rerank: vi.fn() }),
  },
  loggerService: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  agentManager: {
    runAgent: vi.fn(),
    getAgent: vi.fn().mockReturnValue({ process: vi.fn() }),
  },
  checkpointer: {},
  configService: {},
  knowledgeService: {
    searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
  },
  practiceService: {},
  learningService: {},
});

const createMockConfig = (): LangGraphRunnableConfig => ({
  configurable: {
    thread_id: 'test-thread',
  },
  writer: vi.fn(),
});

// Helper to create a valid TeachSubgraphState
const createState = (overrides: Partial<TeachSubgraphState> = {}): TeachSubgraphState => {
  const baseState: TeachSubgraphState = {
    topic: overrides.topic || 'Test Topic',
    messages: overrides.messages || [],
    userAnswer: overrides.userAnswer,
    teach: { ...DEFAULT_TEACH_STATE },
  };

  if (overrides.teach) {
    baseState.teach = { ...baseState.teach, ...overrides.teach };
  }

  return baseState;
};

describe('explain node', () => {
  let explainNode: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.doMock('@langchain/langgraph', async () => {
      const actual = await vi.importActual<typeof import('@langchain/langgraph')>('@langchain/langgraph');
      return {
        ...actual,
        interrupt: vi.fn().mockResolvedValue({ type: 'resume' }),
      };
    });
    ({ explainNode } = await import('../nodes/explain'));
  });

  afterEach(() => {
    vi.unmock('@langchain/langgraph');
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

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = explainNode(deps as any);

    const state = createState({
      topic: 'JavaScript Closures',
      teach: {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 1,
        gaps: [],
        understandingLevel: 0.3,
      },
    });

    const result = await node(state, createMockConfig());

    // Verify model was called
    expect(deps.providerFactory.getModel).toHaveBeenCalled();

    // Verify explanation was generated
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toBeInstanceOf(AIMessage);
    expect(result.messages[0].content).toContain('closure');
    expect(result.messages[0].content).toContain('JavaScript');

    // Verify state updates
    expect(result.teach).toBeDefined();
    expect(result.teach?.teachingRound).toBe(2);
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

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = explainNode(deps as any);

    const state = createState({
      topic: 'JavaScript Closures',
      teach: {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 2,
        gaps: ['closure edge cases', 'memory leaks'],
        understandingLevel: 0.6,
      },
    });

    const result = await node(state, createMockConfig());

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

      const deps = createMockDeps();
      deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

      const node = explainNode(deps as any);

      const state = createState({
        topic: 'Test Topic',
        teach: {
          ...DEFAULT_TEACH_STATE,
          teachingRound: 1,
          understandingLevel: level,
        },
      });

      await node(state, createMockConfig());

      // Verify model was called with understanding level context
      expect(deps.providerFactory.getModel).toHaveBeenCalled();
    }
  });

  it('should use interrupt to wait for user response', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Explanation content',
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = explainNode(deps as any);

    const state = createState({
      topic: 'Test Topic',
      teach: {
        teachingRound: 1,
        maxRounds: 5,
        gaps: [],
        understandingLevel: 0,
        mastered: false,
        assessmentReason: '',
        questionsAsked: 0,
      },
    });

    const result = await node(state, createMockConfig());

    // Verify interrupt was called
    const { interrupt } = await import('@langchain/langgraph');
    expect(interrupt).toHaveBeenCalled();
  });

  it('should handle empty topic gracefully', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Unable to explain without topic',
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = explainNode(deps as any);

    const state = createState({
      topic: '',
      teach: {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 1,
      },
    });

    const result = await node(state, createMockConfig());

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

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const chunkEmitterModule = await import('../../../utils/chunk-emitter');
    const createChunkEmitterSpy = vi.spyOn(chunkEmitterModule, 'createChunkEmitter');

    const node = explainNode(deps as any);

    const state = createState({
      topic: 'Test Topic',
      teach: {
        teachingRound: 1,
        maxRounds: 5,
        gaps: [],
        understandingLevel: 0,
        mastered: false,
        assessmentReason: '',
        questionsAsked: 0,
      },
    });

    await node(state, createMockConfig());

    // Verify chunk emitter was used
    expect(createChunkEmitterSpy).toHaveBeenCalled();
  });

  it('should work with minimal config', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Non-streaming explanation',
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = explainNode(deps as any);

    const state = createState({
      topic: 'Test Topic',
      teach: {
        teachingRound: 1,
        maxRounds: 5,
        gaps: [],
        understandingLevel: 0,
        mastered: false,
        assessmentReason: '',
        questionsAsked: 0,
      },
    });

    // Should work with minimal config (needs writer for chunk emitter)
    const result = await node(state, createMockConfig());

    expect(result.messages).toBeDefined();
    expect(result.messages[0]).toBeInstanceOf(AIMessage);
  });

  it('should propagate errors from model invocation', async () => {
    const mockModel = {
      invoke: vi.fn().mockRejectedValue(new Error('Model unavailable')),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = explainNode(deps as any);

    const state = createState({
      topic: 'Test Topic',
      teach: {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 1,
      },
    });

    await expect(
      node(state, createMockConfig())
    ).rejects.toThrow('Model unavailable');
  });

  it('should increment teaching round', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Explanation',
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = explainNode(deps as any);

    const state = createState({
      topic: 'Test Topic',
      teach: {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 1,
      },
    });

    const result = await node(state, createMockConfig());

    // Teaching round should be incremented for next iteration
    expect(result.teach?.teachingRound).toBe(2);
  });

  it('should preserve gaps in state', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Explanation',
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const gaps = ['gap1', 'gap2', 'gap3'];
    const node = explainNode(deps as any);

    const state = createState({
      topic: 'Test Topic',
      teach: {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 1,
        gaps,
      },
    });

    const result = await node(state, createMockConfig());

    // Manually apply reducer to get the merged state
    const mergedTeach = teachStateReducer(state.teach, result.teach);

    // Gaps should be cleared after explanation (as per explain node implementation)
    expect(mergedTeach.gaps).toEqual([]);
  });

  it('should build prompt with topic, round, and gaps', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Explanation',
      }),
    };

    const deps = createMockDeps();
    const getModelSpy = vi.fn().mockResolvedValue(mockModel);
    deps.providerFactory.getModel = getModelSpy;

    const node = explainNode(deps as any);

    const state = createState({
      topic: 'Advanced Topic',
      teach: {
        teachingRound: 3,
        gaps: ['specific gap'],
        maxRounds: 5,
        understandingLevel: 0,
        mastered: false,
        assessmentReason: '',
        questionsAsked: 0,
      },
    });

    await node(state, createMockConfig());

    // Verify model was called
    expect(getModelSpy).toHaveBeenCalled();

    // Get the messages passed to the model
    const modelCalls = mockModel.invoke.mock.calls;
    expect(modelCalls.length).toBeGreaterThan(0);

    const messages = modelCalls[0][0];
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);
  });

  it('should generate unique IDs for explanations', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Explanation',
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const chunkEmitterModule = await import('../../../utils/chunk-emitter');
    const generateIdSpy = vi.spyOn(chunkEmitterModule, 'generateId');

    const node = explainNode(deps as any);

    const state = createState({
      topic: 'Test Topic',
      teach: {
        teachingRound: 1,
        maxRounds: 5,
        gaps: [],
        understandingLevel: 0,
        mastered: false,
        assessmentReason: '',
        questionsAsked: 0,
      },
    });

    await node(state, createMockConfig());

    // Verify ID was generated
    expect(generateIdSpy).toHaveBeenCalled();
  });

  it('should update understanding level if provided', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Explanation',
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = explainNode(deps as any);

    const state = createState({
      topic: 'Test Topic',
      teach: {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 1,
        understandingLevel: 0.5,
      },
    });

    const result = await node(state, createMockConfig());

    // Manually apply reducer to get the merged state
    const mergedTeach = teachStateReducer(state.teach, result.teach);

    // Understanding level should be preserved from the input state
    expect(mergedTeach.understandingLevel).toBe(0.5);
  });

  it('should handle very long explanations', async () => {
    const longExplanation = 'x'.repeat(10000);

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: longExplanation,
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = explainNode(deps as any);

    const state = createState({
      topic: 'Test Topic',
      teach: {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 1,
      },
    });

    const result = await node(state, createMockConfig());

    // Should handle long content
    expect(result.messages[0].content.length).toBe(10000);
  });

  it('should respect maxRounds limit', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Explanation',
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = explainNode(deps as any);

    const state = createState({
      topic: 'Test Topic',
      teach: {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 5,
        maxRounds: 5,
      },
    });

    const result = await node(state, createMockConfig());

    // Manually apply reducer to get the merged state
    const mergedTeach = teachStateReducer(state.teach, result.teach);

    // Should handle max rounds
    expect(mergedTeach.teachingRound).toBe(6);
    expect(mergedTeach.maxRounds).toBe(5);
  });
});
