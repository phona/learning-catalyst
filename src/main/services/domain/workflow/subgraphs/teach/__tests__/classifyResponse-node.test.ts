import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyResponseNode } from '../nodes/classifyResponse';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { TeachState, DEFAULT_TEACH_STATE, TeachIntent } from '../types';

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

describe('classifyResponse node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should classify question responses', async () => {
    const testQuestions = [
      'How do closures work?',
      'Can you explain this more?',
      'What is the difference between var and let?',
      'Why do we need closures?',
      'Could you give another example?',
    ];

    for (const question of testQuestions) {
      vi.clearAllMocks();

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'question',
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyResponseNode({
        providerFactory: mockProviderFactory,
      });

      const state: TeachState = {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 1,
      };

      const topic = 'JavaScript Closures';
      const userResponse = question;

      const result = await node(state, topic, userResponse, createMockConfig());

      // Should classify as question
      expect(result.teach?.teachIntent).toBe('question');
    }
  });

  it('should classify readiness signals', async () => {
    const readinessSignals = [
      'I understand now',
      'That makes sense',
      'I think I get it',
      'Ready to practice',
      'I am ready',
      'Got it, thanks',
      'I understand',
      'Makes perfect sense',
    ];

    for (const signal of readinessSignals) {
      vi.clearAllMocks();

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'ready',
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyResponseNode({
        providerFactory: mockProviderFactory,
      });

      const state: TeachState = {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 1,
      };

      const topic = 'Test Topic';
      const userResponse = signal;

      const result = await node(state, topic, userResponse, createMockConfig());

      expect(result.teach?.teachIntent).toBe('ready');
    }
  });

  it('should classify confusion responses', async () => {
    const confusionExpressions = [
      "I don't understand",
      "This is confusing",
      "I'm lost",
      "I don't get it",
      'This is unclear',
      "I'm confused",
      "I don't see how that works",
      "This doesn't make sense",
    ];

    for (const expression of confusionExpressions) {
      vi.clearAllMocks();

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'confused',
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyResponseNode({
        providerFactory: mockProviderFactory,
      });

      const state: TeachState = {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 1,
      };

      const topic = 'Test Topic';
      const userResponse = expression;

      const result = await node(state, topic, userResponse, createMockConfig());

      expect(result.teach?.teachIntent).toBe('confused');
    }
  });

  it('should classify needs_more responses', async () => {
    const needsMoreSignals = [
      'Can you explain more?',
      'I need more details',
      'Go deeper',
      'Can you give an example?',
      'More information please',
      'Elaborate on this',
      'Explain in more detail',
      'I want to know more',
    ];

    for (const signal of needsMoreSignals) {
      vi.clearAllMocks();

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'needs_more',
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyResponseNode({
        providerFactory: mockProviderFactory,
      });

      const state: TeachState = {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 1,
      };

      const topic = 'Test Topic';
      const userResponse = signal;

      const result = await node(state, topic, userResponse, createMockConfig());

      expect(result.teach?.teachIntent).toBe('needs_more');
    }
  });

  it('should classify off_topic responses', async () => {
    const offTopicResponses = [
      'What is the weather like?',
      'How about that game last night?',
      'I like pizza',
      'What time is it?',
      'My cat is cute',
      'I need to go shopping',
    ];

    for (const response of offTopicResponses) {
      vi.clearAllMocks();

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'off_topic',
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyResponseNode({
        providerFactory: mockProviderFactory,
      });

      const state: TeachState = {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 1,
      };

      const topic = 'JavaScript Closures';
      const userResponse = response;

      const result = await node(state, topic, userResponse, createMockConfig());

      expect(result.teach?.teachIntent).toBe('off_topic');
    }
  });

  it('should handle edge cases - very short responses', async () => {
    const shortResponses = [
      'Yes',
      'No',
      'OK',
      '?',
      'Hmm',
      'Wow',
    ];

    for (const response of shortResponses) {
      vi.clearAllMocks();

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'question', // Default classification
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyResponseNode({
        providerFactory: mockProviderFactory,
      });

      const state: TeachState = {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 1,
      };

      const topic = 'Test Topic';

      const result = await node(state, topic, response, createMockConfig());

      // Should still classify something
      expect(result.teach?.teachIntent).toBeDefined();
    }
  });

  it('should handle edge cases - very long responses', async () => {
    const longResponse = 'I have a question about closures. '.repeat(100);

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'question',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = classifyResponseNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
    };

    const topic = 'Test Topic';

    const result = await node(state, topic, longResponse, createMockConfig());

    // Should handle long responses
    expect(result.teach?.teachIntent).toBe('question');
  });

  it('should handle empty topic', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'question',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = classifyResponseNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
    };

    const topic = '';
    const userResponse = 'What is this about?';

    const result = await node(state, topic, userResponse, createMockConfig());

    // Should still classify
    expect(result.teach?.teachIntent).toBe('question');
  });

  it('should handle empty user response', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'confused',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = classifyResponseNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
    };

    const topic = 'Test Topic';
    const userResponse = '';

    const result = await node(state, topic, userResponse, createMockConfig());

    // Empty response might be classified as confused
    expect(result.teach?.teachIntent).toBe('confused');
  });

  it('should propagate errors from model invocation', async () => {
    const mockModel = {
      invoke: vi.fn().mockRejectedValue(new Error('Model unavailable')),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = classifyResponseNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
    };

    const topic = 'Test Topic';
    const userResponse = 'I have a question';

    await expect(
      node(state, topic, userResponse, createMockConfig())
    ).rejects.toThrow('Model unavailable');
  });

  it('should preserve teach state properties', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'ready',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = classifyResponseNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 3,
      gaps: ['gap1', 'gap2'],
      understandingLevel: 0.7,
      mastered: false,
      assessmentReason: 'Making progress',
      questionsAsked: 2,
    };

    const topic = 'Test Topic';
    const userResponse = 'I understand now';

    const result = await node(state, topic, userResponse, createMockConfig());

    // Should preserve state properties
    expect(result.teach?.teachingRound).toBe(3);
    expect(result.teach?.gaps).toEqual(['gap1', 'gap2']);
    expect(result.teach?.understandingLevel).toBe(0.7);
    expect(result.teach?.mastered).toBe(false);
    expect(result.teach?.assessmentReason).toBe('Making progress');
    expect(result.teach?.questionsAsked).toBe(2);
  });

  it('should only update teachIntent, not other state', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'question',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = classifyResponseNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
      gaps: ['initial gap'],
    };

    const topic = 'Test Topic';
    const userResponse = 'What is this?';

    const result = await node(state, topic, userResponse, createMockConfig());

    // Only teachIntent should change
    expect(result.teach?.teachIntent).toBe('question');
    expect(result.teach?.teachingRound).toBe(1); // unchanged
    expect(result.teach?.gaps).toEqual(['initial gap']); // unchanged
  });

  it('should work with different teaching rounds', async () => {
    const testRounds = [1, 2, 3, 4, 5];

    for (const round of testRounds) {
      vi.clearAllMocks();

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'ready',
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyResponseNode({
        providerFactory: mockProviderFactory,
      });

      const state: TeachState = {
        ...DEFAULT_TEACH_STATE,
        teachingRound: round,
      };

      const topic = 'Test Topic';
      const userResponse = 'Ready to practice';

      const result = await node(state, topic, userResponse, createMockConfig());

      expect(result.teach?.teachIntent).toBe('ready');
    }
  });

  it('should build prompt with topic and user response', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'question',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = classifyResponseNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
    };

    const topic = 'JavaScript Closures';
    const userResponse = 'How do closures work?';

    await node(state, topic, userResponse, createMockConfig());

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

    // User message should include topic and response
    if (userMessage) {
      expect(userMessage.content).toContain('Closures');
      expect(userMessage.content).toContain('How do closures work?');
    }
  });

  it('should not require streaming config', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'ready',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = classifyResponseNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
    };

    const topic = 'Test Topic';
    const userResponse = 'I understand';

    // Should work without config
    const result = await node(state, topic, userResponse);

    expect(result.teach?.teachIntent).toBe('ready');
  });

  it('should handle all TeachIntent values', async () => {
    const intents: TeachIntent[] = ['question', 'ready', 'confused', 'needs_more', 'off_topic'];

    for (const intent of intents) {
      vi.clearAllMocks();

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: intent,
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyResponseNode({
        providerFactory: mockProviderFactory,
      });

      const state: TeachState = {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 1,
      };

      const topic = 'Test Topic';
      const userResponse = 'Test response';

      const result = await node(state, topic, userResponse, createMockConfig());

      expect(result.teach?.teachIntent).toBe(intent);
    }
  });
});
