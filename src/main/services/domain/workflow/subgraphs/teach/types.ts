/**
 * Teach Subgraph Types
 *
 * NO imports from workflow/state to avoid cyclic dependencies.
 * These types are imported by workflow/state.ts and teach nodes.
 */

/**
 * User response classification for teach loop
 */
export type TeachIntent =
  | 'question'      // User asks a question about the topic
  | 'ready'         // User says they understand / ready to practice
  | 'confused'      // User expresses confusion
  | 'needs_more'    // User wants deeper explanation
  | 'off_topic';    // Unrelated response

/**
 * Teach subgraph state
 */
export interface TeachState {
  teachingRound: number;
  maxRounds: number;
  teachIntent?: TeachIntent;
  gaps: string[];              // Concepts needing clarification
  understandingLevel: number;  // 0.0 - 1.0
  mastered: boolean;
  assessmentReason: string;
  questionsAsked: number;
}

/**
 * Default teach state values
 */
export const DEFAULT_TEACH_STATE: TeachState = {
  teachingRound: 0,
  maxRounds: 5,
  teachIntent: undefined,
  gaps: [],
  understandingLevel: 0,
  mastered: false,
  assessmentReason: '',
  questionsAsked: 0,
};
