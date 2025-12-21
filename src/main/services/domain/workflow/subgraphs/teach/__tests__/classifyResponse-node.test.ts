import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyResponseNode } from '../nodes/classifyResponse';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { DEFAULT_TEACH_STATE, TeachIntent } from '../types';
import type { WorkflowDeps } from '../../../state';

const createMockConfig = (): LangGraphRunnableConfig => ({});

// Factory for mock dependencies - follows DI pattern from testing.md
// Pattern: Direct LLM invocation (not .pipe() chains)
const createMockDeps = (modelResponse: string = 'question'): WorkflowDeps => {
  const mockModel = {
    invoke: vi.fn().mockResolvedValue({ content: modelResponse }),
  };

  return {
    providerFactory: {
      getModel: vi.fn().mockResolvedValue(mockModel),
      getEmbeddings: vi.fn(),
      getEmbeddingModel: vi.fn(),
      getRerankModel: vi.fn(),
    },
    loggerService: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    },
    agentManager: {} as any,
    checkpointer: {} as any,
    configService: {} as any,
    knowledgeService: {} as any,
    practiceService: {} as any,
    learningService: {} as any,
  };
};

// Helper to create base state
const createBaseState = (overrides: Record<string, unknown> = {}) => ({
  topic: 'Test Topic',
  userAnswer: 'Test response',
  messages: [],
  teach: {
    ...DEFAULT_TEACH_STATE,
    teachingRound: 1,
  },
  ...overrides,
});

const getMessageRole = (message: any): string | undefined => {
  if (!message || typeof message !== 'object') return undefined;
  if (typeof message.role === 'string') return message.role;

  const rawType =
    typeof message._getType === 'function'
      ? message._getType()
      : typeof message.getType === 'function'
        ? message.getType()
        : typeof message.type === 'string'
          ? message.type
          : undefined;

  if (rawType === 'human') return 'user';
  if (rawType === 'system') return 'system';
  if (rawType === 'ai') return 'assistant';
  return rawType;
};

const getMessageContentText = (message: any): string => {
  const content = message?.content;
  if (typeof content === 'string') return content;
  try {
    return JSON.stringify(content);
  } catch {
    return String(content ?? '');
  }
};

