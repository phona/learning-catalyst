import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assessUnderstandingNode } from '../nodes/assessUnderstanding';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import { TeachState, DEFAULT_TEACH_STATE } from '../types';

const createMockConfig = (): LangGraphRunnableConfig => ({
// Mock dependenciesconst createMockDeps = () => ({
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
          reason: 'Student demonstrates excellent understanding with insightful questions and clear explanations.',
        }),
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessUnderstandingNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 3,
      questionsAsked: 5,
      gaps: ['initial gap'],
    };

    const topic = 'JavaScript Closures';
    const conversationMessages = [
      { role: 'user', content: 'I understand now' },
      { role: 'assistant', content: 'Great! Can you explain?' },
      { role: 'user', content: 'Closures let inner functions access outer scope variables' },
    ];

    const result = await node(
      state,
      topic,
      conversationMessages,
      createMockConfig()
    );

    // Should assess high level
    expect(result.teach?.understandingLevel).toBe(0.92);
    expect(result.teach?.mastered).toBe(true);
    expect(result.teach?.gaps).toEqual([]);

    // Should have assessment message
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toBeInstanceOf(AIMessage);
    expect(result.messages[0].content).toContain('92%');
  });

  it('should assess partial understanding (not mastered)', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.65,
          gaps: ['memory implications', 'edge cases'],
          reason: 'Good basic understanding but missing some advanced concepts.',
        }),
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessUnderstandingNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 2,
      questionsAsked: 3,
      gaps: ['basic concept'],
    };

    const topic = 'JavaScript Closures';
    const conversationMessages = [
      { role: 'user', content: 'I think I get it' },
      { role: 'assistant', content: 'Can you give an example?' },
      { role: 'user', content: 'Um, something with functions?' },
    ];

    const result = await node(
      state,
      topic,
      conversationMessages,
      createMockConfig()
    );

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
          reason: 'Student shows significant confusion and needs foundational teaching.',
        }),
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessUnderstandingNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
      questionsAsked: 1,
      gaps: [],
    };

    const topic = 'JavaScript Closures';
    const conversationMessages = [
      { role: 'user', content: "I don't understand anything" },
    ];

    const result = await node(
      state,
      topic,
      conversationMessages,
      createMockConfig()
    );

    // Should assess low level
    expect(result.teach?.understandingLevel).toBe(0.35);
    expect(result.teach?.mastered).toBe(false);

    // Should identify many gaps
    expect(result.teach?.gaps.length).toBeGreaterThan(0);
  });

  it('should determine mastery at threshold (0.75)', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.75,
          gaps: [],
          reason: 'Exactly at mastery threshold.',
        }),
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessUnderstandingNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 2,
    };

    const topic = 'Test Topic';
    const conversationMessages = [];

    const result = await node(state, topic, conversationMessages, createMockConfig());

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
          reason: 'Just below mastery threshold.',
        }),
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessUnderstandingNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 2,
    };

    const topic = 'Test Topic';
    const conversationMessages = [];

    const result = await node(state, topic, conversationMessages, createMockConfig());

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
          "reason": "Test assessment"
        }`,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessUnderstandingNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
    };

    const topic = 'Test Topic';
    const conversationMessages = [];

    const result = await node(state, topic, conversationMessages, createMockConfig());

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
          "reason": "Clean assessment"
        }

        `,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessUnderstandingNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
    };

    const topic = 'Test Topic';
    const conversationMessages = [];

    const result = await node(state, topic, conversationMessages, createMockConfig());

    // Should handle whitespace
    expect(result.teach?.understandingLevel).toBe(0.85);
  });

  it('should handle empty conversation', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.0,
          gaps: ['no interaction'],
          reason: 'No conversation to assess.',
        }),
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessUnderstandingNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
    };

    const topic = 'Test Topic';
    const conversationMessages = [];

    const result = await node(state, topic, conversationMessages, createMockConfig());

    // Should handle empty conversation
    expect(result.teach).toBeDefined();
  });

  it('should handle very long conversation', async () => {
    const longConversation = Array.from({ length: 100 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
    }));

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.7,
          gaps: [],
          reason: 'Assessed long conversation.',
        }),
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessUnderstandingNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
    };

    const topic = 'Test Topic';

    const result = await node(state, topic, longConversation, createMockConfig());

    // Should handle long conversations
    expect(result.teach?.understandingLevel).toBe(0.7);
  });

  it('should preserve other teach state properties', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.8,
          gaps: [],
          reason: 'Test',
        }),
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessUnderstandingNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 3,
      understandingLevel: 0.6,
      assessmentReason: 'Previous assessment',
      questionsAsked: 5,
    };

    const topic = 'Test Topic';
    const conversationMessages = [];

    const result = await node(state, topic, conversationMessages, createMockConfig());

    // Should update only understanding level, mastered, gaps, and assessment reason
    expect(result.teach?.teachingRound).toBe(3);
    expect(result.teach?.understandingLevel).toBe(0.8); // updated
    expect(result.teach?.mastered).toBe(true); // updated
    expect(result.teach?.assessmentReason).toContain('Test');
    expect(result.teach?.questionsAsked).toBe(5);
  });

  it('should emit chunks for streaming if config provides writer', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.8,
          gaps: [],
          reason: 'Streaming assessment',
        }),
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

    const node = assessUnderstandingNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
    };

    const topic = 'Test Topic';
    const conversationMessages = [];

    await node(state, topic, conversationMessages, createMockConfig());

    // Verify chunk emitter was used
    expect(createChunkEmitter).toHaveBeenCalled();
    expect(mockEmitter.textStart).toHaveBeenCalled();
    expect(mockEmitter.textEnd).toHaveBeenCalled();
  });

  it('should work without streaming config', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.7,
          gaps: [],
          reason: 'Non-streaming assessment',
        }),
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessUnderstandingNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
    };

    const topic = 'Test Topic';
    const conversationMessages = [];

    // Should work without config
    const result = await node(state, topic, conversationMessages);

    expect(result.teach?.understandingLevel).toBe(0.7);
  });

  it('should propagate errors from model invocation', async () => {
    const mockModel = {
      invoke: vi.fn().mockRejectedValue(new Error('Model unavailable')),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessUnderstandingNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
    };

    const topic = 'Test Topic';
    const conversationMessages = [];

    await expect(
      node(state, topic, conversationMessages, createMockConfig())
    ).rejects.toThrow('Model unavailable');
  });

  it('should build prompt with topic and conversation', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.7,
          gaps: [],
          reason: 'Test',
        }),
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessUnderstandingNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
    };

    const topic = 'JavaScript Closures';
    const conversationMessages = [
      { role: 'user', content: 'Question about closures' },
      { role: 'assistant', content: 'Explanation' },
      { role: 'user', content: 'Thanks, I understand' },
    ];

    await node(state, topic, conversationMessages, createMockConfig());

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

    // User message should include topic
    if (userMessage) {
      expect(userMessage.content).toContain('Closures');
    }
  });

  it('should generate unique IDs for assessments', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.7,
          gaps: [],
          reason: 'Test',
        }),
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const { generateId } = await import('../../../utils/chunk-emitter');

    const node = assessUnderstandingNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
    };

    const topic = 'Test Topic';
    const conversationMessages = [];

    await node(state, topic, conversationMessages, createMockConfig());

    // Verify ID was generated
    expect(generateId).toHaveBeenCalled();
  });

  it('should handle empty topic gracefully', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.5,
          gaps: [],
          reason: 'No topic context',
        }),
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessUnderstandingNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
    };

    const topic = '';
    const conversationMessages = [{ role: 'user', content: 'Test' }];

    const result = await node(state, topic, conversationMessages, createMockConfig());

    // Should still assess
    expect(result.teach).toBeDefined();
  });

  it('should not interrupt (returns immediately)', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          level: 0.8,
          gaps: [],
          reason: 'Quick assessment',
        }),
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessUnderstandingNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
    };

    const topic = 'Test Topic';
    const conversationMessages = [];

    // Should return immediately without waiting
    const result = await node(state, topic, conversationMessages, createMockConfig());

    // Should have result
    expect(result).toBeDefined();
    expect(result.teach).toBeDefined();
  });
});
