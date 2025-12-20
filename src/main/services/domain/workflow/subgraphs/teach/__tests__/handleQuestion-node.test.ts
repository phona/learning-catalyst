import { LangGraphRunnableConfig, MemorySaver, StateGraph } from '@langchain/langgraph';
import { handleQuestionNode } from '../nodes/handleQuestion';
import { DEFAULT_TEACH_STATE, TeachState } from '../types';
import { AIMessage } from 'langchain';
import { TeachAnnotation } from '../state';

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

describe('handleQuestion node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should answer user questions', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `Great question! Closures are created when an inner function
        accesses variables from its outer scope.

        Think of it like this: the inner function "remembers" the environment
        where it was born, even after the outer function has finished running.

        Example:
        \`\`\`javascript
        function outer() {
          const secret = 'I like pizza';
          return function inner() {
            console.log(secret); // Can access secret!
          };
        }
        \`\`\`

        Does this help clarify how closures work?`,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = handleQuestionNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
      questionsAsked: 0,
    };

    const topic = 'JavaScript Closures';
    const userResponse = 'How are closures created?';

    const result = await node(state, topic, userResponse, createMockConfig());

    // Verify answer was generated
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toBeInstanceOf(AIMessage);
    expect(result.messages[0].content).toContain('closure');
    expect(result.messages[0].content).toContain('question');

    // Verify question count incremented
    expect(result.teach?.questionsAsked).toBe(1);
  });

  it('should handle confusion with clarification', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `I understand this can be confusing! Let me explain differently.

        Think of a closure like a photo album. When you take a photo (create a function),
        it captures not just what's in the picture, but also the moment and place
        (the variables and scope) where it was taken.

        Even when you look at the photo later (call the function), it still remembers
        when and where it was taken (the variables).

        Does this analogy help make it clearer?`,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = handleQuestionNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 2,
      questionsAsked: 1,
    };

    const topic = 'JavaScript Closures';
    const userResponse = "I don't understand closures at all";

    const result = await node(state, topic, userResponse, createMockConfig());

    // Should provide clarification
    expect(result.messages[0].content).toContain('confusing');
    expect(result.messages[0].content).toContain('differently');

    // Question count should increment
    expect(result.teach?.questionsAsked).toBe(2);
  });

  it('should redirect off_topic responses', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `I notice your response isn't about closures. Let's stay focused
        on our topic.

        We were discussing how closures work in JavaScript. You mentioned earlier
        that you wanted to understand them better.

        Would you like me to explain closures again, or do you have a specific
        question about them?`,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = handleQuestionNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
      questionsAsked: 0,
    };

    const topic = 'JavaScript Closures';
    const userResponse = 'What is the weather like today?';

    const result = await node(state, topic, userResponse, createMockConfig());

    // Should redirect to topic
    expect(result.messages[0].content).toContain('not about closures');
    expect(result.messages[0].content).toContain('focused');

    // Question count should increment
    expect(result.teach?.questionsAsked).toBe(1);
  });

  it('should track question count across multiple questions', async () => {
    const questionCount = 5;

    for (let i = 0; i < questionCount; i++) {
      vi.clearAllMocks();

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: `Answer to question ${i + 1}`,
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = handleQuestionNode({
        providerFactory: mockProviderFactory,
      });

      const state: TeachState = {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 1,
        questionsAsked: i,
      };

      const topic = 'Test Topic';
      const userResponse = `Question ${i + 1}`;

      const result = await node(state, topic, userResponse, createMockConfig());

      // Question count should increment
      expect(result.teach?.questionsAsked).toBe(i + 1);
    }
  });

  it('should use interrupt to wait for follow-up', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Answer to question',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = handleQuestionNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
      questionsAsked: 0,
    };

    const topic = 'Test Topic';
    const userResponse = 'What is this?';

    const graph = new StateGraph(TeachAnnotation).addNode('handleQuestion', node).compile({checkpointer: new MemorySaver()});

    const result = await node(state, topic, userResponse, createMockConfig());

    // Verify interrupt was called
    expect(vi.mocked(vi.importedMock('@langchain/langgraph').interrupt))
      .toHaveBeenCalled();
  });

  it('should respect MAX_QUESTIONS limit', async () => {
    const MAX_QUESTIONS = 10;

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Answer',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = handleQuestionNode({
      providerFactory: mockProviderFactory,
    });

    // Test at the limit
    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
      questionsAsked: MAX_QUESTIONS - 1,
    };

    const topic = 'Test Topic';
    const userResponse = 'Last question';

    const result = await node(state, topic, userResponse, createMockConfig());

    // Should still handle the question
    expect(result.teach?.questionsAsked).toBe(MAX_QUESTIONS);
  });

  it('should handle very long questions', async () => {
    const longQuestion = 'What is a closure? '.repeat(200);

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Answer to long question',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = handleQuestionNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
      questionsAsked: 0,
    };

    const topic = 'Test Topic';

    const result = await node(state, topic, longQuestion, createMockConfig());

    // Should handle long questions
    expect(result.messages[0].content).toBeDefined();
    expect(result.teach?.questionsAsked).toBe(1);
  });

  it('should emit chunks for streaming if config provides writer', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Streaming answer content',
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

    const node = handleQuestionNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
      questionsAsked: 0,
    };

    const topic = 'Test Topic';
    const userResponse = 'What is this?';

    await node(state, topic, userResponse, createMockConfig());

    // Verify chunk emitter was used
    expect(createChunkEmitter).toHaveBeenCalled();
    expect(mockEmitter.textStart).toHaveBeenCalled();
    expect(mockEmitter.textEnd).toHaveBeenCalled();
  });

  it('should work without streaming config', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Non-streaming answer',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = handleQuestionNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
      questionsAsked: 0,
    };

    const topic = 'Test Topic';
    const userResponse = 'What is this?';

    // Should work without config
    const result = await node(state, topic, userResponse);

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

    const node = handleQuestionNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
      questionsAsked: 0,
    };

    const topic = 'Test Topic';
    const userResponse = 'What is this?';

    await expect(
      node(state, topic, userResponse, createMockConfig())
    ).rejects.toThrow('Model unavailable');
  });

  it('should preserve other teach state properties', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Answer',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = handleQuestionNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 3,
      gaps: ['gap1', 'gap2'],
      understandingLevel: 0.7,
      mastered: false,
      assessmentReason: 'Has questions',
      questionsAsked: 2,
    };

    const topic = 'Test Topic';
    const userResponse = 'What is this?';

    const result = await node(state, topic, userResponse, createMockConfig());

    // Should preserve properties
    expect(result.teach?.teachingRound).toBe(3);
    expect(result.teach?.gaps).toEqual(['gap1', 'gap2']);
    expect(result.teach?.understandingLevel).toBe(0.7);
    expect(result.teach?.mastered).toBe(false);
    expect(result.teach?.assessmentReason).toBe('Has questions');
  });

  it('should build prompt with topic and question', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Answer',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = handleQuestionNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
      questionsAsked: 0,
    };

    const topic = 'JavaScript Closures';
    const userResponse = 'How do they work?';

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

    // User message should include topic and question
    if (userMessage) {
      expect(userMessage.content).toContain('Closures');
      expect(userMessage.content).toContain('How do they work?');
    }
  });

  it('should generate unique IDs for questions', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Answer',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const { generateId } = await import('../../../utils/chunk-emitter');

    const node = handleQuestionNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
      questionsAsked: 0,
    };

    const topic = 'Test Topic';
    const userResponse = 'What is this?';

    await node(state, topic, userResponse, createMockConfig());

    // Verify ID was generated
    expect(generateId).toHaveBeenCalled();
  });

  it('should handle empty topic gracefully', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Answer without topic context',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = handleQuestionNode({
      providerFactory: mockProviderFactory,
    });

    const state: TeachState = {
      ...DEFAULT_TEACH_STATE,
      teachingRound: 1,
      questionsAsked: 0,
    };

    const topic = '';
    const userResponse = 'What is this?';

    const result = await node(state, topic, userResponse, createMockConfig());

    // Should still generate answer
    expect(result.messages[0]).toBeInstanceOf(AIMessage);
    expect(result.teach?.questionsAsked).toBe(1);
  });

  it('should increment questionsAsked from initial value', async () => {
    const initialCounts = [0, 1, 5, 10];

    for (const initial of initialCounts) {
      vi.clearAllMocks();

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'Answer',
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = handleQuestionNode({
        providerFactory: mockProviderFactory,
      });

      const state: TeachState = {
        ...DEFAULT_TEACH_STATE,
        teachingRound: 1,
        questionsAsked: initial,
      };

      const topic = 'Test Topic';
      const userResponse = 'Question';

      const result = await node(state, topic, userResponse, createMockConfig());

      // Should increment from initial value
      expect(result.teach?.questionsAsked).toBe(initial + 1);
    }
  });
});
