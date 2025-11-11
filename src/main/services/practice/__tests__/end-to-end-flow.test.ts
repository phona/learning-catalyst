/**
 * End-to-End Flow Tests
 *
 * Comprehensive tests for the complete conversation flow from natural
 * learning conversation through practice suggestion to completion.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NaturalPracticeFlow } from '../natural-practice-flow';
import { PracticeTransitionManager } from '../practice-transition-manager';
import type {
  PracticeOpportunity,
  PracticeOpportunityResult,
  NaturalPracticeSuggestion,
  UserLearningContext,
  VibeType
} from '../../../../shared/types/electron-api/chat-api';

// Mock all dependencies
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

describe('End-to-End Conversation Flow', () => {
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

  describe('Complete Learning to Practice Flow', () => {
    it('should handle understanding vibe to practice suggestion to completion', async () => {
      const conversationId = 'conv_understanding';

      // Setup user context
      const userContext: UserLearningContext = {
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
      };

      mockUserContextTracker.getUserContext.mockResolvedValue(userContext);

      // Step 1: User shows understanding
      mockConversationAnalyzer.analyzeConversation.mockResolvedValue({
        shouldSuggestPractice: true,
        vibeDetection: {
          vibe: 'understanding',
          confidence: 0.9,
          reasoning: 'User demonstrates clear understanding of useState',
          practiceReadiness: 0.85,
          suggestedTopics: ['useState', 'React hooks'],
          detectedFrom: ['language_patterns'],
          timestamp: Date.now()
        },
        keyConcepts: ['useState', 'state management']
      });

      // Check for practice opportunity
      const opportunityResult = await naturalPracticeFlow.checkPracticeOpportunity(
        conversationId,
        'I think I understand how useState works now'
      );

      expect(opportunityResult.hasOpportunity).toBe(true);
      expect(opportunityResult.shouldSuggest).toBe(true);
      expect(opportunityResult.confidence).toBeGreaterThan(0.8);

      // Step 2: Generate practice suggestion
      const opportunity: PracticeOpportunity = opportunityResult.opportunity!;

      mockPracticeAgent.execute.mockImplementation(function* () {
        yield {
          type: 'data',
          content: {
            suggestion: {
              id: 'sugg1',
              type: 'gentle-nudge',
              introduction: 'Great! Since you understand useState',
              challenge: 'try making your todo items toggle between complete and incomplete',
              context: 'This will help solidify your understanding',
              estimatedTime: 15,
              difficulty: 'medium',
              vibe: 'understanding',
              timing: { when: 'when you\'re ready', urgency: 'low' },
              options: {
                accept: "Yes, let's practice!",
                decline: "Maybe later",
                postpone: "In a few minutes?"
              },
              metadata: {
                concept: 'useState',
                relatedTopics: ['React hooks'],
                prerequisites: ['basic React'],
                nextSteps: ['Implement', 'Test', 'Refine']
              }
            }
          },
          timestamp: Date.now()
        };
      });

      const suggestion = await naturalPracticeFlow.generatePracticeSuggestion(opportunity, userContext);

      expect(suggestion.id).toBeDefined();
      expect(suggestion.type).toBe('gentle-nudge');
      expect(suggestion.challenge).toContain('todo items');
      expect(suggestion.vibe).toBe('understanding');

      // Step 3: Handle user acceptance
      await naturalPracticeFlow.handlePracticeResponse(conversationId, 'accept', suggestion.id);

      expect(mockUserContextTracker.handlePracticeResponse).toHaveBeenCalledWith(
        userContext.id,
        suggestion.id,
        'accept'
      );

      // Verify flow is complete and smooth
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Practice opportunity analysis complete'),
        expect.objectContaining({
          conversationId,
          hasOpportunity: true,
          shouldSuggest: true
        })
      );
    });

    it('should handle confused vibe to practice suggestion to clarity', async () => {
      const conversationId = 'conv_confused';

      const userContext: UserLearningContext = {
        id: 'user2',
        sessionId: 'session2',
        confidenceLevel: 0.4,
        learningVelocity: 0.8,
        engagementLevel: 0.6,
        stuckPoints: ['useEffect dependencies'],
        recentConcepts: [{ concept: 'useEffect', mastery: 0.3 }],
        practiceHistory: [],
        lastPracticeTime: Date.now() - 7200000, // 2 hours ago
        preferences: { difficultyPreference: 'easy', feedbackStyle: 'encouraging' },
        statistics: {}
      };

      mockUserContextTracker.getUserContext.mockResolvedValue(userContext);

      // User expresses confusion
      mockConversationAnalyzer.analyzeConversation.mockResolvedValue({
        shouldSuggestPractice: true,
        vibeDetection: {
          vibe: 'confused',
          confidence: 0.8,
          reasoning: 'User expresses confusion about useEffect dependencies',
          practiceReadiness: 0.6,
          suggestedTopics: ['useEffect', 'dependencies'],
          detectedFrom: ['question_patterns'],
          timestamp: Date.now()
        },
        keyConcepts: ['useEffect', 'dependencies']
      });

      const opportunityResult = await naturalPracticeFlow.checkPracticeOpportunity(
        conversationId,
        'I don\'t understand how useEffect dependencies work'
      );

      expect(opportunityResult.hasOpportunity).toBe(true);
      expect(opportunityResult.opportunity?.type).toBe('confused');

      // Generate direct suggestion for confusion
      const opportunity: PracticeOpportunity = opportunityResult.opportunity!;

      mockPracticeAgent.execute.mockImplementation(function* () {
        yield {
          type: 'data',
          content: {
            suggestion: {
              id: 'sugg2',
              type: 'direct-suggestion',
              introduction: 'Let\'s clarify useEffect with practice',
              challenge: 'try creating a component that uses useEffect with different dependencies',
              context: 'This hands-on exercise will clear up the confusion',
              estimatedTime: 20,
              difficulty: 'easy',
              vibe: 'confused',
              timing: { when: 'when you\'re ready', urgency: 'low' },
              options: {
                accept: "Yes, that would help clarify things",
                decline: "Maybe later",
                postpone: "In a few minutes?"
              },
              metadata: {
                concept: 'useEffect',
                relatedTopics: ['React hooks'],
                prerequisites: ['basic React'],
                nextSteps: ['Practice', 'Understand', 'Apply']
              }
            }
          },
          timestamp: Date.now()
        };
      });

      const suggestion = await naturalPracticeFlow.generatePracticeSuggestion(opportunity, userContext);

      expect(suggestion.type).toBe('direct-suggestion');
      expect(suggestion.introduction).toContain('clarify');
      expect(suggestion.context).toContain('hands-on');
    });

    it('should handle breakthrough vibe to celebratory practice', async () => {
      const conversationId = 'conv_breakthrough';

      const userContext: UserLearningContext = {
        id: 'user3',
        sessionId: 'session3',
        confidenceLevel: 0.9,
        learningVelocity: 1.5,
        engagementLevel: 1.0,
        stuckPoints: [],
        recentConcepts: [{ concept: 'component lifecycle', mastery: 0.8 }],
        practiceHistory: [],
        lastPracticeTime: Date.now() - 1800000, // 30 minutes ago
        preferences: { difficultyPreference: 'medium', feedbackStyle: 'encouraging' },
        statistics: {}
      };

      mockUserContextTracker.getUserContext.mockResolvedValue(userContext);

      // User has breakthrough
      mockConversationAnalyzer.analyzeConversation.mockResolvedValue({
        shouldSuggestPractice: true,
        vibeDetection: {
          vibe: 'breakthrough',
          confidence: 0.95,
          reasoning: 'User has sudden insight about component lifecycle',
          practiceReadiness: 0.9,
          suggestedTopics: ['component lifecycle', 'React'],
          detectedFrom: ['aha_patterns'],
          timestamp: Date.now()
        },
        keyConcepts: ['component lifecycle', 'mounting', 'unmounting']
      });

      const opportunityResult = await naturalPracticeFlow.checkPracticeOpportunity(
        conversationId,
        'Oh! I finally understand how React component lifecycle works!'
      );

      expect(opportunityResult.hasOpportunity).toBe(true);
      expect(opportunityResult.opportunity?.type).toBe('breakthrough');
      expect(opportunityResult.confidence).toBeGreaterThan(0.9);

      // Generate celebratory practice suggestion
      const opportunity: PracticeOpportunity = opportunityResult.opportunity!;

      mockPracticeAgent.execute.mockImplementation(function* () {
        yield {
          type: 'data',
          content: {
            suggestion: {
              id: 'sugg3',
              type: 'collaborative-invite',
              introduction: 'Excellent breakthrough! Let\'s solidify that understanding',
              challenge: 'want to try applying component lifecycle knowledge in a real example?',
              context: 'This will make your breakthrough stick',
              estimatedTime: 15,
              difficulty: 'medium',
              vibe: 'breakthrough',
              timing: { when: 'right now', urgency: 'medium' },
              options: {
                accept: "Absolutely! Let's practice",
                decline: "Maybe in a bit",
                postpone: "Let me think about this first"
              },
              metadata: {
                concept: 'component lifecycle',
                relatedTopics: ['React'],
                prerequisites: ['basic React components'],
                nextSteps: ['Apply', 'Extend', 'Master']
              }
            }
          },
          timestamp: Date.now()
        };
      });

      const suggestion = await naturalPracticeFlow.generatePracticeSuggestion(opportunity, userContext);

      expect(suggestion.type).toBe('collaborative-invite');
      expect(suggestion.introduction).toContain('breakthrough');
      expect(suggestion.timing.urgency).toBe('medium');
    });

    it('should handle practicing vibe appropriately (no new suggestion)', async () => {
      const conversationId = 'conv_practicing';

      const userContext: UserLearningContext = {
        id: 'user4',
        sessionId: 'session4',
        confidenceLevel: 0.7,
        learningVelocity: 1.0,
        engagementLevel: 0.8,
        stuckPoints: [],
        recentConcepts: [{ concept: 'useState', mastery: 0.6 }],
        practiceHistory: [],
        lastPracticeTime: Date.now() - 300000, // 5 minutes ago (very recent)
        preferences: { difficultyPreference: 'medium', feedbackStyle: 'encouraging' },
        statistics: {}
      };

      mockUserContextTracker.getUserContext.mockResolvedValue(userContext);

      // User is already practicing
      mockConversationAnalyzer.analyzeConversation.mockResolvedValue({
        shouldSuggestPractice: false, // Already practicing
        vibeDetection: {
          vibe: 'practicing',
          confidence: 0.85,
          reasoning: 'User is actively practicing useState',
          practiceReadiness: 0.3, // Lower readiness since already practicing
          suggestedTopics: ['useState'],
          detectedFrom: ['practice_patterns'],
          timestamp: Date.now()
        },
        keyConcepts: ['useState']
      });

      const opportunityResult = await naturalPracticeFlow.checkPracticeOpportunity(
        conversationId,
        'Let me try implementing this useState example'
      );

      expect(opportunityResult.hasOpportunity).toBe(true);
      expect(opportunityResult.shouldSuggest).toBe(false); // Should not suggest when already practicing
      expect(opportunityResult.reasoning).toContain('Not optimal timing');
    });

    it('should handle misunderstanding vibe appropriately (no practice suggestion)', async () => {
      const conversationId = 'conv_misunderstanding';

      const userContext: UserLearningContext = {
        id: 'user5',
        sessionId: 'session5',
        confidenceLevel: 0.3,
        learningVelocity: 0.5,
        engagementLevel: 0.4,
        stuckPoints: ['fundamental misconception'],
        recentConcepts: [{ concept: 'useState', mastery: 0.2 }],
        practiceHistory: [],
        lastPracticeTime: Date.now() - 3600000,
        preferences: { difficultyPreference: 'easy', feedbackStyle: 'encouraging' },
        statistics: {}
      };

      mockUserContextTracker.getUserContext.mockResolvedValue(userContext);

      // User has fundamental misunderstanding
      mockConversationAnalyzer.analyzeConversation.mockResolvedValue({
        shouldSuggestPractice: false, // Don't practice with misunderstanding
        vibeDetection: {
          vibe: 'misunderstanding',
          confidence: 0.8,
          reasoning: 'User demonstrates incorrect understanding of useState',
          practiceReadiness: 0.2,
          suggestedTopics: ['useState'],
          detectedFrom: ['incorrect_patterns'],
          timestamp: Date.now()
        },
        keyConcepts: ['useState']
      });

      const opportunityResult = await naturalPracticeFlow.checkPracticeOpportunity(
        conversationId,
        'I think useState is for managing CSS styles in React'
      );

      expect(opportunityResult.hasOpportunity).toBe(true);
      expect(opportunityResult.shouldSuggest).toBe(false); // Don't suggest practice with misunderstanding
    });
  });

  describe('Flow Performance and Reliability', () => {
    it('should complete full flow within performance targets', async () => {
      const conversationId = 'perf_test';

      const userContext: UserLearningContext = {
        id: 'perf_user',
        sessionId: 'perf_session',
        confidenceLevel: 0.8,
        learningVelocity: 1.0,
        engagementLevel: 0.8,
        stuckPoints: [],
        recentConcepts: [{ concept: 'React hooks', mastery: 0.7 }],
        practiceHistory: [],
        lastPracticeTime: Date.now() - 3600000,
        preferences: { difficultyPreference: 'medium', feedbackStyle: 'encouraging' },
        statistics: {}
      };

      mockUserContextTracker.getUserContext.mockResolvedValue(userContext);
      mockConversationAnalyzer.analyzeConversation.mockResolvedValue({
        shouldSuggestPractice: true,
        vibeDetection: {
          vibe: 'understanding',
          confidence: 0.85,
          reasoning: 'User understanding detected',
          practiceReadiness: 0.8,
          suggestedTopics: ['React hooks'],
          detectedFrom: ['patterns'],
          timestamp: Date.now()
        },
        keyConcepts: ['React hooks']
      });

      mockPracticeAgent.execute.mockImplementation(function* () {
        yield {
          type: 'data',
          content: {
            suggestion: {
              id: 'perf_sugg',
              type: 'gentle-nudge',
              introduction: 'Great! Since you understand React hooks',
              challenge: 'try creating a custom hook',
              context: 'This will solidify your understanding',
              estimatedTime: 15,
              difficulty: 'medium',
              vibe: 'understanding',
              timing: { when: 'when you\'re ready', urgency: 'low' },
              options: { accept: 'Yes!', decline: 'Later', postpone: 'In a bit' },
              metadata: { concept: 'React hooks', relatedTopics: [], prerequisites: [], nextSteps: [] }
            }
          },
          timestamp: Date.now()
        };
      });

      const startTime = Date.now();

      // Complete flow: check opportunity → generate suggestion → handle response
      const opportunityResult = await naturalPracticeFlow.checkPracticeOpportunity(
        conversationId,
        'I understand React hooks now'
      );

      expect(opportunityResult.hasOpportunity).toBe(true);

      const suggestion = await naturalPracticeFlow.generatePracticeSuggestion(
        opportunityResult.opportunity!,
        userContext
      );

      expect(suggestion.id).toBeDefined();

      await naturalPracticeFlow.handlePracticeResponse(conversationId, 'accept', suggestion.id);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete entire flow in under 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should handle graceful degradation when AI services fail', async () => {
      const conversationId = 'fallback_test';

      const userContext: UserLearningContext = {
        id: 'fallback_user',
        sessionId: 'fallback_session',
        confidenceLevel: 0.5,
        learningVelocity: 1.0,
        engagementLevel: 0.5,
        stuckPoints: [],
        recentConcepts: [],
        practiceHistory: [],
        lastPracticeTime: Date.now() - 3600000,
        preferences: { difficultyPreference: 'medium', feedbackStyle: 'encouraging' },
        statistics: {}
      };

      mockUserContextTracker.getUserContext.mockResolvedValue(userContext);

      // Simulate AI failure
      mockConversationAnalyzer.analyzeConversation.mockRejectedValue(new Error('AI service unavailable'));

      const result = await naturalPracticeFlow.checkPracticeOpportunity(
        conversationId,
        'I want to practice React'
      );

      // Should not crash and should provide fallback
      expect(result).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Using fallback opportunity analysis',
        expect.any(Object)
      );
    });
  });

  describe('Real-world Conversation Scenarios', () => {
    it('should handle realistic React learning conversation', async () => {
      const conversationId = 'react_learning';
      const messages = [
        'I\'m learning React and struggling with hooks',
        'Can you explain useState again?',
        'I think I understand it now - it\'s for managing component state',
        'Let me try using it in my todo app'
      ];

      const userContext: UserLearningContext = {
        id: 'react_user',
        sessionId: 'react_session',
        confidenceLevel: 0.6,
        learningVelocity: 0.9,
        engagementLevel: 0.8,
        stuckPoints: ['useState'],
        recentConcepts: [{ concept: 'useState', mastery: 0.5 }],
        practiceHistory: [],
        lastPracticeTime: Date.now() - 7200000,
        preferences: { difficultyPreference: 'easy', feedbackStyle: 'encouraging' },
        statistics: {}
      };

      mockUserContextTracker.getUserContext.mockResolvedValue(userContext);

      // Simulate progression from confusion to understanding
      for (let i = 0; i < messages.length; i++) {
        if (i < 2) {
          // Initial confusion
          mockConversationAnalyzer.analyzeConversation.mockResolvedValue({
            shouldSuggestPractice: false,
            vibeDetection: {
              vibe: 'confused',
              confidence: 0.7,
              reasoning: 'User is learning useState',
              practiceReadiness: 0.5,
              suggestedTopics: ['useState'],
              detectedFrom: ['learning_patterns'],
              timestamp: Date.now()
            },
            keyConcepts: ['useState']
          });
        } else {
          // Later understanding
          mockConversationAnalyzer.analyzeConversation.mockResolvedValue({
            shouldSuggestPractice: true,
            vibeDetection: {
              vibe: 'understanding',
              confidence: 0.8,
              reasoning: 'User now understands useState',
              practiceReadiness: 0.8,
              suggestedTopics: ['useState', 'todo app'],
              detectedFrom: ['understanding_patterns'],
              timestamp: Date.now()
            },
            keyConcepts: ['useState', 'state management']
          });
        }

        const result = await naturalPracticeFlow.checkPracticeOpportunity(conversationId, messages[i]);

        if (i < 2) {
          expect(result.shouldSuggest).toBe(false); // No suggestion while confused
        } else {
          expect(result.shouldSuggest).toBe(true); // Suggestion when understanding emerges
        }
      }
    });

    it('should maintain context across multiple practice suggestions', async () => {
      const conversationId = 'context_test';

      const userContext: UserLearningContext = {
        id: 'context_user',
        sessionId: 'context_session',
        confidenceLevel: 0.7,
        learningVelocity: 1.1,
        engagementLevel: 0.85,
        stuckPoints: [],
        recentConcepts: [
          { concept: 'useState', mastery: 0.8 },
          { concept: 'useEffect', mastery: 0.6 }
        ],
        practiceHistory: [
          { concept: 'useState', completed: true, score: 0.9 },
          { concept: 'component props', completed: true, score: 0.8 }
        ],
        lastPracticeTime: Date.now() - 1800000, // 30 minutes ago
        preferences: { difficultyPreference: 'medium', feedbackStyle: 'encouraging' },
        statistics: { totalPractices: 5, averageScore: 0.85 }
      };

      mockUserContextTracker.getUserContext.mockResolvedValue(userContext);
      mockConversationAnalyzer.analyzeConversation.mockResolvedValue({
        shouldSuggestPractice: true,
        vibeDetection: {
          vibe: 'understanding',
          confidence: 0.85,
          reasoning: 'User understands useEffect basics',
          practiceReadiness: 0.8,
          suggestedTopics: ['useEffect', 'side effects'],
          detectedFrom: ['context_patterns'],
          timestamp: Date.now()
        },
        keyConcepts: ['useEffect', 'side effects']
      });

      mockPracticeAgent.execute.mockImplementation(function* () {
        yield {
          type: 'data',
          content: {
            suggestion: {
              id: 'context_sugg',
              type: 'gentle-nudge',
              introduction: 'Great! Since you understand useEffect and have practiced useState',
              challenge: 'try creating a component that uses both useState and useEffect together',
              context: 'This builds on your previous useState practice',
              estimatedTime: 20,
              difficulty: 'medium',
              vibe: 'understanding',
              timing: { when: 'when you\'re ready', urgency: 'low' },
              options: { accept: 'Yes!', decline: 'Later', postpone: 'In a bit' },
              metadata: {
                concept: 'useEffect',
                relatedTopics: ['useState', 'side effects'],
                prerequisites: ['useState experience'],
                nextSteps: ['Combine', 'Practice', 'Master']
              }
            }
          },
          timestamp: Date.now()
        };
      });

      const opportunityResult = await naturalPracticeFlow.checkPracticeOpportunity(
        conversationId,
        'I think I understand useEffect now'
      );

      expect(opportunityResult.hasOpportunity).toBe(true);

      const suggestion = await naturalPracticeFlow.generatePracticeSuggestion(
        opportunityResult.opportunity!,
        userContext
      );

      // Should reference previous practice context
      expect(suggestion.introduction).toContain('useState');
      expect(suggestion.context).toContain('previous useState practice');
      expect(suggestion.metadata.prerequisites).toContain('useState experience');
    });
  });
});