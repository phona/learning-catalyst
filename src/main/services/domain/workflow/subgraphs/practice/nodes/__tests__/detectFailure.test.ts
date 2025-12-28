/**
 * Comprehensive test suite for detectFailure node
 * Tests failure detection logic including:
 * - Circuit breaker triggers
 * - Knowledge gap detection
 * - Success scenarios
 * - Continuation scenarios
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectFailureNode } from '../detectFailure';
import { PracticeAnnotation } from '../../state';
import { DEFAULT_PRACTICE_STATE } from '../../types';
import type { WorkflowDeps } from '../../../../state';

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

const mockDeps: WorkflowDeps = {
  agentManager: {} as any,
  loggerService: mockLoggerService,
  checkpointer: {} as any,
  configService: {} as any,
  providerFactory: {} as any,
  knowledgeService: {} as any,
  practiceService: {} as any,
  learningService: {} as any,
} as WorkflowDeps;

describe('detectFailureNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Circuit Breaker Scenarios', () => {
    it('triggers circuit breaker after 3 consecutive failures', async () => {
      const node = detectFailureNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 3,
          hintsGiven: 1,
        },
        mastery: 0.3,
        topic: 'React',
      };

      const result = await node(state as any, {} as any);

      expect(mockLoggerService.info).toHaveBeenCalledWith(
        'detectFailureNode: circuit breaker triggered',
        expect.objectContaining({
          failureStreak: 3,
          mastery: 0.3,
          hintsUsed: 1,
        })
      );

      expect(result.shouldExit).toBe(true);
      expect(result.exitReason).toBe('circuit_breaker');
      expect(result.practice.shouldCircuitBreak).toBe(true);
    });

    it('triggers circuit breaker with low mastery and high hint usage', async () => {
      const node = detectFailureNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 2,
          hintsGiven: 3,
        },
        mastery: 0.3,
        topic: 'TypeScript',
      };

      const result = await node(state as any, {} as any);

      expect(result.shouldExit).toBe(true);
      expect(result.exitReason).toBe('circuit_breaker');
      expect(result.practice.shouldCircuitBreak).toBe(true);
    });
  });

  describe('Success Scenarios', () => {
    it('recognizes success when mastery >= 0.85', async () => {
      const node = detectFailureNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 1,
          hintsGiven: 1,
        },
        mastery: 0.9,
        topic: 'JavaScript',
      };

      const result = await node(state as any, {} as any);

      expect(mockLoggerService.info).toHaveBeenCalledWith(
        'detectFailureNode: success achieved',
        expect.objectContaining({
          mastery: 0.9,
          failureStreak: 1,
        })
      );

      expect(result.shouldExit).toBe(true);
      expect(result.exitReason).toBe('success');
      expect(result.practice.isComplete).toBe(true);
      expect(result.practice.failureStreak).toBe(0); // Reset on success
    });

    it('recognizes success at exact threshold (0.85)', async () => {
      const node = detectFailureNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 2,
        },
        mastery: 0.85,
        topic: 'Python',
      };

      const result = await node(state as any, {} as any);

      expect(result.shouldExit).toBe(true);
      expect(result.exitReason).toBe('success');
      expect(result.practice.isComplete).toBe(true);
    });
  });

  describe('Knowledge Gap Detection', () => {
    it('detects gaps with low mastery (< 0.5)', async () => {
      const node = detectFailureNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 1,
          hintsGiven: 1,
          conversationTurns: 2,
          focusConcepts: ['variables', 'functions'],
        },
        mastery: 0.4,
        topic: 'Programming Basics',
      };

      const result = await node(state as any, {} as any);

      expect(mockLoggerService.info).toHaveBeenCalledWith(
        'detectFailureNode: remediation needed',
        expect.any(Object)
      );

      expect(result.needsRemediation).toBe(true);
      expect(result.shouldExit).toBe(false);
      expect(result.practice.needsRemediation).toBe(true);
      expect(result.practice.failureStreak).toBe(2); // Incremented
    });

    it('detects gaps with excessive hint usage (>= 3)', async () => {
      const node = detectFailureNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 0,
          hintsGiven: 3,
          conversationTurns: 1,
        },
        mastery: 0.6,
        topic: 'Algorithms',
      };

      const result = await node(state as any, {} as any);

      expect(result.needsRemediation).toBe(true);
      expect(result.practice.needsRemediation).toBe(true);
    });

    it('detects gaps with excessive conversation turns and low mastery', async () => {
      const node = detectFailureNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 0,
          hintsGiven: 1,
          conversationTurns: 5,
        },
        mastery: 0.65,
        topic: 'Data Structures',
      };

      const result = await node(state as any, {} as any);

      expect(result.needsRemediation).toBe(true);
    });

    it('considers previous gaps when mastery is moderate', async () => {
      const node = detectFailureNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 0,
          hintsGiven: 1,
          conversationTurns: 2,
          focusConcepts: ['async', 'promises'], // Previous gaps
        },
        mastery: 0.7,
        topic: 'JavaScript',
      };

      const result = await node(state as any, {} as any);

      expect(result.needsRemediation).toBe(true);
    });
  });

  describe('Continue Practice Scenarios', () => {
    it('continues practice when mastery is moderate and no gaps detected', async () => {
      const node = detectFailureNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 1,
          hintsGiven: 1,
          conversationTurns: 2,
          focusConcepts: [],
        },
        mastery: 0.6,
        topic: 'HTML',
      };

      const result = await node(state as any, {} as any);

      expect(mockLoggerService.debug).toHaveBeenCalledWith(
        'detectFailureNode: continue practice',
        expect.any(Object)
      );

      expect(result.shouldExit).toBe(false);
      expect(result.needsRemediation).toBe(false);
      expect(result.practice.isComplete).toBe(false);
      expect(result.practice.failureStreak).toBe(2); // Incremented
    });

    it('continues practice with increasing failure streak', async () => {
      const node = detectFailureNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 2,
          hintsGiven: 0,
          conversationTurns: 1,
        },
        mastery: 0.7,
        topic: 'CSS',
      };

      const result = await node(state as any, {} as any);

      expect(result.practice.failureStreak).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('handles zero mastery score', async () => {
      const node = detectFailureNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 0,
          hintsGiven: 0,
        },
        mastery: 0,
        topic: 'Math',
      };

      const result = await node(state as any, {} as any);

      expect(result.needsRemediation).toBe(true); // Low mastery triggers gap detection
    });

    it('handles maximum mastery score', async () => {
      const node = detectFailureNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 5,
        },
        mastery: 1.0,
        topic: 'Science',
      };

      const result = await node(state as any, {} as any);

      expect(result.exitReason).toBe('success');
    });

    it('handles undefined mastery (defaults to 0)', async () => {
      const node = detectFailureNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 0,
        },
        mastery: undefined,
        topic: 'History',
      };

      const result = await node(state as any, {} as any);

      // Should treat undefined as 0, triggering gap detection
      expect(result.needsRemediation).toBe(true);
    });

    it('handles empty focus concepts array', async () => {
      const node = detectFailureNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 0,
          hintsGiven: 2,
          conversationTurns: 3,
          focusConcepts: [], // Empty
        },
        mastery: 0.55,
        topic: 'Geography',
      };

      const result = await node(state as any, {} as any);

      // With moderate mastery and no excessive hints/conversation, should continue
      expect(result.shouldExit).toBe(false);
    });
  });

  describe('Logging', () => {
    it('logs debug information on entry', async () => {
      const node = detectFailureNode(mockDeps);

      const state = {
        practice: {
          ...DEFAULT_PRACTICE_STATE,
          failureStreak: 1,
          hintsGiven: 2,
          conversationTurns: 3,
        },
        mastery: 0.6,
        topic: 'Biology',
      };

      await node(state as any, {} as any);

      expect(mockLoggerService.debug).toHaveBeenCalledWith(
        'detectFailureNode: analyzing',
        expect.objectContaining({
          mastery: 0.6,
          failureStreak: 1,
          hintsGiven: 2,
          conversationTurns: 3,
        })
      );
    });
  });
});
