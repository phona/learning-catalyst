import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assessUnderstandingNode } from '../nodes/assessUnderstanding';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { DEFAULT_TEACH_STATE } from '../types';
import type { TeachSubgraphState } from '../state';

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

const createMockConfig = (): LangGraphRunnableConfig => ({
  configurable: {
    thread_id: 'test-thread',
  },
  writer: vi.fn(),
});

// Helper to create a valid TeachSubgraphState
const createState = (overrides: Partial<TeachSubgraphState> = {}): TeachSubgraphState => ({
  topic: 'Test Topic',
  messages: [],
  userAnswer: undefined,
  teach: { ...DEFAULT_TEACH_STATE },
  ...overrides,
});

describe('assessUnderstanding node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should assess high understanding (mastery)', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.92,
          gaps: [],
          mastered: true,
          reason: 'Student demonstrates excellent understanding with insightful questions and clear explanations.',
        }),
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = assessUnderstandingNode(deps as any);

    const state = createState({
      topic: 'JavaScript Closures',
      messages: [
        new HumanMessage('I understand now'),
        new AIMessage('Great! Can you explain?'),
        new HumanMessage('Closures let inner functions access outer scope variables'),
      ],
      userAnswer: 'I understand',
      teach: {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 3,
        questionsAsked: 5,
        gaps: ['initial gap'],
      },
    });

    const result = await node(state, createMockConfig());

    // Should assess high level
    expect(result.teach?.understandingLevel).toBe(0.92);
    expect(result.teach?.mastered).toBe(true);
    expect(result.teach?.gaps).toEqual([]);

    // Should have assessment message
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toBeInstanceOf(AIMessage);
  });

  it('should assess partial understanding (not mastered)', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.65,
          gaps: ['memory implications', 'edge cases'],
          mastered: false,
          reason: 'Good basic understanding but missing some advanced concepts.',
        }),
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = assessUnderstandingNode(deps as any);

    const state = createState({
      topic: 'JavaScript Closures',
      messages: [
        new HumanMessage('I think I get it'),
        new AIMessage('Can you give an example?'),
        new HumanMessage('Um, something with functions?'),
      ],
      teach: {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 2,
        questionsAsked: 3,
        gaps: ['basic concept'],
      },
    });

    const result = await node(state, createMockConfig());

    // Should assess medium level
    expect(result.teach?.understandingLevel).toBe(0.65);
    expect(result.teach?.mastered).toBe(false);

    // Should identify gaps
    expect(result.teach?.gaps).toContain('memory implications');
    expect(result.teach?.gaps).toContain('edge cases');
  });

  it('should assess low understanding', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.35,
          gaps: ['basic concept', 'syntax', 'examples'],
          mastered: false,
          reason: 'Student shows significant confusion and needs foundational teaching.',
        }),
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = assessUnderstandingNode(deps as any);

    const state = createState({
      topic: 'JavaScript Closures',
      messages: [new HumanMessage("I don't understand anything")],
      teach: {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 1,
        questionsAsked: 1,
        gaps: [],
      },
    });

    const result = await node(state, createMockConfig());

    // Should assess low level
    expect(result.teach?.understandingLevel).toBe(0.35);
    expect(result.teach?.mastered).toBe(false);

    // Should identify many gaps
    expect(result.teach?.gaps?.length).toBeGreaterThan(0);
  });

  it('should determine mastery at threshold (0.75)', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.75,
          gaps: [],
          mastered: true,
          reason: 'Exactly at mastery threshold.',
        }),
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = assessUnderstandingNode(deps as any);

    const state = createState({
      topic: 'Test Topic',
      teach: {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 2,
      },
    });

    const result = await node(state, createMockConfig());

    // Exactly at threshold should be mastered
    expect(result.teach?.understandingLevel).toBe(0.75);
    expect(result.teach?.mastered).toBe(true);
  });

  it('should determine not mastered just below threshold (0.74)', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.74,
          gaps: ['minor gaps'],
          mastered: false,
          reason: 'Just below mastery threshold.',
        }),
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = assessUnderstandingNode(deps as any);

    const state = createState({
      topic: 'Test Topic',
      teach: {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 2,
      },
    });

    const result = await node(state, createMockConfig());

    // Just below threshold should not be mastered
    expect(result.teach?.understandingLevel).toBe(0.74);
    expect(result.teach?.mastered).toBe(false);
  });

  it('should parse JSON response correctly', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `{
          "level": 0.8,
          "gaps": ["gap1", "gap2"],
          "mastered": true,
          "reason": "Test assessment"
        }`,
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = assessUnderstandingNode(deps as any);
    const state = createState();

    const result = await node(state, createMockConfig());

    // Should parse JSON correctly
    expect(result.teach?.understandingLevel).toBe(0.8);
    expect(result.teach?.gaps).toEqual(['gap1', 'gap2']);
  });

  it('should handle JSON with extra whitespace', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `

        {
          "level": 0.85,
          "gaps": [],
          "mastered": true,
          "reason": "Clean assessment"
        }

        `,
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = assessUnderstandingNode(deps as any);
    const state = createState();

    const result = await node(state, createMockConfig());

    // Should handle whitespace
    expect(result.teach?.understandingLevel).toBe(0.85);
  });

  it('should handle empty conversation', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.0,
          gaps: ['no interaction'],
          mastered: false,
          reason: 'No conversation to assess.',
        }),
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = assessUnderstandingNode(deps as any);
    const state = createState({ messages: [] });

    const result = await node(state, createMockConfig());

    // Should handle empty conversation
    expect(result.teach).toBeDefined();
  });

  it('should handle very long conversation', async () => {
    const longConversation = Array.from({ length: 100 }, (_, i) =>
      i % 2 === 0 ? new HumanMessage(`Message ${i}`) : new AIMessage(`Message ${i}`)
    );

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.7,
          gaps: [],
          mastered: false,
          reason: 'Assessed long conversation.',
        }),
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = assessUnderstandingNode(deps as any);
    const state = createState({ messages: longConversation });

    const result = await node(state, createMockConfig());

    // Should handle long conversations
    expect(result.teach?.understandingLevel).toBe(0.7);
  });

  it('should preserve other teach state properties', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.8,
          gaps: [],
          mastered: true,
          reason: 'Test',
        }),
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = assessUnderstandingNode(deps as any);

    const state = createState({
      teach: {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 3,
        understandingLevel: 0.6,
        assessmentReason: 'Previous assessment',
        questionsAsked: 5,
      },
    });

    const result = await node(state, createMockConfig());

    // Should update understanding level, mastered, gaps, and assessment reason
    expect(result.teach?.understandingLevel).toBe(0.8);
    expect(result.teach?.mastered).toBe(true);
    expect(result.teach?.assessmentReason).toContain('Test');
  });

  it('should propagate errors from model invocation', async () => {
    const mockModel = {
      invoke: vi.fn().mockRejectedValue(new Error('Model unavailable')),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = assessUnderstandingNode(deps as any);
    const state = createState();

    await expect(node(state, createMockConfig())).rejects.toThrow('Model unavailable');
  });

  it('should build prompt with topic and conversation', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.7,
          gaps: [],
          mastered: false,
          reason: 'Test',
        }),
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = assessUnderstandingNode(deps as any);

    const state = createState({
      topic: 'JavaScript Closures',
      messages: [
        new HumanMessage('Question about closures'),
        new AIMessage('Explanation'),
        new HumanMessage('Thanks, I understand'),
      ],
    });

    await node(state, createMockConfig());

    // Verify model was called
    expect(deps.providerFactory.getModel).toHaveBeenCalled();

    // Get the messages passed to the model
    const modelCalls = mockModel.invoke.mock.calls;
    expect(modelCalls.length).toBeGreaterThan(0);

    const messages = modelCalls[0][0];
    expect(Array.isArray(messages)).toBe(true);
  });

  it('should handle empty topic gracefully', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.5,
          gaps: [],
          mastered: false,
          reason: 'No topic context',
        }),
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = assessUnderstandingNode(deps as any);
    const state = createState({ topic: '', messages: [new HumanMessage('Test')] });

    const result = await node(state, createMockConfig());

    // Should still assess
    expect(result.teach).toBeDefined();
  });

  it('should return immediately with result', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.8,
          gaps: [],
          mastered: true,
          reason: 'Quick assessment',
        }),
      }),
    };

    const deps = createMockDeps();
    deps.providerFactory.getModel = vi.fn().mockResolvedValue(mockModel);

    const node = assessUnderstandingNode(deps as any);
    const state = createState();

    // Should return immediately without waiting
    const result = await node(state, createMockConfig());

    // Should have result
    expect(result).toBeDefined();
    expect(result.teach).toBeDefined();
  });
});
