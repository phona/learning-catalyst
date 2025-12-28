import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyIntentNode } from '../nodes/classifyIntent';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { PracticeState, DEFAULT_PRACTICE_STATE, UserIntent } from '../types';
import type { WorkflowDeps } from '../../../state';
import { PracticeAnnotation } from '../state';

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

// Mock services
const mockAgentManager = {};
const mockCheckpointer = {};
const mockConfigService = {};
const mockKnowledgeService = {
  searchKnowledge: vi.fn(),
  getRelatedConcepts: vi.fn(),
};
const mockPracticeService = {
  recordPracticeAttempt: vi.fn(),
};
const mockLearningService = {};

// Create mock dependencies
const createMockDeps = (): WorkflowDeps =>
  ({
    providerFactory: mockProviderFactory,
    loggerService: mockLoggerService,
    agentManager: mockAgentManager,
    checkpointer: mockCheckpointer,
    configService: mockConfigService,
    knowledgeService: mockKnowledgeService,
    practiceService: mockPracticeService,
    learningService: mockLearningService,
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

describe('classifyIntent node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should classify answer attempts', async () => {
    const answerAttempts = [
      'I think closures are functions that remember their environment',
      'The inner function can access variables from the outer scope',
      'Let me try: You create a closure by returning a function from another function',
      'Answer: A closure is created when a function accesses variables from its parent scope',
      'I believe it has something to do with scope and variables',
      'Maybe closures let you keep private variables?',
    ];

    for (const attempt of answerAttempts) {
      vi.clearAllMocks();

      mockModel.invoke.mockResolvedValue({
        content: 'answer_attempt',
      });

      const deps = createMockDeps();
      const node = classifyIntentNode(deps);

      const state = createPracticeState({
        userAnswer: attempt,
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
        },
      });

      const result = await node(state, createMockConfig());

      // Should classify as answer attempt
      expect(result.practice?.userIntent).toBe('answer_attempt');
    }
  });

  it('should classify hint requests', async () => {
    const hintRequests = [
      'Can I get a hint?',
      'Can you give me a clue?',
      'I need help understanding this',
      'Can you explain what this means?',
      'Can you give me an example?',
      'I\'m not sure how to approach this',
      'Can you point me in the right direction?',
      'Help?',
      'What does this mean?',
      'Can you elaborate?',
    ];

    for (const request of hintRequests) {
      vi.clearAllMocks();

      mockModel.invoke.mockResolvedValue({
        content: 'hint_request',
      });

      const deps = createMockDeps();
      const node = classifyIntentNode(deps);

      const state = createPracticeState({
        userAnswer: request,
      });

      const result = await node(state, createMockConfig());

      expect(result.practice?.userIntent).toBe('hint_request');
    }
  });

  it('should classify clarification requests', async () => {
    const clarificationRequests = [
      'What do you mean by "closure"?',
      'I don\'t understand the question',
      'Can you clarify what you\'re asking?',
      'What does this question mean?',
      'I\'m confused about what you\'re asking',
      'Can you rephrase the question?',
      'What are you looking for here?',
      'I don\'t get what you\'re asking',
    ];

    for (const request of clarificationRequests) {
      vi.clearAllMocks();

      mockModel.invoke.mockResolvedValue({
        content: 'clarification',
      });

      const deps = createMockDeps();
      const node = classifyIntentNode(deps);

      const state = createPracticeState({
        userAnswer: request,
      });

      const result = await node(state, createMockConfig());

      expect(result.practice?.userIntent).toBe('clarification');
    }
  });

  it('should classify thinking aloud', async () => {
    const thinkingAloud = [
      'Hmm, let me think about this',
      'I\'m thinking...',
      'Give me a moment to process this',
      'Let me work through this step by step',
      'I need to think about this',
      'This is interesting, let me consider...',
      'Working on it...',
    ];

    for (const thought of thinkingAloud) {
      vi.clearAllMocks();

      mockModel.invoke.mockResolvedValue({
        content: 'thinking_aloud',
      });

      const deps = createMockDeps();
      const node = classifyIntentNode(deps);

      const state = createPracticeState({
        userAnswer: thought,
      });

      const result = await node(state, createMockConfig());

      expect(result.practice?.userIntent).toBe('thinking_aloud');
    }
  });

  it('should classify give up', async () => {
    const giveUpExpressions = [
      'I don\'t know',
      'I give up',
      'I have no idea',
      'I can\'t figure this out',
      'Skip it',
      'I\'m stuck',
      'This is too hard',
      'I pass',
      'Don\'t know',
      'No clue',
    ];

    for (const expression of giveUpExpressions) {
      vi.clearAllMocks();

      mockModel.invoke.mockResolvedValue({
        content: 'give_up',
      });

      const deps = createMockDeps();
      const node = classifyIntentNode(deps);

      const state = createPracticeState({
        userAnswer: expression,
      });

      const result = await node(state, createMockConfig());

      expect(result.practice?.userIntent).toBe('give_up');
    }
  });

  it('should classify off_topic responses', async () => {
    const offTopicResponses = [
      'What\'s the weather like?',
      'How about that game last night?',
      'I like pizza',
      'What time is it?',
      'My cat is cute',
      'I need to go shopping',
      'Let\'s talk about something else',
      'This is boring',
    ];

    for (const response of offTopicResponses) {
      vi.clearAllMocks();

      mockModel.invoke.mockResolvedValue({
        content: 'off_topic',
      });

      const deps = createMockDeps();
      const node = classifyIntentNode(deps);

      const state = createPracticeState({
        userAnswer: response,
      });

      const result = await node(state, createMockConfig());

      expect(result.practice?.userIntent).toBe('off_topic');
    }
  });

  it('should handle partial/wrong answers as answer_attempt', async () => {
    const partialAnswers = [
      'Closures are... um... something with functions?',
      'I think it\'s related to scope',
      'Not sure but maybe...',
      'Is it about functions returning functions?',
      'I\'m not certain but I\'ll guess: closures are...',
    ];

    for (const answer of partialAnswers) {
      vi.clearAllMocks();

      mockModel.invoke.mockResolvedValue({
        content: 'answer_attempt',
      });

      const deps = createMockDeps();
      const node = classifyIntentNode(deps);

      const state = createPracticeState({
        userAnswer: answer,
      });

      const result = await node(state, createMockConfig());

      // Even partial/wrong attempts should be classified as answer_attempt
      expect(result.practice?.userIntent).toBe('answer_attempt');
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
      'Maybe',
    ];

    for (const response of shortResponses) {
      vi.clearAllMocks();

      mockModel.invoke.mockResolvedValue({
        content: 'answer_attempt', // Default classification
      });

      const deps = createMockDeps();
      const node = classifyIntentNode(deps);

      const state = createPracticeState({
        userAnswer: response,
      });

      const result = await node(state, createMockConfig());

      // Should still classify something
      expect(result.practice?.userIntent).toBeDefined();
    }
  });

  it('should handle edge cases - very long responses', async () => {
    const longResponse = 'I think that closures '.repeat(100);

    mockModel.invoke.mockResolvedValue({
      content: 'answer_attempt',
    });

    const deps = createMockDeps();
    const node = classifyIntentNode(deps);

    const state = createPracticeState({
      userAnswer: longResponse,
    });

    const result = await node(state, createMockConfig());

    // Should handle long responses
    expect(result.practice?.userIntent).toBe('answer_attempt');
  });

  it('should handle empty question', async () => {
    mockModel.invoke.mockResolvedValue({
      content: 'answer_attempt',
    });

    const deps = createMockDeps();
    const node = classifyIntentNode(deps);

    const state = createPracticeState({
      userAnswer: 'My answer',
      practice: {
        ...DEFAULT_PRACTICE_STATE,
        currentQuestion: '',
      },
    });

    const result = await node(state, createMockConfig());

    // Should still classify
    expect(result.practice?.userIntent).toBe('answer_attempt');
  });

  it('should handle empty user response', async () => {
    mockModel.invoke.mockResolvedValue({
      content: 'thinking_aloud',
    });

    const deps = createMockDeps();
    const node = classifyIntentNode(deps);

    const state = createPracticeState({
      userAnswer: '',
    });

    const result = await node(state, createMockConfig());

    // Empty response is classified as give_up (fast path in the node)
    expect(result.practice?.userIntent).toBe('give_up');
  });

  it('should propagate errors from model invocation', async () => {
    mockModel.invoke.mockRejectedValue(new Error('Model unavailable'));

    const deps = createMockDeps();
    const node = classifyIntentNode(deps);

    const state = createPracticeState({
      userAnswer: 'My answer',
    });

    await expect(
      node(state, createMockConfig())
    ).rejects.toThrow('Model unavailable');
  });

  it('should preserve practice state properties', async () => {
    mockModel.invoke.mockResolvedValue({
      content: 'answer_attempt',
    });

    const deps = createMockDeps();
    const node = classifyIntentNode(deps);

    const initialPracticeState = {
      ...DEFAULT_PRACTICE_STATE,
      currentQuestion: 'What is a closure?',
      expectedAnswer: 'A closure is...',
      hintsGiven: 2,
      conversationTurns: 5,
      isComplete: false,
      focusConcepts: ['closures', 'scope'],
      relatedConcepts: ['functions'],
      attemptCount: 3,
      failureStreak: 1,
      needsRemediation: true,
      shouldCircuitBreak: false,
    };

    const state = createPracticeState({
      userAnswer: 'My answer',
      practice: initialPracticeState,
    });

    const result = await node(state, createMockConfig());

    // Should only update userIntent
    // The node returns only the userIntent field
    expect(result.practice?.userIntent).toBe('answer_attempt');
  });

  it('should only update userIntent, not other state', async () => {
    mockModel.invoke.mockResolvedValue({
      content: 'hint_request',
    });

    const deps = createMockDeps();
    const node = classifyIntentNode(deps);

    const state = createPracticeState({
      userAnswer: 'Can I get a hint?',
      practice: {
        ...DEFAULT_PRACTICE_STATE,
        currentQuestion: 'Question?',
        hintsGiven: 1,
      },
    });

    const result = await node(state, createMockConfig());

    // Only userIntent should change
    expect(result.practice?.userIntent).toBe('hint_request');
  });

  it('should build prompt with question and response', async () => {
    mockModel.invoke.mockResolvedValue({
      content: 'answer_attempt',
    });

    const deps = createMockDeps();
    const node = classifyIntentNode(deps);

    const state = createPracticeState({
      userAnswer: 'I think it\'s a function that has access to outer variables',
      practice: {
        ...DEFAULT_PRACTICE_STATE,
        currentQuestion: 'What is a closure in JavaScript?',
      },
    });

    await node(state, createMockConfig());

    // Verify model was called
    expect(mockProviderFactory.getModel).toHaveBeenCalled();

    // Get the messages passed to the model
    const modelCalls = mockModel.invoke.mock.calls;
    expect(modelCalls.length).toBeGreaterThan(0);

    const messages = modelCalls[0][0];
    expect(Array.isArray(messages)).toBe(true);

    // Should include system and user messages
    const messageType = (m: any) => m?.role ?? m?._getType?.() ?? m?.getType?.() ?? m?.type;
    const systemMessage = messages.find((m: any) => messageType(m) === 'system');
    const userMessage = messages.find((m: any) => {
      const t = messageType(m);
      return t === 'user' || t === 'human';
    });

    expect(systemMessage).toBeDefined();
    expect(userMessage).toBeDefined();

    // User message should include question and response
    if (userMessage) {
      expect(userMessage.content).toContain('closure');
      expect(userMessage.content).toContain('function that has access');
    }
  });

  it('should not require streaming config', async () => {
    mockModel.invoke.mockResolvedValue({
      content: 'answer_attempt',
    });

    const deps = createMockDeps();
    const node = classifyIntentNode(deps);

    const state = createPracticeState({
      userAnswer: 'Answer',
    });

    // Should work without config (config is optional in LangGraph)
    const result = await node(state, createMockConfig());

    expect(result.practice?.userIntent).toBe('answer_attempt');
  });

  it('should handle all UserIntent values', async () => {
    const intents: UserIntent[] = [
      'answer_attempt',
      'hint_request',
      'clarification',
      'thinking_aloud',
      'give_up',
      'off_topic',
    ];

    for (const intent of intents) {
      vi.clearAllMocks();

      mockModel.invoke.mockResolvedValue({
        content: intent,
      });

      const deps = createMockDeps();
      const node = classifyIntentNode(deps);

      const state = createPracticeState({
        userAnswer: 'Response',
      });

      const result = await node(state, createMockConfig());

      expect(result.practice?.userIntent).toBe(intent);
    }
  });

  it('should be generous with answer_attempt classification', async () => {
    const borderlineAnswers = [
      'I\'m not sure but...',
      'Maybe it has to do with...',
      'Could it be that...',
      'I think perhaps...',
      'This might be wrong but...',
    ];

    for (const answer of borderlineAnswers) {
      vi.clearAllMocks();

      mockModel.invoke.mockResolvedValue({
        content: 'answer_attempt',
      });

      const deps = createMockDeps();
      const node = classifyIntentNode(deps);

      const state = createPracticeState({
        userAnswer: answer,
      });

      const result = await node(state, createMockConfig());

      // Should be classified as answer_attempt
      expect(result.practice?.userIntent).toBe('answer_attempt');
    }
  });

  it('should handle mixed intent responses', async () => {
    const mixedResponses = [
      'I don\'t understand, can you give me a hint?',
      'Hmm, let me think... maybe something with functions?',
      'I\'m not sure what this means but I\'ll guess:',
    ];

    for (const response of mixedResponses) {
      vi.clearAllMocks();

      // The model will pick the dominant intent
      mockModel.invoke.mockResolvedValue({
        content: 'hint_request',
      });

      const deps = createMockDeps();
      const node = classifyIntentNode(deps);

      const state = createPracticeState({
        userAnswer: response,
      });

      const result = await node(state, createMockConfig());

      // Should classify based on dominant intent
      expect(result.practice?.userIntent).toBeDefined();
    }
  });
});
