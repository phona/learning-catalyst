/**
 * Practice Subgraph Types
 *
 * NO imports from workflow/state to avoid cyclic dependencies.
 * These types are imported by workflow/state.ts and practice nodes.
 */

/**
 * User intent classification for practice Q&A flow
 */
export type UserIntent =
  | 'answer_attempt'   // User is providing an answer (even partial/wrong)
  | 'hint_request'     // User asks for help/hints
  | 'clarification'    // User asks what the question means
  | 'thinking_aloud'   // User is reasoning but not answering yet
  | 'give_up'          // User says they don't know or wants to skip
  | 'off_topic';       // Unrelated to the question

/**
 * Practice subgraph state
 */
export interface PracticeState {
  currentQuestion: string;
  expectedAnswer: string;
  userIntent?: UserIntent;
  hintsGiven: number;
  conversationTurns: number;
  isComplete: boolean;
  focusConcepts: string[];
  relatedConcepts: string[];
  attemptCount: number;  // Track practice attempts

  // Failure detection and handling
  failureStreak: number;         // Consecutive failures
  needsRemediation: boolean;     // Knowledge gaps detected
  shouldCircuitBreak: boolean;   // Circuit breaker triggered
}

/**
 * Default practice state values
 */
export const DEFAULT_PRACTICE_STATE: PracticeState = {
  currentQuestion: '',
  expectedAnswer: '',
  userIntent: undefined,
  hintsGiven: 0,
  conversationTurns: 0,
  isComplete: false,
  focusConcepts: [],
  relatedConcepts: [],
  attemptCount: 0,

  // Failure detection defaults
  failureStreak: 0,
  needsRemediation: false,
  shouldCircuitBreak: false,
};
