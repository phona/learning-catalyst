/**
 * Unit Tests: Workflow Graph Routing Logic
 *
 * PURPOSE:
 * Verify that workflow edge definitions and conditional routing functions correctly
 * control the flow of execution through the workflow graph based on state values.
 *
 * TEST STRATEGY:
 * 1. Test SIMPLE_EDGES array structure and correctness
 * 2. Test CONDITIONALS routing functions with various state inputs:
 *    - TOPIC_PARSE: error handling, missing topic
 *    - ASSESS: confidence-based routing (fast-track vs teach)
 *    - GRADE_QUIZ: mastery-based routing
 *    - EVALUATE: post-practice routing
 * 3. Test boundary conditions (exact threshold values)
 * 4. Test undefined/null state handling
 * 5. Test state transformations that affect routing
 *
 * DEPENDENCIES:
 * - @langchain/langgraph for START, END
 * - NodeName enum from types
 * - THRESHOLDS constants
 */

import { describe, it, expect } from 'vitest';
import { START, END } from '@langchain/langgraph';
import { SIMPLE_EDGES, CONDITIONALS } from '../edges';
import { NodeName } from '../types';
import { THRESHOLDS } from '../thresholds';
import type { WorkflowState } from '../state';

describe('Workflow Graph Routing', () => {
  describe('SIMPLE_EDGES', () => {
    it('should be an array', () => {
      expect(SIMPLE_EDGES).toBeInstanceOf(Array);
    });

    it('should define workflow initialization edge from START', () => {
      const startEdge = SIMPLE_EDGES.find(([from]) => from === START);
      expect(startEdge).toBeDefined();
      expect(startEdge?.[1]).toBe(NodeName.TOPIC_PARSE);
    });

    it('should define ASSESS to PLAN edge', () => {
      const assessEdge = SIMPLE_EDGES.find(
        ([from, to]) => from === NodeName.ASSESS && to === NodeName.PLAN
      );
      expect(assessEdge).toBeDefined();
    });

    it('should define FAST_TRACK_QUIZ to GRADE_QUIZ edge', () => {
      const quizEdge = SIMPLE_EDGES.find(
        ([from, to]) => from === NodeName.FAST_TRACK_QUIZ && to === NodeName.GRADE_QUIZ
      );
      expect(quizEdge).toBeDefined();
    });

    it('should define TEACH to PRACTICE edge', () => {
      const teachEdge = SIMPLE_EDGES.find(
        ([from, to]) => from === NodeName.TEACH && to === NodeName.PRACTICE
      );
      expect(teachEdge).toBeDefined();
    });

    it('should define PRACTICE to EVALUATE edge', () => {
      const practiceEdge = SIMPLE_EDGES.find(
        ([from, to]) => from === NodeName.PRACTICE && to === NodeName.EVALUATE
      );
      expect(practiceEdge).toBeDefined();
    });

    it('should define COMPLETE to END edge', () => {
      const completeEdge = SIMPLE_EDGES.find(
        ([from, to]) => from === NodeName.COMPLETE && to === END
      );
      expect(completeEdge).toBeDefined();
    });

    it('should have correct number of edges', () => {
      // START -> TOPIC_PARSE, ASSESS -> PLAN, FAST_TRACK_QUIZ -> GRADE_QUIZ,
      // TEACH -> PRACTICE, PRACTICE -> EVALUATE, COMPLETE -> END
      expect(SIMPLE_EDGES).toHaveLength(6);
    });

    it('should not have duplicate edges', () => {
      const edgeStrings = SIMPLE_EDGES.map(([from, to]) => `${from}->${to}`);
      const uniqueEdges = new Set(edgeStrings);
      expect(edgeStrings.length).toBe(uniqueEdges.size);
    });
  });

  describe('CONDITIONALS', () => {
    it('should be an object', () => {
      expect(CONDITIONALS).toBeInstanceOf(Object);
    });

    it('should have CONDITIONALS for all conditional nodes', () => {
      const conditionalNodes = [
        NodeName.TOPIC_PARSE,
        NodeName.ASSESS,
        NodeName.GRADE_QUIZ,
        NodeName.EVALUATE,
      ];

      for (const node of conditionalNodes) {
        expect(CONDITIONALS).toHaveProperty(node);
      }
    });

    it('should have functions for each conditional node', () => {
      const conditionalNodes = [
        NodeName.TOPIC_PARSE,
        NodeName.ASSESS,
        NodeName.GRADE_QUIZ,
        NodeName.EVALUATE,
      ];

      for (const node of conditionalNodes) {
        const routingFn = CONDITIONALS[node];
        expect(typeof routingFn).toBe('function');
      }
    });
  });

  describe('TOPIC_PARSE conditional routing', () => {
    const routingFn = CONDITIONALS[NodeName.TOPIC_PARSE];

    it('should route to COMPLETE when error is present', () => {
      const stateWithError: WorkflowState = {
        messages: [],
        topic: 'Test Topic',
        error: 'Knowledge service unavailable',
        confidence: 0,
        mastery: 0,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(stateWithError);
      expect(nextNode).toBe(NodeName.COMPLETE);
    });

    it('should route to COMPLETE when topic is missing', () => {
      const stateWithoutTopic: WorkflowState = {
        messages: [],
        topic: '',
        error: null,
        confidence: 0,
        mastery: 0,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(stateWithoutTopic);
      expect(nextNode).toBe(NodeName.COMPLETE);
    });

    it('should route to ASSESS when topic is valid and no error', () => {
      const validState: WorkflowState = {
        messages: [],
        topic: 'JavaScript Functions',
        error: null,
        confidence: 0,
        mastery: 0,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(validState);
      expect(nextNode).toBe(NodeName.ASSESS);
    });

    it('should handle undefined topic as missing', () => {
      const stateWithUndefinedTopic: WorkflowState = {
        ...({} as any), // Minimal state
        topic: undefined as any,
        error: null,
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(stateWithUndefinedTopic);
      expect(nextNode).toBe(NodeName.COMPLETE);
    });

    it('should prioritize error over topic', () => {
      const stateWithBoth: WorkflowState = {
        messages: [],
        topic: 'Valid Topic',
        error: 'Some error',
        confidence: 0,
        mastery: 0,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(stateWithBoth);
      expect(nextNode).toBe(NodeName.COMPLETE);
    });
  });

  describe('ASSESS conditional routing', () => {
    const routingFn = CONDITIONALS[NodeName.ASSESS];

    it('should route to FAST_TRACK_QUIZ when confidence >= threshold', () => {
      const highConfidenceState: WorkflowState = {
        messages: [],
        topic: 'Test',
        error: null,
        confidence: 0.8,
        mastery: 0,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(highConfidenceState);
      expect(nextNode).toBe(NodeName.FAST_TRACK_QUIZ);
    });

    it('should route to FAST_TRACK_QUIZ at exact threshold', () => {
      const exactThresholdState: WorkflowState = {
        messages: [],
        topic: 'Test',
        error: null,
        confidence: THRESHOLDS.CONFIDENCE_FAST_TRACK,
        mastery: 0,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(exactThresholdState);
      expect(nextNode).toBe(NodeName.FAST_TRACK_QUIZ);
    });

    it('should route to TEACH when confidence < threshold', () => {
      const lowConfidenceState: WorkflowState = {
        messages: [],
        topic: 'Test',
        error: null,
        confidence: 0.5,
        mastery: 0,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(lowConfidenceState);
      expect(nextNode).toBe(NodeName.TEACH);
    });

    it('should route to TEACH when confidence is just below threshold', () => {
      const justBelowThresholdState: WorkflowState = {
        messages: [],
        topic: 'Test',
        error: null,
        confidence: THRESHOLDS.CONFIDENCE_FAST_TRACK - 0.01,
        mastery: 0,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(justBelowThresholdState);
      expect(nextNode).toBe(NodeName.TEACH);
    });

    it('should handle undefined confidence by defaulting to 0.5', () => {
      const stateWithUndefinedConfidence: WorkflowState = {
        messages: [],
        topic: 'Test',
        error: null,
        confidence: undefined as any,
        mastery: 0,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(stateWithUndefinedConfidence);
      expect(nextNode).toBe(NodeName.TEACH);
    });

    it('should handle zero confidence', () => {
      const zeroConfidenceState: WorkflowState = {
        messages: [],
        topic: 'Test',
        error: null,
        confidence: 0,
        mastery: 0,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(zeroConfidenceState);
      expect(nextNode).toBe(NodeName.TEACH);
    });

    it('should handle maximum confidence (1.0)', () => {
      const maxConfidenceState: WorkflowState = {
        messages: [],
        topic: 'Test',
        error: null,
        confidence: 1.0,
        mastery: 0,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(maxConfidenceState);
      expect(nextNode).toBe(NodeName.FAST_TRACK_QUIZ);
    });
  });

  describe('GRADE_QUIZ conditional routing', () => {
    const routingFn = CONDITIONALS[NodeName.GRADE_QUIZ];

    it('should route to COMPLETE when mastery >= threshold', () => {
      const highMasteryState: WorkflowState = {
        messages: [],
        topic: 'Test',
        error: null,
        confidence: 0,
        mastery: 0.95,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(highMasteryState);
      expect(nextNode).toBe(NodeName.COMPLETE);
    });

    it('should route to COMPLETE at exact mastery threshold', () => {
      const exactThresholdState: WorkflowState = {
        messages: [],
        topic: 'Test',
        error: null,
        confidence: 0,
        mastery: THRESHOLDS.MASTERY_COMPLETE,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(exactThresholdState);
      expect(nextNode).toBe(NodeName.COMPLETE);
    });

    it('should route to TEACH when mastery < threshold', () => {
      const lowMasteryState: WorkflowState = {
        messages: [],
        topic: 'Test',
        error: null,
        confidence: 0,
        mastery: 0.7,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(lowMasteryState);
      expect(nextNode).toBe(NodeName.TEACH);
    });

    it('should handle undefined mastery by defaulting to 0', () => {
      const stateWithUndefinedMastery: WorkflowState = {
        messages: [],
        topic: 'Test',
        error: null,
        confidence: 0,
        mastery: undefined as any,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(stateWithUndefinedMastery);
      expect(nextNode).toBe(NodeName.TEACH);
    });
  });

  describe('EVALUATE conditional routing', () => {
    const routingFn = CONDITIONALS[NodeName.EVALUATE];

    it('should route to COMPLETE when mastery >= complete threshold', () => {
      const highMasteryState: WorkflowState = {
        messages: [],
        topic: 'Test',
        error: null,
        confidence: 0,
        mastery: 0.95,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(highMasteryState);
      expect(nextNode).toBe(NodeName.COMPLETE);
    });

    it('should route to COMPLETE at exact complete threshold', () => {
      const exactThresholdState: WorkflowState = {
        messages: [],
        topic: 'Test',
        error: null,
        confidence: 0,
        mastery: THRESHOLDS.MASTERY_COMPLETE,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(exactThresholdState);
      expect(nextNode).toBe(NodeName.COMPLETE);
    });

    it('should route to PRACTICE when mastery < complete threshold', () => {
      const lowMasteryState: WorkflowState = {
        messages: [],
        topic: 'Test',
        error: null,
        confidence: 0,
        mastery: 0.85,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(lowMasteryState);
      expect(nextNode).toBe(NodeName.PRACTICE);
    });

    it('should route to PRACTICE when mastery is just below threshold', () => {
      const justBelowThresholdState: WorkflowState = {
        messages: [],
        topic: 'Test',
        error: null,
        confidence: 0,
        mastery: THRESHOLDS.MASTERY_COMPLETE - 0.01,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(justBelowThresholdState);
      expect(nextNode).toBe(NodeName.PRACTICE);
    });

    it('should handle undefined mastery by defaulting to 0', () => {
      const stateWithUndefinedMastery: WorkflowState = {
        messages: [],
        topic: 'Test',
        error: null,
        confidence: 0,
        mastery: undefined as any,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      const nextNode = routingFn(stateWithUndefinedMastery);
      expect(nextNode).toBe(NodeName.PRACTICE);
    });
  });

  describe('Routing consistency', () => {
    it('should maintain consistent threshold usage across all conditionals', () => {
      // Verify that thresholds are consistently applied
      expect(THRESHOLDS.CONFIDENCE_FAST_TRACK).toBe(0.75);
      expect(THRESHOLDS.MASTERY_PASS).toBe(0.85);
      expect(THRESHOLDS.MASTERY_COMPLETE).toBe(0.9);

      // GRADE_QUIZ should use MASTERY_COMPLETE
      const gradeQuizThreshold = THRESHOLDS.MASTERY_COMPLETE;

      // EVALUATE should use MASTERY_COMPLETE
      const evaluateThreshold = THRESHOLDS.MASTERY_COMPLETE;

      expect(gradeQuizThreshold).toBe(evaluateThreshold);
    });

    it('should route through complete workflow for high-confidence user', () => {
      // Scenario: User with high confidence (fast-track)
      const assessState: WorkflowState = {
        messages: [],
        topic: 'Advanced JavaScript',
        error: null,
        confidence: 0.9,
        mastery: 0,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      // After ASSESS with high confidence -> FAST_TRACK_QUIZ
      expect(CONDITIONALS[NodeName.ASSESS](assessState)).toBe(NodeName.FAST_TRACK_QUIZ);

      // After FAST_TRACK_QUIZ with high mastery -> COMPLETE
      const afterQuizState = { ...assessState, mastery: 0.95 };
      expect(CONDITIONALS[NodeName.GRADE_QUIZ](afterQuizState)).toBe(NodeName.COMPLETE);
    });

    it('should route through complete workflow for low-confidence user', () => {
      // Scenario: User with low confidence (standard path)
      const assessState: WorkflowState = {
        messages: [],
        topic: 'Basic JavaScript',
        error: null,
        confidence: 0.4,
        mastery: 0,
        attemptCount: 0,
        practicePrompt: '',
        gaps: [],
        userAnswer: '',
        sessionBlueprint: undefined,
        interactionCount: 0,
        understandingLevel: 0,
        readyForPractice: false,
        sessionMetadata: {},
        practice: {
          currentQuestion: '',
          expectedAnswer: '',
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
        teach: {
          teachingRound: 0,
          maxRounds: 5,
          gaps: [],
          understandingLevel: 0,
          mastered: false,
          assessmentReason: '',
          questionsAsked: 0,
        },
      };

      // After ASSESS with low confidence -> TEACH
      expect(CONDITIONALS[NodeName.ASSESS](assessState)).toBe(NodeName.TEACH);

      // After TEACH -> PRACTICE (via SIMPLE_EDGES)

      // After PRACTICE with high mastery -> COMPLETE
      const afterPracticeState = { ...assessState, mastery: 0.95 };
      expect(CONDITIONALS[NodeName.EVALUATE](afterPracticeState)).toBe(NodeName.COMPLETE);
    });
  });
});
