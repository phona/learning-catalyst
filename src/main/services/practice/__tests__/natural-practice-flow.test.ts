/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable no-undef */

/**
 * Natural Practice Flow Tests
 *
 * Comprehensive tests for the natural practice flow system across different vibe types.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NaturalPracticeFlow, DEFAULT_NATURAL_PRACTICE_FLOW_CONFIG } from '../natural-practice-flow';
import { PracticeTransitionManager } from '../practice-transition-manager';
import type {
  PracticeOpportunity,
  PracticeOpportunityResult,
  NaturalPracticeSuggestion,
  UserLearningContext,
  VibeType
} from '../../../../shared/types/electron-api/chat-api';

// Mock dependencies
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

const mockPracticeAgent = {
  execute: vi.fn()
};

const mockUserContextTracker = {
  getUserContext: vi.fn(),
  handlePracticeSuggestion: vi.fn(),
  handlePracticeResponse: vi.fn()
};

const mockConversationAnalyzer = {
  analyzeConversation: vi.fn()
};

const mockAls = {
  getStore: () => ({}),
  run: () => {}
};

describe('NaturalPracticeFlow', () => {
  let naturalPracticeFlow: NaturalPracticeFlow;
  let transitionManager: PracticeTransitionManager;

  beforeEach(() => {
    vi.clearAllMocks();

    const dependencies = {
      als: mockAls,
      logger: mockLogger,
      practiceAgent: mockPracticeAgent,
      userContextTracker: mockUserContextTracker,
      conversationAnalyzer: mockConversationAnalyzer
    };

    naturalPracticeFlow = new NaturalPracticeFlow(dependencies);
    transitionManager = new PracticeTransitionManager(mockLogger);
  });

  afterEach(() => {
    naturalPracticeFlow.dispose();
  });

  describe('Vibe Type Handling', () => {
    const vibeTypes: VibeType[] = ['understanding', 'confused', 'breakthrough', 'practicing', 'misunderstanding'];

    describe('Understanding Vibe', () => {
      it('should handle understanding vibe with gentle nudge transition', async () => {
        // Setup mock responses
        mockConversationAnalyzer.analyzeConversation.mockResolvedValue({
          shouldSuggestPractice: true,
          vibeDetection: {
            vibe: 'understanding',
            confidence: 0.9,
            reasoning: 'User shows clear understanding',
            practiceReadiness: 0.85,
            suggestedTopics: ['React hooks'],
            detectedFrom: ['language_patterns'],
            timestamp: Date.now()
          },
          keyConcepts: ['useState', 'React hooks']
        });

        mockUserContextTracker.getUserContext.mockResolvedValue({
          id: 'user1',
          sessionId: 'session1',
          confidenceLevel: 0.8,
          learningVelocity: 1.2,
          engagementLevel: 0.9,
          stuckPoints: [],
          recentConcepts: [{ concept: 'useState', mastery: 0.7 }],
          practiceHistory: [],
          lastPracticeTime: Date.now() - 3600000, // 1 hour ago
          preferences: { difficultyPreference: 'medium', feedbackStyle: 'encouraging' },
          statistics: {}
        });

        const result = await naturalPracticeFlow.checkPracticeOpportunity(
          'conv1',
          'I think I understand how useState works now'
        );

        expect(result.hasOpportunity).toBe(true);
        expect(result.shouldSuggest).toBe(true);
        expect(result.confidence).toBeGreaterThan(0.8);
        expect(result.reasoning).toContain('understanding');
      });

      it('should generate appropriate transition for understanding vibe', () => {
        const context = {
          conversationId: 'conv1',
          recentMessages: [
            { role: 'user', content: 'I get how useState works now', timestamp: Date.now() }
          ],
          currentTopic: 'React hooks',
          userEngagement: 0.9,
          practiceHistory: []
        };

        const opportunity: PracticeOpportunity = {
          id: 'opp1',
          type: 'understanding',
          confidence: 0.9,
          timing: 'immediate',
          concept: 'useState',
          reasoning: 'User demonstrates understanding',
          detectedFrom: ['language_patterns'],
          practiceReadiness: 0.85,
          suggestedTopics: ['useState'],
          estimatedTime: 15,
          difficulty: 'medium'
        };

        const suggestion: NaturalPracticeSuggestion = {
          id: 'sugg1',
          type: 'gentle-nudge',
          introduction: 'Great! Since you\'ve got the hang of useState',
          challenge: 'try making your todo item toggle between complete and incomplete',
          context: 'This will help solidify your understanding',
          estimatedTime: 15,
          difficulty: 'medium',
          vibe: 'understanding',
          timing: { when: 'when you\'re ready', urgency: 'low' },
          options: { accept: 'Yes, let\'s practice!', decline: 'Maybe later', postpone: 'In a few minutes' },
          metadata: { concept: 'useState', relatedTopics: ['React hooks'], prerequisites: [], nextSteps: [] }
        };

        const result = transitionManager.generateSmoothTransition(context, opportunity, suggestion);

        expect(result.transitionMessage).toContain('Great!');
        expect(result.transitionMessage).toContain('useState');
        expect(result.strategy.id).toBe('gentle-nudge');
        expect(result.timing.when).toBe('immediate');
        expect(result.timing.urgency).toBe('high');
      });
    });

    describe('Confused Vibe', () => {
      it('should handle confused vibe with direct suggestion approach', async () => {
        mockConversationAnalyzer.analyzeConversation.mockResolvedValue({
          shouldSuggestPractice: true,
          vibeDetection: {
            vibe: 'confused',
            confidence: 0.8,
            reasoning: 'User expresses confusion about useEffect',
            practiceReadiness: 0.6,
            suggestedTopics: ['useEffect'],
            detectedFrom: ['question_patterns'],
            timestamp: Date.now()
          },
          keyConcepts: ['useEffect', 'React hooks']
        });

        mockUserContextTracker.getUserContext.mockResolvedValue({
          id: 'user1',
          sessionId: 'session1',
          confidenceLevel: 0.4,
          learningVelocity: 0.8,
          engagementLevel: 0.6,
          stuckPoints: ['useEffect dependencies'],
          recentConcepts: [{ concept: 'useEffect', mastery: 0.3 }],
          practiceHistory: [],
          lastPracticeTime: Date.now() - 7200000, // 2 hours ago
          preferences: { difficultyPreference: 'easy', feedbackStyle: 'encouraging' },
          statistics: {}
        });

        const result = await naturalPracticeFlow.checkPracticeOpportunity(
          'conv2',
          'I don\'t understand how useEffect dependencies work'
        );

        expect(result.hasOpportunity).toBe(true);
        // Should suggest practice if user has some confidence and it might clarify understanding
        expect(result.shouldSuggest).toBe(true);
      });

      it('should generate appropriate transition for confused vibe', () => {
        const context = {
          conversationId: 'conv2',
          recentMessages: [
            { role: 'user', content: 'I\'m confused about useEffect dependencies', timestamp: Date.now() }
          ],
          currentTopic: 'useEffect',
          userEngagement: 0.6,
          practiceHistory: []
        };

        const opportunity: PracticeOpportunity = {
          id: 'opp2',
          type: 'confused',
          confidence: 0.8,
          timing: 'immediate',
          concept: 'useEffect',
          reasoning: 'User expresses confusion',
          detectedFrom: ['question_patterns'],
          practiceReadiness: 0.6,
          suggestedTopics: ['useEffect'],
          estimatedTime: 20,
          difficulty: 'easy'
        };

        const suggestion: NaturalPracticeSuggestion = {
          id: 'sugg2',
          type: 'direct-suggestion',
          introduction: 'Let\'s clarify useEffect with some practice',
          challenge: 'try creating a component that uses useEffect with different dependencies',
          context: 'This will help clear up the confusion',
          estimatedTime: 20,
          difficulty: 'easy',
          vibe: 'confused',
          timing: { when: 'when you\'re ready', urgency: 'low' },
          options: { accept: 'Yes, that would help', decline: 'Maybe later', postpone: 'In a few minutes' },
          metadata: { concept: 'useEffect', relatedTopics: ['React hooks'], prerequisites: [], nextSteps: [] }
        };

        const result = transitionManager.generateSmoothTransition(context, opportunity, suggestion);

        expect(result.transitionMessage).toContain('confusion');
        expect(result.transitionMessage).toContain('useEffect');
        expect(result.strategy.id).toBe('direct-suggestion');
        expect(result.timing.when).toBe('pause');
        expect(result.timing.urgency).toBe('low');
      });
    });

    describe('Breakthrough Vibe', () => {
      it('should handle breakthrough vibe with collaborative invite', async () => {
        mockConversationAnalyzer.analyzeConversation.mockResolvedValue({
          shouldSuggestPractice: true,
          vibeDetection: {
            vibe: 'breakthrough',
            confidence: 0.95,
            reasoning: 'User has sudden insight about component lifecycle',
            practiceReadiness: 0.9,
            suggestedTopics: ['component lifecycle'],
            detectedFrom: ['aha_patterns'],
            timestamp: Date.now()
          },
          keyConcepts: ['component lifecycle', 'React']
        });

        mockUserContextTracker.getUserContext.mockResolvedValue({
          id: 'user1',
          sessionId: 'session1',
          confidenceLevel: 0.9,
          learningVelocity: 1.5,
          engagementLevel: 1.0,
          stuckPoints: [],
          recentConcepts: [{ concept: 'component lifecycle', mastery: 0.8 }],
          practiceHistory: [],
          lastPracticeTime: Date.now() - 1800000, // 30 minutes ago
          preferences: { difficultyPreference: 'medium', feedbackStyle: 'encouraging' },
          statistics: {}
        });

        const result = await naturalPracticeFlow.checkPracticeOpportunity(
          'conv3',
          'Oh! I think I finally get how React component lifecycle works!'
        );

        expect(result.hasOpportunity).toBe(true);
        expect(result.shouldSuggest).toBe(true);
        expect(result.confidence).toBeGreaterThan(0.9);
      });

      it('should generate appropriate transition for breakthrough vibe', () => {
        const context = {
          conversationId: 'conv3',
          recentMessages: [
            { role: 'user', content: 'Oh! I finally understand component lifecycle!', timestamp: Date.now() }
          ],
          currentTopic: 'component lifecycle',
          userEngagement: 1.0,
          practiceHistory: []
        };

        const opportunity: PracticeOpportunity = {
          id: 'opp3',
          type: 'breakthrough',
          confidence: 0.95,
          timing: 'immediate',
          concept: 'component lifecycle',
          reasoning: 'User has breakthrough moment',
          detectedFrom: ['aha_patterns'],
          practiceReadiness: 0.9,
          suggestedTopics: ['component lifecycle'],
          estimatedTime: 15,
          difficulty: 'medium'
        };

        const suggestion: NaturalPracticeSuggestion = {
          id: 'sugg3',
          type: 'collaborative-invite',
          introduction: 'Excellent breakthrough! Let\'s solidify that understanding',
          challenge: 'want to try applying component lifecycle knowledge in a real example?',
          context: 'This will make your breakthrough stick',
          estimatedTime: 15,
          difficulty: 'medium',
          vibe: 'breakthrough',
          timing: { when: 'right now', urgency: 'medium' },
          options: { accept: 'Absolutely! Let\'s practice', decline: 'Maybe later', postpone: 'In a few minutes' },
          metadata: { concept: 'component lifecycle', relatedTopics: ['React'], prerequisites: [], nextSteps: [] }
        };

        const result = transitionManager.generateSmoothTransition(context, opportunity, suggestion);

        expect(result.transitionMessage).toContain('Excellent');
        expect(result.transitionMessage).toContain('breakthrough');
        expect(result.strategy.id).toBe('collaborative-invite');
        expect(result.timing.when).toBe('immediate');
        expect(result.timing.urgency).toBe('high');
      });
    });

    describe('Practicing Vibe', () => {
      it('should handle practicing vibe appropriately', async () => {
        mockConversationAnalyzer.analyzeConversation.mockResolvedValue({
          shouldSuggestPractice: false, // Already practicing
          vibeDetection: {
            vibe: 'practicing',
            confidence: 0.85,
            reasoning: 'User is actively practicing with current concept',
            practiceReadiness: 0.3, // Lower readiness since already practicing
            suggestedTopics: ['current practice topic'],
            detectedFrom: ['practice_patterns'],
            timestamp: Date.now()
          },
          keyConcepts: ['current practice']
        });

        mockUserContextTracker.getUserContext.mockResolvedValue({
          id: 'user1',
          sessionId: 'session1',
          confidenceLevel: 0.7,
          learningVelocity: 1.0,
          engagementLevel: 0.8,
          stuckPoints: [],
          recentConcepts: [{ concept: 'current practice', mastery: 0.6 }],
          practiceHistory: [],
          lastPracticeTime: Date.now() - 300000, // 5 minutes ago (recent)
          preferences: { difficultyPreference: 'medium', feedbackStyle: 'encouraging' },
          statistics: {}
        });

        const result = await naturalPracticeFlow.checkPracticeOpportunity(
          'conv4',
          'Let me try implementing this useState example'
        );

        expect(result.hasOpportunity).toBe(true);
        expect(result.shouldSuggest).toBe(false); // Shouldn't suggest when already practicing
      });

      it('should generate appropriate transition for practicing vibe', () => {
        const context = {
          conversationId: 'conv4',
          recentMessages: [
            { role: 'user', content: 'I\'m working on the useState practice exercise', timestamp: Date.now() }
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
          reasoning: 'User is already practicing',
          detectedFrom: ['practice_patterns'],
          practiceReadiness: 0.3,
          suggestedTopics: ['useState'],
          estimatedTime: 15,
          difficulty: 'medium'
        };

        const suggestion: NaturalPracticeSuggestion = {
          id: 'sugg4',
          type: 'challenge',
          introduction: 'Great work practicing useState!',
          challenge: 'ready for a related challenge that builds on this?',
          context: 'This will extend your current practice',
          estimatedTime: 15,
          difficulty: 'medium',
          vibe: 'practicing',
          timing: { when: 'when you\'re ready', urgency: 'medium' },
          options: { accept: 'Sure, let\'s continue', decline: 'Let me finish this first', postpone: 'In a bit' },
          metadata: { concept: 'useState', relatedTopics: ['React hooks'], prerequisites: [], nextSteps: [] }
        };

        const result = transitionManager.generateSmoothTransition(context, opportunity, suggestion);

        expect(result.transitionMessage).toContain('Great work');
        expect(result.transitionMessage).toContain('practicing');
        expect(result.strategy.id).toBe('challenge');
      });
    });

    describe('Misunderstanding Vibe', () => {
      it('should handle misunderstanding vibe appropriately', async () => {
        mockConversationAnalyzer.analyzeConversation.mockResolvedValue({
          shouldSuggestPractice: false, // Don't practice with misunderstanding
          vibeDetection: {
            vibe: 'misunderstanding',
            confidence: 0.8,
            reasoning: 'User demonstrates incorrect understanding',
            practiceReadiness: 0.2,
            suggestedTopics: ['misunderstood concept'],
            detectedFrom: ['incorrect_patterns'],
            timestamp: Date.now()
          },
          keyConcepts: ['misunderstood concept']
        });

        mockUserContextTracker.getUserContext.mockResolvedValue({
          id: 'user1',
          sessionId: 'session1',
          confidenceLevel: 0.3,
          learningVelocity: 0.5,
          engagementLevel: 0.4,
          stuckPoints: ['fundamental misconception'],
          recentConcepts: [{ concept: 'misunderstood concept', mastery: 0.2 }],
          practiceHistory: [],
          lastPracticeTime: Date.now() - 3600000,
          preferences: { difficultyPreference: 'easy', feedbackStyle: 'encouraging' },
          statistics: {}
        });

        const result = await naturalPracticeFlow.checkPracticeOpportunity(
          'conv5',
          'I think useState is for managing CSS styles in React'
        );

        expect(result.hasOpportunity).toBe(true);
        expect(result.shouldSuggest).toBe(false); // Don't suggest practice with fundamental misunderstanding
      });
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle practice opportunity detection within performance targets', async () => {
      const startTime = Date.now();

      mockConversationAnalyzer.analyzeConversation.mockResolvedValue({
        shouldSuggestPractice: true,
        vibeDetection: {
          vibe: 'understanding',
          confidence: 0.8,
          reasoning: 'User shows understanding',
          practiceReadiness: 0.8,
          suggestedTopics: ['React'],
          detectedFrom: ['patterns'],
          timestamp: Date.now()
        },
        keyConcepts: ['React']
      });

      mockUserContextTracker.getUserContext.mockResolvedValue({
        id: 'user1',
        confidenceLevel: 0.8,
        learningVelocity: 1.0,
        engagementLevel: 0.8,
        stuckPoints: [],
        recentConcepts: [],
        practiceHistory: [],
        lastPracticeTime: Date.now() - 3600000,
        preferences: { difficultyPreference: 'medium', feedbackStyle: 'encouraging' },
        statistics: {}
      });

      await naturalPracticeFlow.checkPracticeOpportunity('conv1', 'I understand React now');

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
    });

    it('should handle concurrent practice opportunity checks', async () => {
      const conversations = Array.from({ length: 10 }, (_, i) => `conv${i}`);

      mockConversationAnalyzer.analyzeConversation.mockResolvedValue({
        shouldSuggestPractice: false,
        vibeDetection: null,
        keyConcepts: []
      });

      mockUserContextTracker.getUserContext.mockResolvedValue({
        id: 'user1',
        confidenceLevel: 0.5,
        learningVelocity: 1.0,
        engagementLevel: 0.5,
        stuckPoints: [],
        recentConcepts: [],
        practiceHistory: [],
        lastPracticeTime: Date.now() - 3600000,
        preferences: { difficultyPreference: 'medium', feedbackStyle: 'encouraging' },
        statistics: {}
      });

      const startTime = Date.now();

      const promises = conversations.map(convId =>
        naturalPracticeFlow.checkPracticeOpportunity(convId, 'Test message')
      );

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle concurrent requests efficiently
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty conversation history gracefully', async () => {
      mockConversationAnalyzer.analyzeConversation.mockResolvedValue({
        shouldSuggestPractice: false,
        vibeDetection: null,
        keyConcepts: []
      });

      mockUserContextTracker.getUserContext.mockResolvedValue({
        id: 'user1',
        confidenceLevel: 0.5,
        learningVelocity: 1.0,
        engagementLevel: 0.5,
        stuckPoints: [],
        recentConcepts: [],
        practiceHistory: [],
        lastPracticeTime: 0,
        preferences: { difficultyPreference: 'medium', feedbackStyle: 'encouraging' },
        statistics: {}
      });

      const result = await naturalPracticeFlow.checkPracticeOpportunity('conv1', 'Hello');

      expect(result.hasOpportunity).toBe(false);
      expect(result.shouldSuggest).toBe(false);
      expect(result.reasoning).toContain('Not enough messages');
    });

    it('should handle AI service failures with fallback', async () => {
      mockConversationAnalyzer.analyzeConversation.mockRejectedValue(new Error('AI service unavailable'));
      mockUserContextTracker.getUserContext.mockResolvedValue({
        id: 'user1',
        confidenceLevel: 0.5,
        learningVelocity: 1.0,
        engagementLevel: 0.5,
        stuckPoints: [],
        recentConcepts: [],
        practiceHistory: [],
        lastPracticeTime: 0,
        preferences: { difficultyPreference: 'medium', feedbackStyle: 'encouraging' },
        statistics: {}
      });

      const result = await naturalPracticeFlow.checkPracticeOpportunity('conv1', 'I understand React hooks');

      // Should not crash and should provide fallback analysis
      expect(result).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Using fallback opportunity analysis',
        expect.any(Object)
      );
    });
  });

  describe('Transition Quality Validation', () => {
    it('should validate transition message quality', () => {
      const context = {
        conversationId: 'conv1',
        recentMessages: [],
        currentTopic: 'React hooks',
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
        detectedFrom: ['patterns'],
        practiceReadiness: 0.85,
        suggestedTopics: ['useState'],
        estimatedTime: 15,
        difficulty: 'medium'
      };

      // Good transition message
      const goodTransition = transitionManager.generateSmoothTransition(context, opportunity, {
        id: 'sugg1',
        type: 'gentle-nudge',
        introduction: 'Great! Since you understand useState',
        challenge: 'try making your todo items toggle',
        context: 'This helps solidify understanding',
        estimatedTime: 15,
        difficulty: 'medium',
        vibe: 'understanding',
        timing: { when: 'when you\'re ready', urgency: 'low' },
        options: { accept: 'Yes!', decline: 'Later', postpone: 'In a bit' },
        metadata: { concept: 'useState', relatedTopics: [], prerequisites: [], nextSteps: [] }
      });

      const validation = transitionManager.validateTransitionQuality(
        goodTransition.transitionMessage,
        context,
        opportunity
      );

      expect(validation.score).toBeGreaterThan(80);
      expect(validation.issues).toHaveLength(0);

      // Bad transition message
      const badValidation = transitionManager.validateTransitionQuality(
        'Try this exercise',
        context,
        opportunity
      );

      expect(badValidation.score).toBeLessThan(70);
      expect(badValidation.issues.length).toBeGreaterThan(0);
      expect(badValidation.suggestions.length).toBeGreaterThan(0);
    });
  });
});