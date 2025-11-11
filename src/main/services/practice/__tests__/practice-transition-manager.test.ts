/**
 * Practice Transition Manager Tests
 *
 * Tests for smooth transitions between conversation and practice suggestions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock LoggerFactory before importing PracticeTransitionManager
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => mockLogger),
};

vi.mock('../../../main/services/logger', () => ({
  LoggerFactory: {
    getLogger: vi.fn(() => mockLogger),
    getInstance: vi.fn(() => ({
      getAsyncLocalStorage: vi.fn(),
      createLogger: vi.fn(() => mockLogger),
      createContextAwareLogger: vi.fn(() => mockLogger),
      runWithContext: vi.fn(),
      getCurrentContext: vi.fn(),
      createContext: vi.fn(),
    })),
  },
  MainThreadLogger: vi.fn(() => mockLogger),
  ContextAwareLogger: vi.fn(() => mockLogger),
}));

import { PracticeTransitionManager } from '../practice-transition-manager';
import type {
  PracticeOpportunity,
  NaturalPracticeSuggestion,
  TransitionContext,
  VibeType
} from '../../../../shared/types/electron-api/chat-api';

describe('PracticeTransitionManager', () => {
  let transitionManager: PracticeTransitionManager;

  beforeEach(() => {
    transitionManager = new PracticeTransitionManager();
  });

  describe('Transition Strategy Selection', () => {
    const vibeTypes: VibeType[] = ['understanding', 'confused', 'breakthrough', 'practicing', 'misunderstanding'];

    it('should select gentle-nudge strategy for understanding vibe', () => {
      const context: TransitionContext = {
        conversationId: 'conv1',
        recentMessages: [
          { role: 'user', content: 'I understand useState now', timestamp: Date.now() }
        ],
        currentTopic: 'useState',
        userEngagement: 0.8,
        practiceHistory: []
      };

      const opportunity: PracticeOpportunity = {
        id: 'opp1',
        type: 'understanding',
        confidence: 0.9,
        timing: 'immediate',
        concept: 'useState',
        reasoning: 'User shows understanding',
        detectedFrom: ['language_patterns'],
        practiceReadiness: 0.85,
        suggestedTopics: ['useState'],
        estimatedTime: 15,
        difficulty: 'medium'
      };

      const suggestion: NaturalPracticeSuggestion = {
        id: 'sugg1',
        type: 'gentle-nudge',
        introduction: 'Great! Since you understand useState',
        challenge: 'try making your todo items toggle',
        context: 'This will help solidify understanding',
        estimatedTime: 15,
        difficulty: 'medium',
        vibe: 'understanding',
        timing: { when: 'when you\'re ready', urgency: 'low' },
        options: { accept: 'Yes!', decline: 'Later', postpone: 'In a bit' },
        metadata: { concept: 'useState', relatedTopics: [], prerequisites: [], nextSteps: [] }
      };

      const result = transitionManager.generateSmoothTransition(context, opportunity, suggestion);

      expect(result.strategy.id).toBe('gentle-nudge');
      expect(result.transitionMessage).toContain('Great!');
      expect(result.transitionMessage).toContain('useState');
    });

    it('should select collaborative-invite strategy for breakthrough vibe', () => {
      const context: TransitionContext = {
        conversationId: 'conv2',
        recentMessages: [
          { role: 'user', content: 'Oh! I finally get component lifecycle!', timestamp: Date.now() }
        ],
        currentTopic: 'component lifecycle',
        userEngagement: 1.0,
        practiceHistory: []
      };

      const opportunity: PracticeOpportunity = {
        id: 'opp2',
        type: 'breakthrough',
        confidence: 0.95,
        timing: 'immediate',
        concept: 'component lifecycle',
        reasoning: 'User has breakthrough',
        detectedFrom: ['aha_patterns'],
        practiceReadiness: 0.9,
        suggestedTopics: ['component lifecycle'],
        estimatedTime: 15,
        difficulty: 'medium'
      };

      const suggestion: NaturalPracticeSuggestion = {
        id: 'sugg2',
        type: 'collaborative-invite',
        introduction: 'Excellent breakthrough!',
        challenge: 'want to apply this in practice?',
        context: 'This will make the understanding stick',
        estimatedTime: 15,
        difficulty: 'medium',
        vibe: 'breakthrough',
        timing: { when: 'right now', urgency: 'medium' },
        options: { accept: 'Absolutely!', decline: 'Later', postpone: 'In a bit' },
        metadata: { concept: 'component lifecycle', relatedTopics: [], prerequisites: [], nextSteps: [] }
      };

      const result = transitionManager.generateSmoothTransition(context, opportunity, suggestion);

      expect(result.strategy.id).toBe('collaborative-invite');
      expect(result.transitionMessage).toContain('breakthrough');
    });

    it('should select direct-suggestion strategy for confused vibe', () => {
      const context: TransitionContext = {
        conversationId: 'conv3',
        recentMessages: [
          { role: 'user', content: 'I don\'t understand useEffect', timestamp: Date.now() }
        ],
        currentTopic: 'useEffect',
        userEngagement: 0.6,
        practiceHistory: []
      };

      const opportunity: PracticeOpportunity = {
        id: 'opp3',
        type: 'confused',
        confidence: 0.8,
        timing: 'immediate',
        concept: 'useEffect',
        reasoning: 'User is confused',
        detectedFrom: ['question_patterns'],
        practiceReadiness: 0.6,
        suggestedTopics: ['useEffect'],
        estimatedTime: 20,
        difficulty: 'easy'
      };

      const suggestion: NaturalPracticeSuggestion = {
        id: 'sugg3',
        type: 'direct-suggestion',
        introduction: 'Let\'s clarify useEffect',
        challenge: 'try this exercise to understand better',
        context: 'This will help clear up confusion',
        estimatedTime: 20,
        difficulty: 'easy',
        vibe: 'confused',
        timing: { when: 'when you\'re ready', urgency: 'low' },
        options: { accept: 'Yes, please', decline: 'Later', postpone: 'In a bit' },
        metadata: { concept: 'useEffect', relatedTopics: [], prerequisites: [], nextSteps: [] }
      };

      const result = transitionManager.generateSmoothTransition(context, opportunity, suggestion);

      expect(result.strategy.id).toBe('direct-suggestion');
      expect(result.transitionMessage).toContain('confusion');
    });

    it('should select challenge strategy for practicing vibe', () => {
      const context: TransitionContext = {
        conversationId: 'conv4',
        recentMessages: [
          { role: 'user', content: 'I\'m working on the useState exercise', timestamp: Date.now() }
        ],
        currentTopic: 'useState practice',
        userEngagement: 0.8,
        practiceHistory: []
      };

      const opportunity: PracticeOpportunity = {
        id: 'opp4',
        type: 'practicing',
        confidence: 0.85,
        timing: 'later',
        concept: 'useState',
        reasoning: 'User is practicing',
        detectedFrom: ['practice_patterns'],
        practiceReadiness: 0.3,
        suggestedTopics: ['useState'],
        estimatedTime: 15,
        difficulty: 'medium'
      };

      const suggestion: NaturalPracticeSuggestion = {
        id: 'sugg4',
        type: 'challenge',
        introduction: 'Great work practicing!',
        challenge: 'ready for a related challenge?',
        context: 'This extends your current practice',
        estimatedTime: 15,
        difficulty: 'medium',
        vibe: 'practicing',
        timing: { when: 'when you\'re ready', urgency: 'medium' },
        options: { accept: 'Sure!', decline: 'Let me finish', postpone: 'In a bit' },
        metadata: { concept: 'useState', relatedTopics: [], prerequisites: [], nextSteps: [] }
      };

      const result = transitionManager.generateSmoothTransition(context, opportunity, suggestion);

      expect(result.strategy.id).toBe('challenge');
      expect(result.transitionMessage).toContain('practicing');
    });

    it('should select context-bridge strategy when topic matches conversation', () => {
      const context: TransitionContext = {
        conversationId: 'conv5',
        recentMessages: [
          { role: 'user', content: 'We were discussing React hooks', timestamp: Date.now() }
        ],
        currentTopic: 'React hooks',
        userEngagement: 0.8,
        practiceHistory: []
      };

      const opportunity: PracticeOpportunity = {
        id: 'opp5',
        type: 'understanding',
        confidence: 0.8,
        timing: 'immediate',
        concept: 'useState',
        reasoning: 'Topic matches conversation',
        detectedFrom: ['topic_relevance'],
        practiceReadiness: 0.8,
        suggestedTopics: ['React hooks', 'useState'],
        estimatedTime: 15,
        difficulty: 'medium'
      };

      const suggestion: NaturalPracticeSuggestion = {
        id: 'sugg5',
        type: 'gentle-nudge',
        introduction: 'Great!',
        challenge: 'try this React hooks exercise',
        context: 'Related to our discussion',
        estimatedTime: 15,
        difficulty: 'medium',
        vibe: 'understanding',
        timing: { when: 'when you\'re ready', urgency: 'low' },
        options: { accept: 'Yes!', decline: 'Later', postpone: 'In a bit' },
        metadata: { concept: 'useState', relatedTopics: ['React hooks'], prerequisites: [], nextSteps: [] }
      };

      const result = transitionManager.generateSmoothTransition(context, opportunity, suggestion);

      expect(result.strategy.id).toBe('context-bridge');
      expect(result.transitionMessage).toContain('React hooks');
    });

    it('should select pause-point strategy at natural conversation pauses', () => {
      const context: TransitionContext = {
        conversationId: 'conv6',
        recentMessages: [
          { role: 'user', content: 'Hmm, let me think about that', timestamp: Date.now() }
        ],
        currentTopic: 'useState',
        userEngagement: 0.5,
        practiceHistory: []
      };

      const opportunity: PracticeOpportunity = {
        id: 'opp6',
        type: 'understanding',
        confidence: 0.7,
        timing: 'pause',
        concept: 'useState',
        reasoning: 'Natural pause detected',
        detectedFrom: ['pause_patterns'],
        practiceReadiness: 0.7,
        suggestedTopics: ['useState'],
        estimatedTime: 15,
        difficulty: 'medium'
      };

      const suggestion: NaturalPracticeSuggestion = {
        id: 'sugg6',
        type: 'gentle-nudge',
        introduction: 'Good thinking!',
        challenge: 'try this while it\'s fresh',
        context: 'Perfect timing for practice',
        estimatedTime: 15,
        difficulty: 'medium',
        vibe: 'understanding',
        timing: { when: 'when you\'re ready', urgency: 'low' },
        options: { accept: 'Okay!', decline: 'Later', postpone: 'In a bit' },
        metadata: { concept: 'useState', relatedTopics: [], prerequisites: [], nextSteps: [] }
      };

      const result = transitionManager.generateSmoothTransition(context, opportunity, suggestion);

      expect(result.strategy.id).toBe('pause-point');
    });
  });

  describe('Timing Determination', () => {
    it('should suggest immediate timing for high engagement and understanding', () => {
      const context: TransitionContext = {
        conversationId: 'conv1',
        recentMessages: [],
        currentTopic: 'useState',
        userEngagement: 0.9,
        practiceHistory: []
      };

      const opportunity: PracticeOpportunity = {
        id: 'opp1',
        type: 'understanding',
        confidence: 0.9,
        timing: 'immediate',
        concept: 'useState',
        reasoning: 'High engagement',
        detectedFrom: [],
        practiceReadiness: 0.9,
        suggestedTopics: ['useState'],
        estimatedTime: 15,
        difficulty: 'medium'
      };

      const timing = transitionManager.determineOptimalTiming(context, opportunity);

      expect(timing.when).toBe('immediate');
      expect(timing.urgency).toBe('high');
      expect(timing.delayMs).toBe(1000);
      expect(timing.reasoning).toContain('High engagement');
    });

    it('should suggest soon timing for moderate engagement', () => {
      const context: TransitionContext = {
        conversationId: 'conv2',
        recentMessages: [],
        currentTopic: 'useState',
        userEngagement: 0.7,
        practiceHistory: []
      };

      const opportunity: PracticeOpportunity = {
        id: 'opp2',
        type: 'understanding',
        confidence: 0.8,
        timing: 'soon',
        concept: 'useState',
        reasoning: 'Moderate engagement',
        detectedFrom: [],
        practiceReadiness: 0.8,
        suggestedTopics: ['useState'],
        estimatedTime: 15,
        difficulty: 'medium'
      };

      const timing = transitionManager.determineOptimalTiming(context, opportunity);

      expect(timing.when).toBe('soon');
      expect(timing.urgency).toBe('medium');
      expect(timing.delayMs).toBe(3000);
    });

    it('should suggest pause timing for low engagement or confusion', () => {
      const context: TransitionContext = {
        conversationId: 'conv3',
        recentMessages: [],
        currentTopic: 'useEffect',
        userEngagement: 0.2,
        practiceHistory: []
      };

      const opportunity: PracticeOpportunity = {
        id: 'opp3',
        type: 'confused',
        confidence: 0.7,
        timing: 'pause',
        concept: 'useEffect',
        reasoning: 'Low engagement',
        detectedFrom: [],
        practiceReadiness: 0.6,
        suggestedTopics: ['useEffect'],
        estimatedTime: 20,
        difficulty: 'easy'
      };

      const timing = transitionManager.determineOptimalTiming(context, opportunity);

      expect(timing.when).toBe('pause');
      expect(timing.urgency).toBe('low');
      expect(timing.delayMs).toBe(8000);
    });
  });

  describe('Transition Message Generation', () => {
    it('should generate varied transition messages for the same context', () => {
      const context: TransitionContext = {
        conversationId: 'conv1',
        recentMessages: [],
        currentTopic: 'useState',
        userEngagement: 0.8,
        practiceHistory: []
      };

      const opportunity: PracticeOpportunity = {
        id: 'opp1',
        type: 'understanding',
        confidence: 0.9,
        timing: 'immediate',
        concept: 'useState',
        reasoning: 'User understands',
        detectedFrom: [],
        practiceReadiness: 0.85,
        suggestedTopics: ['useState'],
        estimatedTime: 15,
        difficulty: 'medium'
      };

      const suggestion: NaturalPracticeSuggestion = {
        id: 'sugg1',
        type: 'gentle-nudge',
        introduction: 'Great!',
        challenge: 'try this exercise',
        context: 'This will help',
        estimatedTime: 15,
        difficulty: 'medium',
        vibe: 'understanding',
        timing: { when: 'when you\'re ready', urgency: 'low' },
        options: { accept: 'Yes!', decline: 'Later', postpone: 'In a bit' },
        metadata: { concept: 'useState', relatedTopics: [], prerequisites: [], nextSteps: [] }
      };

      // Generate multiple transitions to check for variety
      const transitions = Array.from({ length: 5 }, () =>
        transitionManager.generateSmoothTransition(context, opportunity, suggestion)
      );

      const messages = transitions.map(t => t.transitionMessage);
      const uniqueMessages = new Set(messages);

      // Should have some variety (not all identical)
      expect(uniqueMessages.size).toBeGreaterThan(1);
    });

    it('should handle all vibe types gracefully', () => {
      const vibeTypes: VibeType[] = ['understanding', 'confused', 'breakthrough', 'practicing', 'misunderstanding'];

      vibeTypes.forEach(vibe => {
        const context: TransitionContext = {
          conversationId: `conv_${vibe}`,
          recentMessages: [],
          currentTopic: 'test concept',
          userEngagement: 0.7,
          practiceHistory: []
        };

        const opportunity: PracticeOpportunity = {
          id: `opp_${vibe}`,
          type: vibe,
          confidence: 0.8,
          timing: 'immediate',
          concept: 'test concept',
          reasoning: `Test ${vibe} vibe`,
          detectedFrom: [],
          practiceReadiness: 0.7,
          suggestedTopics: ['test concept'],
          estimatedTime: 15,
          difficulty: 'medium'
        };

        const suggestion: NaturalPracticeSuggestion = {
          id: `sugg_${vibe}`,
          type: 'gentle-nudge',
          introduction: 'Test introduction',
          challenge: 'Test challenge',
          context: 'Test context',
          estimatedTime: 15,
          difficulty: 'medium',
          vibe,
          timing: { when: 'when you\'re ready', urgency: 'low' },
          options: { accept: 'Yes!', decline: 'Later', postpone: 'In a bit' },
          metadata: { concept: 'test concept', relatedTopics: [], prerequisites: [], nextSteps: [] }
        };

        const result = transitionManager.generateSmoothTransition(context, opportunity, suggestion);

        expect(result.strategy).toBeDefined();
        expect(result.transitionMessage).toBeDefined();
        expect(result.timing).toBeDefined();
        expect(result.transitionMessage.length).toBeGreaterThan(10);
        expect(result.transitionMessage.length).toBeLessThan(300);
      });
    });
  });

  describe('Custom Strategy Management', () => {
    it('should allow adding custom transition strategies', () => {
      const customStrategy = {
        id: 'custom-test',
        name: 'Custom Test Strategy',
        description: 'Test custom strategy',
        isApplicable: () => true,
        generateTransition: () => 'Custom transition message',
        getTimingWeight: () => 0.5
      };

      transitionManager.addTransitionStrategy(customStrategy);

      const strategies = transitionManager.getTransitionStrategies();
      const customStrategyFound = strategies.find(s => s.id === 'custom-test');

      expect(customStrategyFound).toBeDefined();
      expect(customStrategyFound?.name).toBe('Custom Test Strategy');
    });

    it('should allow removing transition strategies', () => {
      const initialStrategies = transitionManager.getTransitionStrategies();
      const initialCount = initialStrategies.length;

      const removed = transitionManager.removeTransitionStrategy('gentle-nudge');
      expect(removed).toBe(true);

      const newStrategies = transitionManager.getTransitionStrategies();
      expect(newStrategies.length).toBe(initialCount - 1);

      const gentleNudgeFound = newStrategies.find(s => s.id === 'gentle-nudge');
      expect(gentleNudgeFound).toBeUndefined();
    });

    it('should return false when trying to remove non-existent strategy', () => {
      const removed = transitionManager.removeTransitionStrategy('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('Transition Quality Validation', () => {
    it('should provide detailed quality assessment', () => {
      const goodTransition = 'Great! Since you understand useState, try making your todo items toggle between complete and incomplete. This will help solidify your understanding.';
      const badTransition = 'Try this exercise';
      const tooLongTransition = 'This is an extremely long transition message that goes on and on and on and should be flagged as too long for a natural conversation transition because good transitions should be concise and to the point while still providing enough context for the user to understand what is being suggested and why it makes sense in the current conversation context.';
      const templateTransition = 'Great! Since you understand {concept}, try this {exercise}';

      const context: TransitionContext = {
        conversationId: 'conv1',
        recentMessages: [],
        currentTopic: 'useState',
        userEngagement: 0.8,
        practiceHistory: []
      };

      const opportunity: PracticeOpportunity = {
        id: 'opp1',
        type: 'understanding',
        confidence: 0.9,
        timing: 'immediate',
        concept: 'useState',
        reasoning: 'User understands',
        detectedFrom: [],
        practiceReadiness: 0.85,
        suggestedTopics: ['useState'],
        estimatedTime: 15,
        difficulty: 'medium'
      };

      // Good transition should have high score
      const goodValidation = transitionManager.validateTransitionQuality(goodTransition, context, opportunity);
      expect(goodValidation.score).toBeGreaterThan(80);
      expect(goodValidation.issues).toHaveLength(0);

      // Bad transition should have low score
      const badValidation = transitionManager.validateTransitionQuality(badTransition, context, opportunity);
      expect(badValidation.score).toBeLessThan(70);
      expect(badValidation.issues.length).toBeGreaterThan(0);

      // Too long transition should be flagged
      const longValidation = transitionManager.validateTransitionQuality(tooLongTransition, context, opportunity);
      expect(longValidation.issues).toContain('Too long');

      // Template transition should be flagged
      const templateValidation = transitionManager.validateTransitionQuality(templateTransition, context, opportunity);
      expect(templateValidation.issues).toContain('Contains template placeholders');
    });
  });
});