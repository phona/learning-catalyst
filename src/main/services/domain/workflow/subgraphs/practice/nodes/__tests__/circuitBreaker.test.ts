/**
 * Comprehensive test suite for circuitBreaker node
 * Tests circuit breaker functionality including:
 * - Support message generation
 * - Chunk streaming
 * - State updates
 * - Logger interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { circuitBreakerNode } from '../circuitBreaker';
import { PracticeAnnotation } from '../../state';
import { DEFAULT_PRACTICE_STATE } from '../../types';
import type { WorkflowDeps } from '../../../../state';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';

// Mock dependencies
const mockLoggerService = {
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  child: vi.fn().mockReturnValue({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
};

const mockProviderFactory = {
  getModel: vi.fn(),
  getEmbeddings: vi.fn(),
  getEmbeddingModel: vi.fn(),
  getRerankModel: vi.fn(),
};

const mockModel = {
  invoke: vi.fn(),
};

const mockEmitter = {
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
};

// Mock createChunkEmitter
vi.mock('../../../utils/chunk-emitter', () => ({
  createChunkEmitter: vi.fn().mockReturnValue({
    textStart: mockEmitter.textStart,
    textDelta: mockEmitter.textDelta,
    textEnd: mockEmitter.textEnd,
    toolInputStart: mockEmitter.toolInputStart,
    toolInputAvailable: mockEmitter.toolInputAvailable,
    toolOutputAvailable: mockEmitter.toolOutputAvailable,
    reasoningStart: mockEmitter.reasoningStart,
    reasoningDelta: mockEmitter.reasoningDelta,
    reasoningEnd: mockEmitter.reasoningEnd,
    error: mockEmitter.error,
    finish: mockEmitter.finish,
    abort: mockEmitter.abort,
  }),
  generateId: vi.fn().mockReturnValue('mock-id'),
}));

const createMockConfig = (): LangGraphRunnableConfig => ({
  writer: vi.fn(),
  configurable: {},
  tags: [],
  recursionLimit: 25,
} as any);

const mockDeps: WorkflowDeps = {
  agentManager: {} as any,
  loggerService: mockLoggerService,
  checkpointer: {} as any,
  configService: {} as any,
  providerFactory: mockProviderFactory,
  knowledgeService: {} as any,
  practiceService: {} as any,
  learningService: {} as any,
} as WorkflowDeps;

describe('circuitBreakerNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProviderFactory.getModel.mockResolvedValue(mockModel);
    mockModel.invoke.mockResolvedValue({
      content: 'I understand you\'ve been struggling, and that\'s completely normal. Taking a break can help you come back with fresh perspective.',
    });
  });

  describe('Basic Functionality', () => {
    it('generates supportive message and updates state', async () => {
      const node = circuitBreakerNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 3,
          hintsGiven: 2,
        },
        mastery: 0.3,
        topic: 'React',
      };

      const config = createMockConfig();

      const result = await node(state as any, config);

      // Verify logging
      expect(mockLoggerService.info).toHaveBeenCalledWith(
        'circuitBreakerNode: providing support',
        expect.objectContaining({
          topic: 'React',
          failureStreak: 3,
          mastery: 0.3,
        })
      );

      // Verify model was called with correct prompt
      expect(mockProviderFactory.getModel).toHaveBeenCalled();
      expect(mockModel.invoke).toHaveBeenCalledWith([
        { role: 'system', content: 'You are a supportive learning mentor.' },
        { role: 'user', content: expect.stringContaining('React') },
      ]);

      // Verify result structure
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toBeInstanceOf(AIMessage);
      expect(result.practice.isComplete).toBe(true);
      expect(result.practice.shouldCircuitBreak).toBe(true);
    });

    it('streams message via emitter', async () => {
      const node = circuitBreakerNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 4,
          hintsGiven: 3,
        },
        mastery: 0.2,
        topic: 'TypeScript',
      };

      const config = createMockConfig();

      await node(state as any, config);

      // Verify chunk streaming
      expect(mockEmitter.textStart).toHaveBeenCalledTimes(1);
      expect(mockEmitter.textDelta).toHaveBeenCalledTimes(1);
      expect(mockEmitter.textEnd).toHaveBeenCalledTimes(1);
    });

    it('handles different failure scenarios', async () => {
      const node = circuitBreakerNode(mockDeps);

      const scenarios = [
        { failureStreak: 3, mastery: 0.3, hintsUsed: 1, topic: 'JavaScript' },
        { failureStreak: 5, mastery: 0.1, hintsUsed: 4, topic: 'Python' },
        { failureStreak: 10, mastery: 0.0, hintsUsed: 5, topic: 'Algorithms' },
      ];

      for (const scenario of scenarios) {
        vi.clearAllMocks();
        mockProviderFactory.getModel.mockResolvedValue(mockModel);
        mockModel.invoke.mockResolvedValue({ content: 'Supportive message' });

        const state = {
          practice: {
            ...DEFAULT_PRACTICE_STATE,
            failureStreak: scenario.failureStreak,
            hintsGiven: scenario.hintsUsed,
          },
          mastery: scenario.mastery,
          topic: scenario.topic,
        };

        const result = await node(state as any, createMockConfig());

        expect(result.practice.shouldCircuitBreak).toBe(true);
        expect(result.practice.isComplete).toBe(true);
      }
    });
  });

  describe('Prompt Generation', () => {
    it('includes all context in prompt', async () => {
      const node = circuitBreakerNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 3,
          hintsGiven: 2,
        },
        mastery: 0.25,
        topic: 'Advanced React Patterns',
      };

      await node(state as any, createMockConfig());

      const prompt = mockModel.invoke.mock.calls[0][0][1].content;

      // Verify all context is included
      expect(prompt).toContain('Advanced React Patterns');
      expect(prompt).toContain('3'); // failure streak
      expect(prompt).toContain('25'); // mastery percentage
      expect(prompt).toContain('2'); // hints used
    });

    it('handles empty topic gracefully', async () => {
      const node = circuitBreakerNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 3,
          hintsGiven: 1,
        },
        mastery: 0.3,
        topic: '',
      };

      await node(state as any, createMockConfig());

      expect(mockModel.invoke).toHaveBeenCalled();
    });

    it('handles zero mastery score', async () => {
      const node = circuitBreakerNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 3,
          hintsGiven: 2,
        },
        mastery: 0,
        topic: 'Math',
      };

      await node(state as any, createMockConfig());

      const prompt = mockModel.invoke.mock.calls[0][0][1].content;
      expect(prompt).toContain('0%');
    });

    it('handles perfect mastery score (edge case)', async () => {
      const node = circuitBreakerNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 3,
          hintsGiven: 2,
        },
        mastery: 1.0,
        topic: 'Science',
      };

      await node(state as any, createMockConfig());

      const prompt = mockModel.invoke.mock.calls[0][0][1].content;
      expect(prompt).toContain('100%');
    });
  });

  describe('State Updates', () => {
    it('marks practice as complete', async () => {
      const node = circuitBreakerNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 3,
          hintsGiven: 1,
          isComplete: false, // Initially not complete
        },
        mastery: 0.3,
        topic: 'History',
      };

      const result = await node(state as any, createMockConfig());

      expect(result.practice.isComplete).toBe(true);
    });

    it('sets shouldCircuitBreak flag', async () => {
      const node = circuitBreakerNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 3,
          hintsGiven: 1,
          shouldCircuitBreak: false, // Initially false
        },
        mastery: 0.3,
        topic: 'Art',
      };

      const result = await node(state as any, createMockConfig());

      expect(result.practice.shouldCircuitBreak).toBe(true);
    });

    it('preserves other practice state fields', async () => {
      const node = circuitBreakerNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 3,
          hintsGiven: 1,
          currentQuestion: 'What is React?',
          focusConcepts: ['components', 'state'],
        },
        mastery: 0.3,
        topic: 'React',
      };

      const result = await node(state as any, createMockConfig());

      expect(result.practice.currentQuestion).toBe('What is React?');
      expect(result.practice.focusConcepts).toEqual(['components', 'state']);
    });
  });

  describe('Message Content', () => {
    it('returns AIMessage with generated content', async () => {
      const node = circuitBreakerNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 3,
          hintsGiven: 1,
        },
        mastery: 0.3,
        topic: 'Biology',
      };

      const result = await node(state as any, createMockConfig());

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toBeInstanceOf(AIMessage);
      expect(result.messages[0].content).toBeDefined();
      expect(typeof result.messages[0].content).toBe('string');
    });

    it('handles empty AI response', async () => {
      mockModel.invoke.mockResolvedValue({ content: '' });

      const node = circuitBreakerNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 3,
          hintsGiven: 1,
        },
        mastery: 0.3,
        topic: 'Chemistry',
      };

      const result = await node(state as any, createMockConfig());

      expect(result.messages[0].content).toBe('');
    });

    it('handles undefined AI response', async () => {
      mockModel.invoke.mockResolvedValue({ content: undefined });

      const node = circuitBreakerNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 3,
          hintsGiven: 1,
        },
        mastery: 0.3,
        topic: 'Physics',
      };

      const result = await node(state as any, createMockConfig());

      expect(result.messages[0].content).toBe('');
    });
  });

  describe('Logging', () => {
    it('logs support delivery', async () => {
      const node = circuitBreakerNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 3,
          hintsGiven: 2,
        },
        mastery: 0.3,
        topic: 'Literature',
      };

      await node(state as any, createMockConfig());

      expect(mockLoggerService.info).toHaveBeenCalledWith(
        'circuitBreakerNode: support delivered',
        expect.objectContaining({
          topic: 'Literature',
          contentLength: expect.any(Number),
        })
      );
    });

    it('logs with correct log level', async () => {
      const node = circuitBreakerNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 3,
          hintsGiven: 1,
        },
        mastery: 0.3,
        topic: 'Music',
      };

      await node(state as any, createMockConfig());

      expect(mockLoggerService.info).toHaveBeenCalled();
      expect(mockLoggerService.error).not.toHaveBeenCalled();
      expect(mockLoggerService.warn).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles provider factory errors', async () => {
      mockProviderFactory.getModel.mockRejectedValue(new Error('Provider unavailable'));

      const node = circuitBreakerNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 3,
          hintsGiven: 1,
        },
        mastery: 0.3,
        topic: 'Geography',
      };

      await expect(node(state as any, createMockConfig())).rejects.toThrow('Provider unavailable');
    });

    it('handles AI model invoke errors', async () => {
      mockModel.invoke.mockRejectedValue(new Error('Model error'));

      const node = circuitBreakerNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 3,
          hintsGiven: 1,
        },
        mastery: 0.3,
        topic: 'Economics',
      };

      await expect(node(state as any, createMockConfig())).rejects.toThrow('Model error');
    });
  });
});
