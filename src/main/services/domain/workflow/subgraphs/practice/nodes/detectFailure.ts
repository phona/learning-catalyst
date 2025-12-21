/**
 * Practice Subgraph Node: FAILURE_DETECTOR
 *
 * Analyzes practice results to determine next action based on:
 * - Mastery level achieved
 * - Consecutive failure count
 * - Knowledge gaps identified
 *
 * This node replaces the main workflow's BREAKER and REMEDIATE nodes by:
 * 1. Detecting when user has repeatedly failed (circuit breaker trigger)
 * 2. Identifying knowledge gaps that need remediation
 * 3. Deciding whether to continue practice, remediate, or exit
 *
 * Flow Decision Logic:
 * - If mastery >= 0.85: Success - exit to parent workflow
 * - If failure streak >= 3: Circuit breaker - provide support and exit
 * - If knowledge gaps detected: Remediation - re-teach and continue
 * - Otherwise: Continue practice with next question
 */

import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import type { WorkflowDeps } from '../../../state';
import { PracticeAnnotation } from '../state';
import { THRESHOLDS } from '../../../thresholds';
import type { PracticeState } from '../types';

interface FailureDetectionResult {
  practice: PracticeState;
  shouldExit: boolean;
  exitReason: 'success' | 'circuit_breaker' | null;
  needsRemediation: boolean;
}

/**
 * Determines if knowledge gaps exist based on mastery score and context
 */
function detectKnowledgeGaps(
  mastery: number,
  hintsUsed: number,
  conversationTurns: number,
  previousGaps: string[] = []
): boolean {
  // Low mastery suggests knowledge gaps
  if (mastery < 0.5) {
    return true;
  }

  // High hint usage suggests incomplete understanding
  if (hintsUsed >= 3) {
    return true;
  }

  // Excessive conversation turns without progress
  if (conversationTurns >= 5 && mastery < 0.7) {
    return true;
  }

  // Previous gaps still relevant
  return previousGaps.length > 0 && mastery < 0.75;
}

/**
 * Determines if circuit breaker should trigger
 */
function shouldTriggerCircuitBreaker(
  failureStreak: number,
  mastery: number,
  hintsUsed: number
): boolean {
  // Too many consecutive failures
  if (failureStreak >= THRESHOLDS.BREAKER_ATTEMPTS) {
    return true;
  }

  // Consistently low performance with high hint usage
  if (failureStreak >= 2 && mastery < 0.4 && hintsUsed >= 2) {
    return true;
  }

  return false;
}

/**
 * Analyzes practice results and determines next action
 */
export const detectFailureNode =
  (deps: WorkflowDeps) =>
    async (
      state: typeof PracticeAnnotation.State,
      _config: LangGraphRunnableConfig
    ): Promise<FailureDetectionResult> => {
      const practice = state.practice!;
      const mastery = state.mastery ?? 0;
      const failureStreak = practice.failureStreak ?? 0;

      deps.loggerService.debug('detectFailureNode: analyzing', {
        mastery,
        failureStreak,
        hintsGiven: practice.hintsGiven,
        conversationTurns: practice.conversationTurns,
      });

      // Check for success FIRST - high mastery means we've achieved our goal
      if (mastery >= THRESHOLDS.MASTERY_PASS) {
        deps.loggerService.info('detectFailureNode: success achieved', {
          mastery,
          failureStreak,
        });

        return {
          practice: {
            ...practice,
            isComplete: true,
            failureStreak: 0, // Reset on success
          },
          shouldExit: true,
          exitReason: 'success',
          needsRemediation: false,
        };
      }

      // Determine if circuit breaker should trigger
      const shouldBreak = shouldTriggerCircuitBreaker(
        failureStreak,
        mastery,
        practice.hintsGiven
      );

      if (shouldBreak) {
        deps.loggerService.info('detectFailureNode: circuit breaker triggered', {
          failureStreak,
          mastery,
          hintsUsed: practice.hintsGiven,
        });

        return {
          practice: {
            ...practice,
            shouldCircuitBreak: true,
            failureStreak: failureStreak + 1,
          },
          shouldExit: true,
          exitReason: 'circuit_breaker',
          needsRemediation: false,
        };
      }

      // Detect knowledge gaps for remediation
      const gapsDetected = detectKnowledgeGaps(
        mastery,
        practice.hintsGiven,
        practice.conversationTurns,
        practice.focusConcepts
      );

      if (gapsDetected) {
        deps.loggerService.info('detectFailureNode: remediation needed', {
          mastery,
          hintsUsed: practice.hintsGiven,
          conversationTurns: practice.conversationTurns,
        });

        return {
          practice: {
            ...practice,
            needsRemediation: true,
            failureStreak: failureStreak + 1,
          },
          shouldExit: false,
          exitReason: null,
          needsRemediation: true,
        };
      }

      // Continue practice - update failure streak
      deps.loggerService.debug('detectFailureNode: continue practice', {
        mastery,
        failureStreak: failureStreak + 1,
      });

      return {
        practice: {
          ...practice,
          failureStreak: failureStreak + 1,
          isComplete: false,
        },
        shouldExit: false,
        exitReason: null,
        needsRemediation: false,
      };
    };
