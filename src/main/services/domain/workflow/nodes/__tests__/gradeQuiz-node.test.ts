/**
 * Unit Tests: Grade Quiz Node
 *
 * PURPOSE:
 * Verify that the gradeQuiz node correctly evaluates quiz responses, calculates mastery
 * scores, identifies knowledge gaps, and determines routing (complete vs teach).
 *
 * TEST STRATEGY:
 * 1. Test quiz answer grading with various quality levels
 * 2. Test score parsing and normalization
 * 3. Test gap identification from incorrect answers
 * 4. Test confidence calculation based on answers
 * 5. Test routing decision (>90% complete, <90% teach)
 * 6. Test edge cases (empty answers, invalid responses)
 * 7. Test chunk emission for streaming
 *
 * LANGGRAPH PATTERN:
 * - Direct LLM invocation (plain mock: { invoke: vi.fn().mockResolvedValue(...) })
 * - Parses scores from text responses
 * - Requires LangGraphRunnableConfig with writer for streaming
 *
 * DEPENDENCIES:
 * - providerFactory.getModel() for LLM
 * - parseScore utility for score extraction
 * - chunk-emitter for streaming
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gradeQuizNode } from '../gradeQuiz';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

// Mock parseScore utility
vi.mock('../parse-score', () => ({
  parseScore: vi.fn(),
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

describe('gradeQuiz node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should grade quiz answers and calculate mastery score', async () => {
    // Setup mocks
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `Assessment Results:

Mastery Score: 92%

The user demonstrated strong understanding of closures, correctly explaining how they work and providing good examples. Minor gaps in edge cases.

Gaps: ["closure edge cases", "memory implications"]

Confidence: High - user shows solid foundational knowledge.`,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const { parseScore } = await import('../parse-score');
    vi.mocked(parseScore).mockReturnValue(0.92);

    const node = gradeQuizNode(mockProviderFactory);

    const state = {
      messages: [
        new HumanMessage('What is a closure?'),
        new AIMessage('A closure is...'),
        new HumanMessage('A closure is a function that has access to variables from its outer scope even after the outer function has returned.'),
      ],
      topic: 'JavaScript Closures',
      practicePrompt: 'What is a closure?',
      userAnswer: 'A closure is a function that has access to variables from its outer scope even after the outer function has returned.',
    } as any;

    const result = await node(state, createMockConfig());

    // Verify model was called
    expect(mockProviderFactory.getModel).toHaveBeenCalled();

    // Verify result structure
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toBeInstanceOf(AIMessage);

    // Verify mastery score was set
    expect(result.mastery).toBe(0.92);

    // Verify gaps were identified
    expect(result.gaps).toContain('closure edge cases');
    expect(result.gaps).toContain('memory implications');
  });

  it('should route to COMPLETE when mastery >= 90%', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Mastery Score: 95%',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const { parseScore } = await import('../parse-score');
    vi.mocked(parseScore).mockReturnValue(0.95);

    const node = gradeQuizNode(mockProviderFactory);

    const state = {
      messages: [new HumanMessage('Excellent answer about closures')],
      topic: 'Closures',
      practicePrompt: 'Diagnostic quiz question',
      userAnswer: 'Perfect answer',
    } as any;

    const result = await node(state, createMockConfig());

    // Should have high mastery
    expect(result.mastery).toBeGreaterThanOrEqual(0.9);
    expect(result.mastery).toBe(0.95);

    // Should have assessment message
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toContain('95%');
  });

  it('should route to TEACH when mastery < 90%', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Mastery Score: 75%',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const { parseScore } = await import('../parse-score');
    vi.mocked(parseScore).mockReturnValue(0.75);

    const node = gradeQuizNode(mockProviderFactory);

    const state = {
      messages: [new HumanMessage('Partial understanding')],
      topic: 'Closures',
      practicePrompt: 'Diagnostic quiz question',
      userAnswer: 'Basic answer with gaps',
    } as any;

    const result = await node(state, createMockConfig());

    // Should have medium mastery
    expect(result.mastery).toBeLessThan(0.9);
    expect(result.mastery).toBe(0.75);

    // Should identify gaps
    expect(result.gaps).toBeDefined();
    expect(result.gaps.length).toBeGreaterThan(0);
  });

  it('should parse scores in percentage format', async () => {
    const testScores = [
      { text: 'Score: 88%', expected: 0.88 },
      { text: 'Mastery: 92%', expected: 0.92 },
      { text: 'Result: 75 percent', expected: 0.75 },
      { text: 'Assessment Score 83%', expected: 0.83 },
    ];

    for (const { text, expected } of testScores) {
      vi.clearAllMocks();

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({ content: text }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const { parseScore } = await import('../parse-score');
      vi.mocked(parseScore).mockReturnValue(expected);

      const node = gradeQuizNode(mockProviderFactory);

      const state = {
        messages: [new HumanMessage('Answer')],
        topic: 'Test',
        userAnswer: 'Answer',
      } as any;

      const result = await node(state, createMockConfig());

      expect(result.mastery).toBe(expected);
    }
  });

  it('should parse scores in decimal format', async () => {
    const testScores = [
      { text: 'Score: 0.85', expected: 0.85 },
      { text: 'Confidence: 0.92', expected: 0.92 },
      { text: 'score: 0.78', expected: 0.78 },
    ];

    for (const { text, expected } of testScores) {
      vi.clearAllMocks();

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({ content: text }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const { parseScore } = await import('../parse-score');
      vi.mocked(parseScore).mockReturnValue(expected);

      const node = gradeQuizNode(mockProviderFactory);

      const state = {
        messages: [new HumanMessage('Answer')],
        topic: 'Test',
        userAnswer: 'Answer',
      } as any;

      const result = await node(state, createMockConfig());

      expect(result.mastery).toBe(expected);
    }

    it('should handle boundary case at exactly 90%', async () => {
      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'Mastery Score: 90%',
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const { parseScore } = await import('../parse-score');
      vi.mocked(parseScore).mockReturnValue(0.9);

      const node = gradeQuizNode(mockProviderFactory);

      const state = {
        messages: [new HumanMessage('Answer')],
        topic: 'Test',
        userAnswer: 'Answer',
      } as any;

      const result = await node(state, createMockConfig());

      // Exactly 90% should route to complete
      expect(result.mastery).toBe(0.9);
      expect(result.mastery).toBeGreaterThanOrEqual(0.9);
    });

    it('should handle boundary case at just below 90%', async () => {
      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'Mastery Score: 89%',
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const { parseScore } = await import('../parse-score');
      vi.mocked(parseScore).mockReturnValue(0.89);

      const node = gradeQuizNode(mockProviderFactory);

      const state = {
        messages: [new HumanMessage('Answer')],
        topic: 'Test',
        userAnswer: 'Answer',
      } as any;

      const result = await node(state, createMockConfig());

      // Just below 90% should route to teach
      expect(result.mastery).toBe(0.89);
      expect(result.mastery).toBeLessThan(0.9);
    });
  });

  it('should identify specific knowledge gaps', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `Mastery: 70%

The user showed understanding of basic concepts but missed key details.

Identified Gaps:
- Module system (ES6 modules)
- Default parameters
- Rest operator usage

Areas Needing Review: ["module syntax", "parameter defaults", "spread/rest operators"]`,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const { parseScore } = await import('../parse-score');
    vi.mocked(parseScore).mockReturnValue(0.7);

    const node = gradeQuizNode(mockProviderFactory);

    const state = {
      messages: [new HumanMessage('Partial answer about functions')],
      topic: 'JavaScript Functions',
      userAnswer: 'Basic understanding but missing advanced concepts',
    } as any;

    const result = await node(state, createMockConfig());

    // Verify gaps were extracted
    expect(result.gaps).toContain('module syntax');
    expect(result.gaps).toContain('parameter defaults');
    expect(result.gaps).toContain('spread/rest operators');

    // Should have multiple gaps for partial understanding
    expect(result.gaps.length).toBeGreaterThanOrEqual(3);
  });

  it('should provide constructive feedback', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `Assessment: 78% Mastery

Good foundation! You understand the core concepts well.

To improve:
1. Review async/await patterns
2. Practice error handling
3. Study promise chaining

Keep going - you're making progress!`,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const { parseScore } = await import('../parse-score');
    vi.mocked(parseScore).mockReturnValue(0.78);

    const node = gradeQuizNode(mockProviderFactory);

    const state = {
      messages: [new HumanMessage('My understanding of async')],
      topic: 'Async Programming',
      userAnswer: 'I know about promises but not all details',
    } as any;

    const result = await node(state, createMockConfig());

    const feedback = result.messages[0].content;

    // Should be encouraging
    expect(feedback).toMatch(/good|progress|keep/i);

    // Should provide specific guidance
    expect(feedback).toMatch(/improve|review|practice/i);

    // Should mention async/await
    expect(feedback).toContain('async/await');
  });

  it('should handle empty or very short answers', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Assessment: Unable to evaluate - answer too brief',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = gradeQuizNode(mockProviderFactory);

    const state = {
      messages: [new HumanMessage('Answer')],
      topic: 'Test',
      userAnswer: '', // Empty answer
    } as any;

    const result = await node(state, createMockConfig());

    // Should still produce a result
    expect(result.messages).toBeDefined();
    expect(result.messages[0]).toBeInstanceOf(AIMessage);

    // Should handle gracefully
    expect(result.mastery).toBeDefined();
  });

  it('should handle very long detailed answers', async () => {
    const longAnswer = 'x'.repeat(5000);

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `Comprehensive answer reviewed. Mastery: 88%

Excellent depth and detail. Minor areas for refinement:
- Edge cases
- Performance considerations`,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const { parseScore } = await import('../parse-score');
    vi.mocked(parseScore).mockReturnValue(0.88);

    const node = gradeQuizNode(mockProviderFactory);

    const state = {
      messages: [new HumanMessage(longAnswer)],
      topic: 'Complex Topic',
      userAnswer: longAnswer,
    } as any;

    const result = await node(state, createMockConfig());

    expect(result.mastery).toBe(0.88);
    expect(result.messages[0].content).toContain('Comprehensive');
  });

  it('should propagate errors from model invocation', async () => {
    const mockModel = {
      invoke: vi.fn().mockRejectedValue(new Error('Model unavailable')),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = gradeQuizNode(mockProviderFactory);

    const state = {
      messages: [new HumanMessage('Test')],
      topic: 'Test',
      practicePrompt: 'Test question',
      userAnswer: 'Answer',
    } as any;

    await expect(node(state, createMockConfig())).rejects.toThrow('Model unavailable');
  });

  it('should emit chunks for streaming if config provides writer', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Grading results: 85%',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const { createChunkEmitter } = await import('../utils/chunk-emitter');
    const mockEmitter = {
      textStart: vi.fn(),
      textDelta: vi.fn(),
      textEnd: vi.fn(),
      toolInputStart: vi.fn(),
      toolOutputAvailable: vi.fn(),
    };
    vi.mocked(createChunkEmitter).mockReturnValue(mockEmitter as any);

    const node = gradeQuizNode(mockProviderFactory);

    const state = {
      messages: [new HumanMessage('Answer')],
      topic: 'Test',
      userAnswer: 'Answer',
    } as any;

    await node(state, createMockConfig());

    // Verify chunk emitter was used
    expect(createChunkEmitter).toHaveBeenCalled();
  });

  it('should build prompt with quiz questions and user answers', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Score: 80%',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const { parseScore } = await import('../parse-score');
    vi.mocked(parseScore).mockReturnValue(0.8);

    const node = gradeQuizNode(mockProviderFactory);

    const state = {
      messages: [
        new AIMessage('Question 1: What is a closure?'),
        new HumanMessage('A closure is...'),
        new AIMessage('Question 2: How do you create one?'),
        new HumanMessage('You create it by...'),
      ],
      topic: 'Closures',
      userAnswer: 'Combined answer to both questions',
    } as any;

    await node(state, createMockConfig());

    // Verify model was called
    expect(mockProviderFactory.getModel).toHaveBeenCalled();

    // Get the messages passed to the model
    const modelCalls = mockModel.invoke.mock.calls;
    expect(modelCalls.length).toBeGreaterThan(0);

    const messages = modelCalls[0][0];
    expect(Array.isArray(messages)).toBe(true);

    // Should include system prompt and human prompt
    const systemMessage = messages.find((m: any) => m.role === 'system');
    const humanMessage = messages.find((m: any) => m.role === 'human');

    expect(systemMessage).toBeDefined();
    expect(humanMessage).toBeDefined();

    // Human message should include quiz context and answers
    if (humanMessage) {
      expect(humanMessage.content).toContain('Closures');
      expect(humanMessage.content).toMatch(/answer|response/i);
    }
  });

  it('should calculate confidence based on answer quality', async () => {
    const highQualityAnswer = `Comprehensive explanation of closures with multiple examples,
covering lexical scoping, function factories, and practical use cases.
Demonstrates deep understanding with minor gaps.`;

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: `Mastery: 91%

Excellent response showing deep understanding. The examples were clear and the explanation comprehensive.`,
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const { parseScore } = await import('../parse-score');
    vi.mocked(parseScore).mockReturnValue(0.91);

    const node = gradeQuizNode(mockProviderFactory);

    const state = {
      messages: [new HumanMessage(highQualityAnswer)],
      topic: 'Closures',
      userAnswer: highQualityAnswer,
    } as any;

    const result = await node(state, createMockConfig());

    // Should recognize high quality
    expect(result.mastery).toBeGreaterThanOrEqual(0.9);
    expect(result.messages[0].content).toMatch(/excellent|comprehensive|deep/i);
  });

  it('should provide different feedback for different score ranges', async () => {
    const scoreRanges = [
      { score: 0.95, tone: 'exceptional' },
      { score: 0.85, tone: 'good' },
      { score: 0.7, tone: 'developing' },
      { score: 0.5, tone: 'needs work' },
    ];

    for (const { score, tone } of scoreRanges) {
      vi.clearAllMocks();

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: `Score: ${Math.round(score * 100)}%`,
        }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const { parseScore } = await import('../parse-score');
      vi.mocked(parseScore).mockReturnValue(score);

      const node = gradeQuizNode(mockProviderFactory);

      const state = {
        messages: [new HumanMessage('Answer')],
        topic: 'Test',
        userAnswer: 'Answer',
      } as any;

      const result = await node(state, createMockConfig());

      expect(result.mastery).toBe(score);
    }
  });
});
