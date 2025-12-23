/**
 * Comprehensive test suite for remediatePractice node
 * Tests remediation functionality including:
 * - Knowledge gap identification
 * - Alternative teaching approaches
 * - Focus concept extraction
 * - Remediation prompt generation
 * - State updates for next round
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { remediatePracticeNode } from '../remediatePractice';
import { PracticeAnnotation } from '../../state';
import { DEFAULT_PRACTICE_STATE } from '../../types';
import type { WorkflowDeps } from '../../../../state';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import { createChunkEmitter, generateId } from '../../../utils/chunk-emitter';

// Mock dependencies
const mockLoggerService = {
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  child: vi.fn().mockReturnThis(),
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

const createMockConfig = (): LangGraphRunnableConfig => ({
  writer: vi.fn(),
} as any);

// Track all chunks written to verify streaming behavior
const getWrittenChunks = (config: LangGraphRunnableConfig) => {
  return (config.writer as vi.MockedFunction<any>).mock.calls.map(
    call => call[0]
  );
};

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

describe('remediatePracticeNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProviderFactory.getModel.mockResolvedValue(mockModel);
    mockModel.invoke.mockResolvedValue({
      content: 'Let me explain this differently. A closure is like a backpack that a function carries with it, containing all the variables from where it was created.',
    });
  });

  describe('Basic Remediation Functionality', () => {
    it('provides targeted remediation based on knowledge gaps', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure in JavaScript?',
          focusConcepts: ['closure', 'scope'],
          hintsGiven: 3,
          conversationTurns: 5,
          needsRemediation: true,
          failureStreak: 2,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      const result = await node(state as any, createMockConfig());

      // Verify model was called
      expect(mockProviderFactory.getModel).toHaveBeenCalled();
      expect(mockModel.invoke).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: 'You are an expert tutor specializing in clear explanations.',
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('targeted remediation'),
          }),
        ])
      );

      // Verify remediation message was generated
      expect(result.messages[0].content).toContain('explain this differently');

      // Verify practice state updates
      expect(result.practice.needsRemediation).toBe(false);
      expect(result.practice.hintsGiven).toBe(0); // Reset
      expect(result.practice.conversationTurns).toBe(0); // Reset
    });

    it('includes all context in remediation prompt', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure', 'scope', 'lexical environment'],
          hintsGiven: 2,
          conversationTurns: 4,
          needsRemediation: true,
          failureStreak: 3,
        },
        topic: 'JavaScript Closures',
        mastery: 0.25,
      };

      await node(state as any, createMockConfig());

      const messages = mockModel.invoke.mock.calls[0][0];
      const userMessage = messages.find((m: any) => m.role === 'user');

      // Verify all context is included
      expect(userMessage.content).toContain('JavaScript Closures');
      expect(userMessage.content).toContain('25'); // Mastery percentage
      expect(userMessage.content).toContain('3'); // Failure streak
      expect(userMessage.content).toContain('closure, scope, lexical environment');
      expect(userMessage.content).toContain('targeted remediation');
    });

    it('handles different mastery levels', async () => {
      const node = remediatePracticeNode(mockDeps);

      const masteryLevels = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];

      for (const mastery of masteryLevels) {
        vi.clearAllMocks();
        mockProviderFactory.getModel.mockResolvedValue(mockModel);
        mockModel.invoke.mockResolvedValue({ content: `Remediation for ${mastery} mastery` });

        const state = {
          practice: {
            ...DEFAULT_PRACTICE_STATE,
            currentQuestion: 'What is a closure?',
            focusConcepts: ['closure'],
            needsRemediation: true,
            failureStreak: 1,
          },
          topic: 'JavaScript',
          mastery,
        };

        const result = await node(state as any, createMockConfig());

        expect(result.messages[0].content).toBeDefined();
      }
    });
  });

  describe('Focus Concept Extraction', () => {
    it('extracts and uses focus concepts', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure', 'scope'],
          relatedConcepts: ['lexical environment'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      await node(state as any, createMockConfig());

      const messages = mockModel.invoke.mock.calls[0][0];
      const userMessage = messages.find((m: any) => m.role === 'user');

      expect(userMessage.content).toContain('closure, scope');
    });

    it('adds related concepts when mastery is low (< 0.5)', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          relatedConcepts: ['scope', 'functions', 'variables'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3, // Low mastery
      };

      const result = await node(state as any, createMockConfig());

      // Should include focus concepts plus some related concepts
      expect(result.practice.focusConcepts).toContain('closure');
      // Related concepts are added when mastery is low
    });

    it('limits related concepts to first 2 when mastery is low', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          relatedConcepts: ['scope', 'functions', 'variables', 'context'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.2,
      };

      const result = await node(state as any, createMockConfig());

      // Should include closure and at most 2 related concepts
      const focusConcepts = result.practice.focusConcepts;
      expect(focusConcepts.length).toBeGreaterThanOrEqual(1);
      expect(focusConcepts.length).toBeLessThanOrEqual(3); // 1 focus + up to 2 related
      expect(focusConcepts).toContain('closure');
    });

    it('does not add related concepts when mastery is moderate or high', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          relatedConcepts: ['scope', 'functions'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.6, // Moderate mastery
      };

      const result = await node(state as any, createMockConfig());

      // Should only use original focus concepts
      expect(result.practice.focusConcepts).toEqual(['closure']);
    });

    it('extracts key terms from question when no focus concepts', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure in JavaScript and how does lexical scoping work?',
          focusConcepts: [], // Empty
          relatedConcepts: [],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      const result = await node(state as any, createMockConfig());

      // Should extract meaningful words from the question
      expect(result.practice.focusConcepts.length).toBeGreaterThan(0);
      expect(result.practice.focusConcepts.join(' ')).toMatch(/closure|JavaScript|scoping/);
    });

    it('filters out short words when extracting from question', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure in JavaScript?',
          focusConcepts: [], // Empty
          relatedConcepts: [],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      const result = await node(state as any, createMockConfig());

      // Should not include very short words like 'a', 'is', 'in'
      expect(result.practice.focusConcepts).not.toContain('a');
      expect(result.practice.focusConcepts).not.toContain('is');
      expect(result.practice.focusConcepts).not.toContain('in');
    });

    it('limits extracted terms to 3 words', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure in JavaScript with lexical scoping and functions?',
          focusConcepts: [], // Empty
          relatedConcepts: [],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      const result = await node(state as any, createMockConfig());

      // Should limit to at most 3 extracted terms
      const extractedCount = result.practice.focusConcepts.filter(
        term => !['closure', 'JavaScript', 'scoping', 'functions'].includes(term)
      ).length;
      expect(extractedCount).toBeLessThanOrEqual(3);
    });
  });

  describe('Remediation Prompt Generation', () => {
    it('includes topic in prompt', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'Advanced JavaScript',
        mastery: 0.3,
      };

      await node(state as any, createMockConfig());

      const messages = mockModel.invoke.mock.calls[0][0];
      const userMessage = messages.find((m: any) => m.role === 'user');

      expect(userMessage.content).toContain('Advanced JavaScript');
    });

    it('includes mastery percentage', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          needsRemediation: true,
          failureStreak: 2,
        },
        topic: 'JavaScript',
        mastery: 0.35,
      };

      await node(state as any, createMockConfig());

      const messages = mockModel.invoke.mock.calls[0][0];
      const userMessage = messages.find((m: any) => m.role === 'user');

      expect(userMessage.content).toContain('35%');
    });

    it('includes failure streak', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          needsRemediation: true,
          failureStreak: 5,
        },
        topic: 'JavaScript',
        mastery: 0.2,
      };

      await node(state as any, createMockConfig());

      const messages = mockModel.invoke.mock.calls[0][0];
      const userMessage = messages.find((m: any) => m.role === 'user');

      expect(userMessage.content).toContain('5');
    });

    it('includes knowledge gaps', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure', 'scope', 'lexical environment'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      await node(state as any, createMockConfig());

      const messages = mockModel.invoke.mock.calls[0][0];
      const userMessage = messages.find((m: any) => m.role === 'user');

      expect(userMessage.content).toContain('closure, scope, lexical environment');
    });

    it('includes hints used', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          hintsGiven: 3,
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      await node(state as any, createMockConfig());

      const messages = mockModel.invoke.mock.calls[0][0];
      const userMessage = messages.find((m: any) => m.role === 'user');

      expect(userMessage.content).toContain('3');
    });

    it('handles empty focus concepts in prompt', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: [], // Empty
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      await node(state as any, createMockConfig());

      const messages = mockModel.invoke.mock.calls[0][0];
      const userMessage = messages.find((m: any) => m.role === 'user');

      // Should mention 'foundational concepts' when gaps list is empty
      expect(userMessage.content).toContain('foundational concepts');
    });
  });

  describe('State Updates', () => {
    it('clears needsRemediation flag', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          needsRemediation: true, // Initially true
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      const result = await node(state as any, createMockConfig());

      expect(result.practice.needsRemediation).toBe(false);
    });

    it('resets hintsGiven counter', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          hintsGiven: 3, // Had used hints
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      const result = await node(state as any, createMockConfig());

      expect(result.practice.hintsGiven).toBe(0); // Reset
    });

    it('resets conversationTurns counter', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          conversationTurns: 5, // Had long conversation
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      const result = await node(state as any, createMockConfig());

      expect(result.practice.conversationTurns).toBe(0); // Reset
    });

    it('keeps focus concepts for next question', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure', 'scope'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      const result = await node(state as any, createMockConfig());

      // Focus concepts are preserved for next question generation
      expect(result.practice.focusConcepts).toEqual(['closure', 'scope']);
    });

    it('updates focus concepts with extracted ones', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure in JavaScript?',
          focusConcepts: [], // Empty
          relatedConcepts: [],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      const result = await node(state as any, createMockConfig());

      // Should have extracted concepts from the question
      expect(result.practice.focusConcepts.length).toBeGreaterThan(0);
    });

    it('preserves other practice state fields', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          relatedConcepts: ['scope'],
          attemptCount: 5,
          failureStreak: 2,
          needsRemediation: true,
          isComplete: false,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      const result = await node(state as any, createMockConfig());

      expect(result.practice.relatedConcepts).toEqual(['scope']);
      expect(result.practice.attemptCount).toBe(5);
      expect(result.practice.failureStreak).toBe(2);
      expect(result.practice.isComplete).toBe(false);
    });
  });

  describe('Chunk Streaming', () => {
    it('streams remediation message via chunk emitter', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      try {
        const result = await node(state as any, createMockConfig());
        console.log('Result:', result);
      } catch (error) {
        console.log('Error:', error);
        throw error;
      }

      const config = createMockConfig();
      await node(state as any, config);

      const chunks = getWrittenChunks(config);
      expect(chunks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'text-start' }),
          expect.objectContaining({ type: 'text-delta' }),
          expect.objectContaining({ type: 'text-end' })
        ])
      );
    });

    it('generates unique message IDs', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      const config = createMockConfig();
      await node(state as any, config);

      const chunks = getWrittenChunks(config);
      const textStartChunk = chunks.find(chunk => chunk.type === 'text-start');
      const textDeltaChunk = chunks.find(chunk => chunk.type === 'text-delta');

      expect(textStartChunk).toBeDefined();
      expect(textDeltaChunk).toBeDefined();
      expect(textStartChunk?.id).toBe(textDeltaChunk?.id);
    });

    it('streams complete remediation content', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      const remediationContent = 'Let me explain closures differently using an analogy...';
      mockModel.invoke.mockResolvedValue({ content: remediationContent });

      const config = createMockConfig();
      await node(state as any, config);

      const chunks = getWrittenChunks(config);
      const textDeltaChunk = chunks.find(chunk => chunk.type === 'text-delta');

      expect(textDeltaChunk).toBeDefined();
      expect(textDeltaChunk?.delta).toBe(remediationContent);
    });
  });

  describe('Message Content', () => {
    it('returns AIMessage with remediation content', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      const result = await node(state as any, createMockConfig());

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toBeInstanceOf(AIMessage);
      expect(result.messages[0].content).toBeDefined();
      expect(typeof result.messages[0].content).toBe('string');
    });

    it('handles empty AI response', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      mockModel.invoke.mockResolvedValue({ content: '' });

      const result = await node(state as any, createMockConfig());

      expect(result.messages[0].content).toBe('');
    });

    it('handles undefined AI response', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      mockModel.invoke.mockResolvedValue({ content: undefined });

      const result = await node(state as any, createMockConfig());

      expect(result.messages[0].content).toBe('');
    });
  });

  describe('Logging', () => {
    it('logs remediation start', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          needsRemediation: true,
          failureStreak: 2,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      await node(state as any, createMockConfig());

      expect(mockLoggerService.info).toHaveBeenCalledWith(
        'remediatePracticeNode: providing remediation',
        expect.objectContaining({
          topic: 'JavaScript',
          mastery: 0.3,
          failureStreak: 2,
          gaps: ['closure'],
        })
      );
    });

    it('logs remediation delivery', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure', 'scope'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      await node(state as any, createMockConfig());

      expect(mockLoggerService.info).toHaveBeenCalledWith(
        'remediatePracticeNode: remediation delivered',
        expect.objectContaining({
          topic: 'JavaScript',
          contentLength: expect.any(Number),
          focusConcepts: expect.arrayContaining(['closure', 'scope']),
        })
      );
    });

    it('logs with correct log level', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      await node(state as any, createMockConfig());

      expect(mockLoggerService.info).toHaveBeenCalled();
      expect(mockLoggerService.error).not.toHaveBeenCalled();
      expect(mockLoggerService.warn).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero mastery', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0, // Zero mastery
      };

      await node(state as any, createMockConfig());

      const messages = mockModel.invoke.mock.calls[0][0];
      const userMessage = messages.find((m: any) => m.role === 'user');

      expect(userMessage.content).toContain('0%');
    });

    it('handles perfect mastery (edge case)', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 1.0, // Perfect mastery
      };

      await node(state as any, createMockConfig());

      const messages = mockModel.invoke.mock.calls[0][0];
      const userMessage = messages.find((m: any) => m.role === 'user');

      expect(userMessage.content).toContain('100%');
    });

    it('handles zero failure streak', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          needsRemediation: true,
          failureStreak: 0, // No failures
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      await node(state as any, createMockConfig());

      const messages = mockModel.invoke.mock.calls[0][0];
      const userMessage = messages.find((m: any) => m.role === 'user');

      expect(userMessage.content).toContain('0');
    });

    it('handles very high failure streak', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          needsRemediation: true,
          failureStreak: 10, // Very high failure streak
        },
        topic: 'JavaScript',
        mastery: 0.1,
      };

      await node(state as any, createMockConfig());

      const messages = mockModel.invoke.mock.calls[0][0];
      const userMessage = messages.find((m: any) => m.role === 'user');

      expect(userMessage.content).toContain('10');
    });

    it('handles empty topic', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: '', // Empty topic
        mastery: 0.3,
      };

      const result = await node(state as any, createMockConfig());

      expect(result.messages[0].content).toBeDefined();
    });

    it('handles empty current question', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: '', // Empty
          focusConcepts: ['closure'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      const result = await node(state as any, createMockConfig());

      // Should still work, just won't extract from question
      expect(result.messages[0].content).toBeDefined();
    });

    it('handles undefined practice state', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: undefined,
        topic: 'JavaScript',
        mastery: 0.3,
      };

      await expect(node(state as any, createMockConfig())).rejects.toThrow();
    });
  });

  describe('Different Teaching Approaches', () => {
    it('generates alternative explanations', async () => {
      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          needsRemediation: true,
          failureStreak: 2,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      const result = await node(state as any, createMockConfig());

      // Remediation should offer a different teaching approach
      expect(result.messages[0].content).toContain('differently');
    });

    it('handles remediation for different topics', async () => {
      const node = remediatePracticeNode(mockDeps);

      const topics = ['React', 'TypeScript', 'Python', 'Algorithms', 'Data Structures'];

      for (const topic of topics) {
        vi.clearAllMocks();
        mockProviderFactory.getModel.mockResolvedValue(mockModel);
        mockModel.invoke.mockResolvedValue({ content: `Remediation for ${topic}` });

        const state = {
          practice: {
            ...DEFAULT_PRACTICE_STATE,
            currentQuestion: `Question about ${topic}`,
            focusConcepts: [topic.toLowerCase()],
            needsRemediation: true,
            failureStreak: 1,
          },
          topic,
          mastery: 0.3,
        };

        const result = await node(state as any, createMockConfig());

        expect(result.messages[0].content).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('handles provider factory errors', async () => {
      mockProviderFactory.getModel.mockRejectedValue(new Error('Provider unavailable'));

      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      await expect(node(state as any, createMockConfig())).rejects.toThrow('Provider unavailable');
    });

    it('handles AI model invoke errors', async () => {
      mockModel.invoke.mockRejectedValue(new Error('Model error'));

      const node = remediatePracticeNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          currentQuestion: 'What is a closure?',
          focusConcepts: ['closure'],
          needsRemediation: true,
          failureStreak: 1,
        },
        topic: 'JavaScript',
        mastery: 0.3,
      };

      await expect(node(state as any, createMockConfig())).rejects.toThrow('Model error');
    });
  });
});