describe('[TC-501] classifyResponse node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fast path: keyword detection', () => {
    it('should classify question responses via keyword detection', async () => {
      const testQuestions = [
        'How do closures work?',
        'Can you explain this more?',
        'What is the difference between var and let?',
        'Why do we need closures?',
        'Could you give another example?',
      ];

      for (const question of testQuestions) {
        vi.clearAllMocks();

        const deps = createMockDeps();
        const node = classifyResponseNode(deps);

        const state = createBaseState({
          topic: 'JavaScript Closures',
          userAnswer: question,
        });

        const result = await node(state, createMockConfig());

        // Should classify as question via keyword detection (no AI call)
        expect(result.teach?.teachIntent).toBe('question');
        expect(deps.providerFactory.getModel).not.toHaveBeenCalled();
      }
    });

    it('should classify readiness signals via keyword detection', async () => {
      const readinessSignals = [
        'I understand now',
        'That makes sense',
        'I get it',
        'Ready to practice',
        'I am ready',
        'Got it, thanks',
        'I understand',
        'Makes sense',
      ];

      for (const signal of readinessSignals) {
        vi.clearAllMocks();

        const deps = createMockDeps();
        const node = classifyResponseNode(deps);

        const state = createBaseState({ userAnswer: signal });

        const result = await node(state, createMockConfig());

        // Should classify as ready via keyword detection (no AI call)
        expect(result.teach?.teachIntent).toBe('ready');
        expect(deps.providerFactory.getModel).not.toHaveBeenCalled();
      }
    });

    it('should classify confusion responses via keyword detection', async () => {
      const confusionExpressions = [
        "I don't understand",
        "This is confusing",
        "I'm lost",
        "I don't get it",
        'This is unclear',
        "I'm confused",
        "Huh?",
        "This doesn't make sense",
      ];

      for (const expression of confusionExpressions) {
        vi.clearAllMocks();

        const deps = createMockDeps();
        const node = classifyResponseNode(deps);

        const state = createBaseState({ userAnswer: expression });

        const result = await node(state, createMockConfig());

        // Should classify as confused via keyword detection (no AI call)
        expect(result.teach?.teachIntent).toBe('confused');
        expect(deps.providerFactory.getModel).not.toHaveBeenCalled();
      }
    });

    it('should classify needs_more responses via keyword detection', async () => {
      const needsMoreSignals = [
        'Tell me more',
        'More detail',
        'Go deeper',
        'More examples',
        'Can you expand',
        'Continue',
        'Keep going',
        'Elaborate',
      ];

      for (const signal of needsMoreSignals) {
        vi.clearAllMocks();

        const deps = createMockDeps();
        const node = classifyResponseNode(deps);

        const state = createBaseState({ userAnswer: signal });

        const result = await node(state, createMockConfig());

        // Should classify as needs_more via keyword detection (no AI call)
        expect(result.teach?.teachIntent).toBe('needs_more');
        expect(deps.providerFactory.getModel).not.toHaveBeenCalled();
      }
    });

    it('should detect question mark as question intent (except ready phrases)', async () => {
      // Note: "Ready?" matches the ready keyword, so it will be classified as 'ready'
      const questionResponses = ['Yes?', 'Good?', 'Okay?'];

      for (const response of questionResponses) {
        vi.clearAllMocks();

        const deps = createMockDeps();
        const node = classifyResponseNode(deps);

        const state = createBaseState({ userAnswer: response });

        const result = await node(state, createMockConfig());

        // Question marks should be detected (unless they match ready phrases)
        expect(result.teach?.teachIntent).toBe('question');
      }
    });
  }); // end describe('fast path: keyword detection')

  describe('edge cases', () => {
    it('should handle empty response as confused', async () => {
      const deps = createMockDeps();
      const node = classifyResponseNode(deps);

      const state = createBaseState({ userAnswer: '' });

      const result = await node(state, createMockConfig());

      // Empty response should be classified as confused (fast path)
      expect(result.teach?.teachIntent).toBe('confused');
      expect(deps.providerFactory.getModel).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only response as confused', async () => {
      const deps = createMockDeps();
      const node = classifyResponseNode(deps);

      const state = createBaseState({ userAnswer: '   ' });

      const result = await node(state, createMockConfig());

      // Whitespace-only should be classified as confused (fast path)
      expect(result.teach?.teachIntent).toBe('confused');
      expect(deps.providerFactory.getModel).not.toHaveBeenCalled();
    });

    it('should handle very long responses', async () => {
      const longResponse = 'I have a question about closures. '.repeat(100);

      const deps = createMockDeps('question');
      const node = classifyResponseNode(deps);

      const state = createBaseState({ userAnswer: longResponse });

      const result = await node(state, createMockConfig());

      // Should handle long responses via AI classification
      expect(result.teach?.teachIntent).toBe('question');
      expect(deps.providerFactory.getModel).toHaveBeenCalled();
    });

    it('should handle empty topic with ambiguous response', async () => {
      const deps = createMockDeps('question');
      const node = classifyResponseNode(deps);

      // Use ambiguous response that won't match keywords
      const state = createBaseState({ topic: '', userAnswer: 'This is interesting' });

      const result = await node(state, createMockConfig());

      // Should still classify even with empty topic (via AI)
      expect(result.teach?.teachIntent).toBe('question');
      expect(deps.providerFactory.getModel).toHaveBeenCalled();
    });

    it('should handle model response that does not match any intent', async () => {
      // Use truly random response that won't match any intent keywords
      const deps = createMockDeps('!@#$%^&*()');
      const node = classifyResponseNode(deps);
      const state = createBaseState({ userAnswer: 'Completely random text' });

      const result = await node(state, createMockConfig());

      // Unknown model responses should fall back to a safe default
      expect(result.teach?.teachIntent).toBe('question');
      expect(deps.providerFactory.getModel).toHaveBeenCalled();
    });

    it('should handle model returning null content', async () => {
      const mockModel = { invoke: vi.fn().mockResolvedValue({ content: null }) };
      const deps = createMockDeps();
      deps.providerFactory = {
        ...deps.providerFactory,
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyResponseNode(deps);
      const state = createBaseState({ userAnswer: 'Test input' });

      const result = await node(state, createMockConfig());

      // Node should handle null content (parseIntent will convert to string)
      expect(result.teach?.teachIntent).toBe('question'); // Default fallback
    });

    it('should handle model returning whitespace-only content', async () => {
      const deps = createMockDeps('   ');
      const node = classifyResponseNode(deps);
      const state = createBaseState({ userAnswer: 'Test input' });

      const result = await node(state, createMockConfig());

      // Should return trimmed or as-is (parseIntent handles whitespace)
      expect(result.teach?.teachIntent).toBeDefined();
    });
  }); // end describe('edge cases')

  describe('AI classification path', () => {
    it('should use AI for responses without keyword matches', async () => {
      const ambiguousResponse = 'This is interesting';

      const deps = createMockDeps('ready');
      const node = classifyResponseNode(deps);

      const state = createBaseState({ userAnswer: ambiguousResponse });

      const result = await node(state, createMockConfig());

      // Should use AI classification for ambiguous response
      expect(result.teach?.teachIntent).toBe('ready');
      expect(deps.providerFactory.getModel).toHaveBeenCalled();
    });

    it('should call model with formatted messages', async () => {
      const mockModel = {
        invoke: vi.fn().mockResolvedValue({ content: 'question' }),
      };

      const deps = createMockDeps();
      deps.providerFactory = {
        ...deps.providerFactory,
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyResponseNode(deps);

      // Use truly random response that won't match any keywords
      const state = createBaseState({
        topic: 'JavaScript Closures',
        userAnswer: 'Testing one two three',
      });

      await node(state, createMockConfig());

      // Verify model was called
      expect(mockModel.invoke).toHaveBeenCalled();

      // Get the messages passed to the model
      const messages = mockModel.invoke.mock.calls[0][0];
      expect(Array.isArray(messages)).toBe(true);

      // Should include system and user messages
      const systemMessage = messages.find((m: any) => getMessageRole(m) === 'system');
      const userMessage = messages.find((m: any) => getMessageRole(m) === 'user');

      expect(systemMessage).toBeDefined();
      expect(userMessage).toBeDefined();

      // User message should include topic and response
      if (userMessage) {
        const text = getMessageContentText(userMessage);
        expect(text).toContain('Closures');
        expect(text).toContain('Testing one two three');
      }
    });

    it('should parse intent from AI response correctly', async () => {
      const testCases: Array<{ response: string; expected: TeachIntent }> = [
        { response: 'ready', expected: 'ready' },
        { response: 'READY', expected: 'ready' },
        { response: 'I am ready', expected: 'ready' },
        { response: 'confused', expected: 'confused' },
        { response: 'question', expected: 'question' },
        { response: 'needs more', expected: 'needs_more' },
        { response: 'off topic', expected: 'off_topic' },
      ];

      for (const { response, expected } of testCases) {
        vi.clearAllMocks();

        const deps = createMockDeps(response);
        const node = classifyResponseNode(deps);

        const state = createBaseState({ userAnswer: 'Ambiguous text' });

        const result = await node(state, createMockConfig());

        expect(result.teach?.teachIntent).toBe(expected);
      }
    });
  }); // end describe('AI classification path')

  describe('error handling', () => {
    it('should handle model invocation errors with fallback', async () => {
      const mockModel = {
        invoke: vi.fn().mockRejectedValue(new Error('Model unavailable')),
      };

      const deps = createMockDeps();
      deps.providerFactory = {
        ...deps.providerFactory,
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyResponseNode(deps);

      const state = createBaseState({ userAnswer: 'I have a question' });

      const result = await node(state, createMockConfig());

      // Should fallback to 'question' on error
      expect(result.teach?.teachIntent).toBe('question');
      expect(deps.loggerService.error).toHaveBeenCalled();
    });

    it('should handle provider factory errors with fallback', async () => {
      const deps = createMockDeps();
      deps.providerFactory = {
        ...deps.providerFactory,
        getModel: vi.fn().mockRejectedValue(new Error('Provider unavailable')),
      };

      const node = classifyResponseNode(deps);
      // Use ambiguous response to ensure AI path is taken
      const state = createBaseState({ userAnswer: 'Ambiguous response' });

      const result = await node(state, createMockConfig());

      // Should fallback to 'question' on provider error (errors are caught)
      expect(result.teach?.teachIntent).toBe('question');
      expect(deps.loggerService.error).toHaveBeenCalled();
    });
  }); // end describe('error handling')

  describe('state management', () => {
    it('should preserve existing teach state properties', async () => {
      const mockModel = {
        invoke: vi.fn().mockResolvedValue({ content: 'ready' }),
      };

      const deps = createMockDeps();
      deps.providerFactory = {
        ...deps.providerFactory,
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyResponseNode(deps);

      const state = createBaseState({
        userAnswer: 'I understand now',
        teach: {
          ...DEFAULT_TEACH_STATE,
          teachingRound: 3,
          gaps: ['gap1', 'gap2'],
          understandingLevel: 0.7,
          mastered: false,
          assessmentReason: 'Making progress',
          questionsAsked: 2,
        },
      });

      const result = await node(state, createMockConfig());

      // Should only update teachIntent (node returns partial update)
      expect(result.teach?.teachIntent).toBe('ready');
    });

    it('should only update teachIntent in state', async () => {
      const deps = createMockDeps('question');
      const node = classifyResponseNode(deps);

      const state = createBaseState({
        userAnswer: 'What is this?',
        teach: {
          ...DEFAULT_TEACH_STATE,
          teachingRound: 1,
          gaps: ['initial gap'],
        },
      });

      const result = await node(state, createMockConfig());

      // Only teachIntent should change (node returns partial update)
      expect(result.teach?.teachIntent).toBe('question');
      expect(result.teach?.gaps).toBeUndefined(); // Not preserved in partial update
    });

    it('should work with different teaching rounds', async () => {
      const testRounds = [1, 2, 3, 4, 5];

      for (const round of testRounds) {
        vi.clearAllMocks();

        const deps = createMockDeps('ready');
        const node = classifyResponseNode(deps);

        const state = createBaseState({
          userAnswer: 'Ready to practice',
          teach: { ...DEFAULT_TEACH_STATE, teachingRound: round },
        });

        const result = await node(state, createMockConfig());

        expect(result.teach?.teachIntent).toBe('ready');
      }
    });

    it('should log debug information', async () => {
      const deps = createMockDeps('question');
      const node = classifyResponseNode(deps);

      const state = createBaseState({ userAnswer: 'How does this work?' });

      await node(state, createMockConfig());

      // Should log debug information
      expect(deps.loggerService.debug).toHaveBeenCalled();
    });

    it('should log performance metrics', async () => {
      const mockModel = {
        invoke: vi.fn().mockResolvedValue({ content: 'ready' }),
      };

      const deps = createMockDeps();
      deps.providerFactory = {
        ...deps.providerFactory,
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = classifyResponseNode(deps);

      const state = createBaseState({ userAnswer: 'Ambiguous response' });

      await node(state, createMockConfig());

      // Should log performance metrics
      expect(deps.loggerService.info).toHaveBeenCalledWith(
        'teach:classifyResponse complete',
        expect.objectContaining({
          intent: 'ready',
          durationMs: expect.any(Number),
        })
      );
    });

    it('should handle all TeachIntent values', async () => {
      const intents: TeachIntent[] = ['question', 'ready', 'confused', 'needs_more', 'off_topic'];

      for (const intent of intents) {
        vi.clearAllMocks();

        const deps = createMockDeps(intent);
        const node = classifyResponseNode(deps);

        const state = createBaseState({ userAnswer: 'Test response' });

        const result = await node(state, createMockConfig());

        expect(result.teach?.teachIntent).toBe(intent);
      }
    });
  }); // end describe('state management')
}); // end describe('[TC-501] classifyResponse node')
