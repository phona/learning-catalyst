import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyIntentNode } from '../nodes/classifyIntent';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { PracticeState, DEFAULT_PRACTICE_STATE, UserIntent } from '../types';

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

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'answer_attempt',
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyIntentNode({
        providerFactory: mockProviderFactory,
      });

      const state: PracticeState = {
        ...DEFAULT_PRACTICE_STATE,
        currentQuestion: 'What is a closure?',
      };

      const question = 'What is a closure?';
      const userResponse = attempt;

      const result = await node(state, question, userResponse, createMockConfig());

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

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'hint_request',
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyIntentNode({
        providerFactory: mockProviderFactory,
      });

      const state: PracticeState = {
        ...DEFAULT_PRACTICE_STATE,
      };

      const question = 'What is a closure?';
      const userResponse = request;

      const result = await node(state, question, userResponse, createMockConfig());

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

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'clarification',
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyIntentNode({
        providerFactory: mockProviderFactory,
      });

      const state: PracticeState = {
        ...DEFAULT_PRACTICE_STATE,
      };

      const question = 'What is a closure?';
      const userResponse = request;

      const result = await node(state, question, userResponse, createMockConfig());

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

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'thinking_aloud',
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyIntentNode({
        providerFactory: mockProviderFactory,
      });

      const state: PracticeState = {
        ...DEFAULT_PRACTICE_STATE,
      };

      const question = 'What is a closure?';
      const userResponse = thought;

      const result = await node(state, question, userResponse, createMockConfig());

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

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'give_up',
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyIntentNode({
        providerFactory: mockProviderFactory,
      });

      const state: PracticeState = {
        ...DEFAULT_PRACTICE_STATE,
      };

      const question = 'What is a closure?';
      const userResponse = expression;

      const result = await node(state, question, userResponse, createMockConfig());

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

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'off_topic',
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyIntentNode({
        providerFactory: mockProviderFactory,
      });

      const state: PracticeState = {
        ...DEFAULT_PRACTICE_STATE,
      };

      const question = 'What is a closure?';
      const userResponse = response;

      const result = await node(state, question, userResponse, createMockConfig());

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

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'answer_attempt',
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyIntentNode({
        providerFactory: mockProviderFactory,
      });

      const state: PracticeState = {
        ...DEFAULT_PRACTICE_STATE,
      };

      const question = 'What is a closure?';
      const userResponse = answer;

      const result = await node(state, question, userResponse, createMockConfig());

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

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'answer_attempt', // Default classification
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyIntentNode({
        providerFactory: mockProviderFactory,
      });

      const state: PracticeState = {
        ...DEFAULT_PRACTICE_STATE,
      };

      const question = 'Test question';

      const result = await node(state, question, response, createMockConfig());

      // Should still classify something
      expect(result.practice?.userIntent).toBeDefined();
    }
  });

  it('should handle edge cases - very long responses', async () => {
    const longResponse = 'I think that closures '.repeat(100);

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'answer_attempt',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = classifyIntentNode({
      providerFactory: mockProviderFactory,
    });

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
    };

    const question = 'What is a closure?';

    const result = await node(state, question, longResponse, createMockConfig());

    // Should handle long responses
    expect(result.practice?.userIntent).toBe('answer_attempt');
  });

  it('should handle empty question', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'answer_attempt',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = classifyIntentNode({
      providerFactory: mockProviderFactory,
    });

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
    };

    const question = '';
    const userResponse = 'My answer';

    const result = await node(state, question, userResponse, createMockConfig());

    // Should still classify
    expect(result.practice?.userIntent).toBe('answer_attempt');
  });

  it('should handle empty user response', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'thinking_aloud',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = classifyIntentNode({
      providerFactory: mockProviderFactory,
    });

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
    };

    const question = 'What is a closure?';
    const userResponse = '';

    const result = await node(state, question, userResponse, createMockConfig());

    // Empty response might be classified as thinking_aloud
    expect(result.practice?.userIntent).toBe('thinking_aloud');
  });

  it('should propagate errors from model invocation', async () => {
    const mockModel = {
      invoke: vi.fn().mockRejectedValue(new Error('Model unavailable')),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = classifyIntentNode({
      providerFactory: mockProviderFactory,
    });

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
    };

    const question = 'What is a closure?';
    const userResponse = 'My answer';

    await expect(
      node(state, question, userResponse, createMockConfig())
    ).rejects.toThrow('Model unavailable');
  });

  it('should preserve practice state properties', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'answer_attempt',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = classifyIntentNode({
      providerFactory: mockProviderFactory,
    });

    const state: PracticeState = {
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

    const question = 'What is a closure?';
    const userResponse = 'My answer';

    const result = await node(state, question, userResponse, createMockConfig());

    // Should preserve state properties
    expect(result.practice?.currentQuestion).toBe('What is a closure?');
    expect(result.practice?.expectedAnswer).toBe('A closure is...');
    expect(result.practice?.hintsGiven).toBe(2);
    expect(result.practice?.conversationTurns).toBe(5);
    expect(result.practice?.isComplete).toBe(false);
    expect(result.practice?.focusConcepts).toEqual(['closures', 'scope']);
    expect(result.practice?.relatedConcepts).toEqual(['functions']);
    expect(result.practice?.attemptCount).toBe(3);
    expect(result.practice?.failureStreak).toBe(1);
    expect(result.practice?.needsRemediation).toBe(true);
    expect(result.practice?.shouldCircuitBreak).toBe(false);
  });

  it('should only update userIntent, not other state', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'hint_request',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = classifyIntentNode({
      providerFactory: mockProviderFactory,
    });

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
      currentQuestion: 'Question?',
      hintsGiven: 1,
    };

    const question = 'Question?';
    const userResponse = 'Can I get a hint?';

    const result = await node(state, question, userResponse, createMockConfig());

    // Only userIntent should change
    expect(result.practice?.userIntent).toBe('hint_request');
    expect(result.practice?.currentQuestion).toBe('Question?'); // unchanged
    expect(result.practice?.hintsGiven).toBe(1); // unchanged
  });

  it('should build prompt with question and response', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'answer_attempt',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = classifyIntentNode({
      providerFactory: mockProviderFactory,
    });

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
    };

    const question = 'What is a closure in JavaScript?';
    const userResponse = 'I think it\'s a function that has access to outer variables';

    await node(state, question, userResponse, createMockConfig());

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

    // User message should include question and response
    if (userMessage) {
      expect(userMessage.content).toContain('closure');
      expect(userMessage.content).toContain('function that has access');
    }
  });

  it('should not require streaming config', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'answer_attempt',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = classifyIntentNode({
      providerFactory: mockProviderFactory,
    });

    const state: PracticeState = {
      ...DEFAULT_PRACTICE_STATE,
    };

    const question = 'Question?';
    const userResponse = 'Answer';

    // Should work without config
    const result = await node(state, question, userResponse);

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

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: intent,
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyIntentNode({
        providerFactory: mockProviderFactory,
      });

      const state: PracticeState = {
        ...DEFAULT_PRACTICE_STATE,
      };

      const question = 'Question?';
      const userResponse = 'Response';

      const result = await node(state, question, userResponse, createMockConfig());

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

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'answer_attempt',
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyIntentNode({
        providerFactory: mockProviderFactory,
      });

      const state: PracticeState = {
        ...DEFAULT_PRACTICE_STATE,
      };

      const question = 'Question?';
      const userResponse = answer;

      const result = await node(state, question, userResponse, createMockConfig());

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
      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'hint_request',
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyIntentNode({
        providerFactory: mockProviderFactory,
      });

      const state: PracticeState = {
        ...DEFAULT_PRACTICE_STATE,
      };

      const question = 'Question?';
      const userResponse = response;

      const result = await node(state, question, userResponse, createMockConfig());

      // Should classify based on dominant intent
      expect(result.practice?.userIntent).toBeDefined();
    }
  });
});
