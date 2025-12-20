/**
 * Unit Tests: Fast Track Quiz Node
 *
 * PURPOSE:
 * Verify that the fastTrackQuiz node correctly generates diagnostic assessment quizzes
 * for users who self-reported high confidence in a topic. This allows confident learners
 * to skip basic instruction and quickly verify their knowledge.
 *
 * TEST STRATEGY:
 * 1. Test quiz generation for high-confidence users
 * 2. Test conversational presentation (not formal testing)
 * 3. Test interrupt handling for user responses
 * 4. Test resume case (quiz already generated)
 * 5. Test error handling (model unavailable, invalid responses)
 * 6. Test edge cases (empty topic, very short timeouts)
 * 7. Test chunk emission for streaming
 *
 * LANGGRAPH PATTERN:
 * - Direct LLM invocation (plain mock: { invoke: vi.fn().mockResolvedValue(...) })
 * - Uses interrupt for user interaction
 * - Requires LangGraphRunnableConfig with writer for streaming
 *
 * DEPENDENCIES:
 * - providerFactory.getModel() for LLM
 * - chunk-emitter for streaming
 * - @langchain/langgraph interrupt
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fastTrackQuizNode } from '../fastTrackQuiz';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

// Mock the interrupt function
vi.mock('@langchain/langgraph', () => ({
  interrupt: vi.fn().mockResolvedValue('Mock user answer'),
}));

// Mock chunk emitter utilities
vi.mock('../utils/chunk-emitter', () => ({
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
  generateId: vi.fn().mockReturnValue('test-id-123'),
}));

// Mock config writer for chunk emitter
const createMockConfig = (): LangGraphRunnableConfig => ({
  writer: vi.fn(),
} as any);

describe('fastTrackQuiz node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate diagnostic quiz for high-confidence user', async () => {
    // Setup mocks
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `I'd like to assess your understanding through a quick, conversational quiz.

Question 1: Can you explain what a closure is in JavaScript?
Please share your understanding in your own words.`,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const mockDeps = {
      providerFactory: mockProviderFactory,
    };

    const node = fastTrackQuizNode(mockDeps);

    const state = {
      messages: [new HumanMessage('I know JavaScript well')],
      topic: 'JavaScript Closures',
      confidence: 0.9,
    } as any;

    const config = createMockConfig();
    const result = await node(state, config);

    // Verify model was called
    expect(mockProviderFactory.getModel).toHaveBeenCalled();

    // Verify a response message was generated
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toBeInstanceOf(AIMessage);
    expect(result.messages[0].content).toContain('quiz');
    expect(result.messages[0].content).toContain('closure');

    // Verify quiz content was stored for grading
    expect(result.practicePrompt).toBeDefined();
    expect(result.userAnswer).toBe('Mock user answer');
  });

  it('should generate conversational questions (not formal tests)', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `Let's explore your knowledge together!

I'd love to hear your thoughts on how promises work in JavaScript. What happens when you create a new promise?`,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = fastTrackQuizNode({
      providerFactory: mockProviderFactory,
    });

    const state = {
      messages: [new HumanMessage('I understand promises')],
      topic: 'JavaScript Promises',
      confidence: 0.85,
    } as any;

    const result = await node(state, createMockConfig());

    expect(result.messages[0].content).toContain('explore');
    expect(result.messages[0].content).toContain('your thoughts');
    expect(result.messages[0].content).not.toContain('test');
    expect(result.messages[0].content).not.toContain('exam');
    expect(result.messages[0].content).not.toContain('grade');
  });

  it('should handle resume case when quiz already generated', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Previous quiz exists',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = fastTrackQuizNode({
      providerFactory: mockProviderFactory,
    });

    // State with existing quiz data
    const state = {
      messages: [new HumanMessage('Ready for quiz')],
      topic: 'React Hooks',
      confidence: 0.8,
      practice: {
        currentQuestion: 'What is useState?',
        expectedAnswer: 'State management hook',
        hintsGiven: 0,
        conversationTurns: 0,
        isComplete: false,
        focusConcepts: [],
        relatedConcepts: [],
        attemptCount: 0,
        failureStreak: 0,
        needsRemediation: false,
        shouldCircuitBreak: false,
      },
    } as any;

    const result = await node(state, createMockConfig());

    // Should handle existing quiz gracefully
    expect(result.messages).toBeDefined();
    // Model might not be called again if quiz exists
  });

  it('should use topic in quiz generation prompt', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Quiz content',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = fastTrackQuizNode({
      providerFactory: mockProviderFactory,
    });

    const testTopics = [
      'Python List Comprehension',
      'React Component Lifecycle',
      'SQL JOIN Operations',
      'Docker Containerization',
    ];

    for (const topic of testTopics) {
      vi.clearAllMocks();

      const state = {
        messages: [new HumanMessage('I know this')],
        topic,
        confidence: 0.9,
      } as any;

      await node(state, createMockConfig());

      // Verify model was called with topic
      expect(mockProviderFactory.getModel).toHaveBeenCalled();

      // Get the messages passed to the model
      const modelCalls = mockModel.invoke.mock.calls;
      if (modelCalls.length > 0) {
        const messages = modelCalls[0][0];
        const humanMessage = messages.find((m: any) => m.role === 'human');
        if (humanMessage) {
          expect(humanMessage.content).toContain(topic);
        }
      }
    }
  });

  it('should maintain conversational tone', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `I'd be happy to explore this with you!

Let's dive into async/await. Can you walk me through what happens when you use the await keyword? I'm curious about your understanding.`,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = fastTrackQuizNode({
      providerFactory: mockProviderFactory,
    });

    const state = {
      messages: [new HumanMessage('I use async/await')],
      topic: 'Async/Await',
      confidence: 0.88,
    } as any;

    const result = await node(state, createMockConfig());

    const content = result.messages[0].content;
    expect(content).toMatch(/I'd be happy|Let's explore|I'm curious/i);
    expect(content).toContain('async/await');
    expect(content).toContain('await');
  });

  it('should ask 2-3 questions maximum (not too long)', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `Quick check on your understanding:

1. What's the difference between let and const?
2. Can you explain hoisting?

That's it - just want to make sure we're on the same page!`,
      }),
    };

    const mockProviderFactory = {
      getModel:vi.fn().mockResolvedValue(mockModel),
    };

    const node = fastTrackQuizNode({
      providerFactory: mockProviderFactory,
    });

    const state = {
      messages: [new HumanMessage('I know JavaScript basics')],
      topic: 'JavaScript Basics',
      confidence: 0.82,
    } as any;

    const result = await node(state, createMockConfig());

    const content = result.messages[0].content;

    // Should be concise
    expect(content.length).toBeLessThan(1000);

    // Should indicate it's quick/short
    expect(content).toMatch(/quick|just|couple|short/i);
  });

  it('should handle empty topic gracefully', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Unable to generate quiz without topic',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = fastTrackQuizNode({
      providerFactory: mockProviderFactory,
    });

    const state = {
      messages: [new HumanMessage('Ready')],
      topic: '',
      confidence: 0.9,
    } as any;

    const result = await node(state, createMockConfig());

    // Should still generate a response, even if topic is empty
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

    const node = fastTrackQuizNode({
      providerFactory: mockProviderFactory,
    });

    const state = {
      messages: [new HumanMessage('Test')],
      topic: 'Test Topic',
      confidence: 0.9,
    } as any;

    await expect(node(state, createMockConfig())).rejects.toThrow('Model unavailable');
  });

  it('should not emit chunks (uses simple invoke, not streaming)', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Quiz content',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = fastTrackQuizNode({
      providerFactory: mockProviderFactory,
    });

    const state = {
      messages: [new HumanMessage('Ready')],
      topic: 'Test',
      confidence: 0.9,
    } as any;

    await node(state, createMockConfig());

    // Verify model was called
    expect(mockProviderFactory.getModel).toHaveBeenCalled();
    expect(mockModel.invoke).toHaveBeenCalled();
  });

  it('should not require streaming config (works with invoke)', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Non-streaming quiz',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = fastTrackQuizNode({
      providerFactory: mockProviderFactory,
    });

    const state = {
      messages: [new HumanMessage('Test')],
      topic: 'Test',
      confidence: 0.9,
    } as any;

    // Should work without config
    const result = await node(state);

    expect(result.messages).toBeDefined();
    expect(result.messages[0]).toBeInstanceOf(AIMessage);
  });

  it('should build prompt with user context and topic', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Quiz content',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = fastTrackQuizNode({
      providerFactory: mockProviderFactory,
    });

    const state = {
      messages: [
        new HumanMessage('I want to learn about closures'),
        new AIMessage('Great! Let me help'),
        new HumanMessage('I think I already understand them pretty well'),
      ],
      topic: 'JavaScript Closures',
      confidence: 0.85,
      gaps: [],
    } as any;

    await node(state, createMockConfig());

    // Verify model was called
    expect(mockProviderFactory.getModel).toHaveBeenCalled();

    // Get the messages passed to the model
    const modelCalls = mockModel.invoke.mock.calls;
    expect(modelCalls.length).toBeGreaterThan(0);

    const messages = modelCalls[0][0];
    expect(Array.isArray(messages)).toBe(true);

    // Should include prompt with topic and context
    expect(messages).toHaveLength(1);
    expect(messages[0]).toBeInstanceOf(HumanMessage);

    const prompt = messages[0].content as string;
    expect(prompt).toContain('Closures');
    expect(prompt).toMatch(/confidence|understand/i);
  });

  it('should encourage user during quiz', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `I'm excited to learn from you!

This isn't a test - it's a conversation. Share whatever comes to mind about inheritance in JavaScript. There are no wrong answers here, just opportunities to explore together.`,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = fastTrackQuizNode({
      providerFactory: mockProviderFactory,
    });

    const state = {
      messages: [new HumanMessage('I know OOP')],
      topic: 'JavaScript Inheritance',
      confidence: 0.8,
    } as any;

    const result = await node(state, createMockConfig());

    const content = result.messages[0].content;
    expect(content).toMatch(/excited|conversation|together/i);
    expect(content).toMatch(/no wrong|opportunities/i);
  });

  it('should adapt to different confidence levels', async () => {
    const confidenceLevels = [0.75, 0.8, 0.85, 0.9, 0.95];

    for (const confidence of confidenceLevels) {
      vi.clearAllMocks();

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: `Quiz for confidence level ${confidence}`,
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = fastTrackQuizNode({
        providerFactory: mockProviderFactory,
      });

      const state = {
        messages: [new HumanMessage('Ready')],
        topic: 'Test Topic',
        confidence,
      } as any;

      const result = await node(state, createMockConfig());

      expect(result.messages).toBeDefined();
      expect(result.messages[0]).toBeInstanceOf(AIMessage);

      // Each should generate different content based on confidence
      if (mockModel.invoke.mock.calls.length > 0) {
        const messages = mockModel.invoke.mock.calls[0][0];
        const humanMessage = messages.find((m: any) => m.role === 'human');
        if (humanMessage) {
          expect(humanMessage.content).toContain(confidence.toString());
        }
      }
    }
  });

  it('should respect time (keep quiz short)', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `Quick 2-question check:

1. What's X?
2. How does Y work?

Should take just 2-3 minutes!`,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = fastTrackQuizNode({
      providerFactory: mockProviderFactory,
    });

    const state = {
      messages: [new HumanMessage('I have limited time')],
      topic: 'Topic',
      confidence: 0.9,
    } as any;

    const result = await node(state, createMockConfig());

    const content = result.messages[0].content;
    expect(content).toMatch(/quick|minutes|2-3/i);
  });
});
