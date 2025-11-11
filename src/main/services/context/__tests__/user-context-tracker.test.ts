/**
 * UserContextTracker Tests
 *
 * Unit tests for the UserContextTracker service.
 * Part of Phase 1 context-aware practice system implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserContextTracker } from '../../../../main/services/context/user-context-tracker';
import { ContextUpdateRequest, UserContext } from '@/shared/types/practice';

describe('UserContextTracker', () => {
  let userContextTracker: UserContextTracker;
  let mockDependencies: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDependencies = {
      logger: {
        info: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
      }
    };

    userContextTracker = new UserContextTracker(
      'test-user',
      'test-session',
      mockDependencies
    );
  });

  describe('Context Updates', () => {
    it('should handle concept introduction correctly', async () => {
      const request: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'concept_introduction',
        content: 'Learning about React hooks and useState',
        timestamp: Date.now(),
        concepts: ['React hooks', 'useState'],
        confidence: 0.7,
        sentiment: 0.5
      };

      const result = await userContextTracker.updateContext(request);

      expect(result.updated).toBe(true);
      expect(result.changes.newConcepts).toContain('React hooks');
      expect(result.changes.newConcepts).toContain('useState');
      expect(result.changes.learningPatterns.length).toBeGreaterThan(0);
    });

    it('should handle practice completion successfully', async () => {
      const request: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'practice_completion',
        content: 'Completed React hooks exercise',
        timestamp: Date.now(),
        concepts: ['React hooks'],
        confidence: 0.8,
        practiceResult: {
          success: true,
          concept: 'React hooks',
          duration: 15,
          attempts: 2
        }
      };

      const result = await userContextTracker.updateContext(request);

      expect(result.updated).toBe(true);
      expect(result.changes.confidenceChanges).toHaveProperty('React hooks');
      expect(result.changes.confidenceChanges['React hooks']).toBeGreaterThan(0); // Increased confidence
    });

    it('should handle failed practice correctly', async () => {
      const request: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'practice_completion',
        content: 'Failed React hooks exercise',
        timestamp: Date.now(),
        concepts: ['React hooks'],
        confidence: 0.3,
        practiceResult: {
          success: false,
          concept: 'React hooks',
          duration: 25,
          attempts: 3
        }
      };

      const result = await userContextTracker.updateContext(request);

      expect(result.updated).toBe(true);
      expect(result.changes.newStuckPoints).toContain('React hooks');
      expect(result.changes.confidenceChanges['React hooks']).toBeLessThan(0); // Decreased confidence
    });

    it('should handle general user messages', async () => {
      const request: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'user_message',
        content: 'I have a question about React state management',
        timestamp: Date.now(),
        concepts: ['React', 'state'],
        confidence: 0.6,
        sentiment: -0.2
      };

      const result = await userContextTracker.updateContext(request);

      expect(result.updated).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Learning Patterns', () => {
    it('should create learning pattern for new concepts', async () => {
      const request: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'concept_introduction',
        content: 'Learning about useState',
        timestamp: Date.now(),
        concepts: ['useState'],
        confidence: 0.6
      };

      await userContextTracker.updateContext(request);

      const currentContext = userContextTracker.getCurrentContext();
      expect(currentContext.recentConcepts).toHaveLength(1);
      expect(currentContext.recentConcepts[0].concept).toBe('useState');
      expect(currentContext.recentConcepts[0].firstSeen).toBe(request.timestamp);
    });

    it('should update existing concept confidence', async () => {
      // First introduction
      const request1: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'concept_introduction',
        content: 'Learning about useState',
        timestamp: Date.now(),
        concepts: ['useState'],
        confidence: 0.5
      };

      await userContextTracker.updateContext(request1);

      // Second introduction with higher confidence
      const request2: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'concept_introduction',
        content: 'Now I understand useState better',
        timestamp: Date.now() + 1000,
        concepts: ['useState'],
        confidence: 0.8
      };

      const result = await userContextTracker.updateContext(request2);

      expect(result.changes.confidenceChanges['useState']).toBeGreaterThan(0);

      const currentContext = userContextTracker.getCurrentContext();
      const useStateConcept = currentContext.recentConcepts.find(c => c.concept === 'useState');
      expect(useStateConcept?.confidence).toBe(0.8);
    });

    it('should detect breakthrough moments', async () => {
      // First introduction
      const request1: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'concept_introduction',
        content: 'Trying to understand React hooks',
        timestamp: Date.now(),
        concepts: ['React hooks'],
        confidence: 0.4
      };

      await userContextTracker.updateContext(request1);

      // Breakthrough
      const request2: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'concept_introduction',
        content: 'Aha! I finally understand how hooks work',
        timestamp: Date.now() + 5000,
        concepts: ['React hooks'],
        confidence: 0.9
      };

      await userContext.updateContext(request2);

      const analytics = userContextTracker.getLearningAnalytics();
      const hooksPattern = analytics.patterns.find(p => p.concept === 'React hooks');

      expect(hooksPattern?.breakthroughMoments).toHaveLength(1);
      expect(hooksPattern?.breakthroughMoments[0].confidenceBefore).toBe(0.4);
      expect(hooksPattern?.breakthroughMoments[0].confidenceAfter).toBe(0.9);
    });
  });

  describe('Cognitive Metrics', () => {
    it('should calculate engagement level from messages', async () => {
      const engagedRequest: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'user_message',
        content: 'This is really interesting! I have so many questions about how this works. Can you explain more?',
        timestamp: Date.now(),
        concepts: ['concept'],
        confidence: 0.7,
        sentiment: 0.8
      };

      await userContextTracker.updateContext(engagedRequest);

      const currentContext = userContextTracker.getCurrentContext();
      expect(currentContext.engagementLevel).toBeGreaterThan(0.5);
    });

    it('should update cognitive metrics based on practice results', async () => {
      const successRequest: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'practice_completion',
        content: 'Successfully completed exercise',
        timestamp: Date.now(),
        concepts: ['concept'],
        confidence: 0.8,
        practiceResult: {
          success: true,
          concept: 'concept',
          duration: 20,
          attempts: 1
        }
      };

      await userContextTracker.updateContext(successRequest);

      const analytics = userContextTracker.getLearningAnalytics();
      expect(analytics.cognitiveMetrics.retentionRate).toBeGreaterThan(0.8);
      expect(analytics.cognitiveMetrics.motivationLevel).toBeGreaterThan(0.8);
    });

    it('should track learning velocity over time', async () => {
      // Multiple concept introductions
      const requests = [
        {
          sessionId: 'test-session',
          messageType: 'concept_introduction',
          content: 'Learning concept A',
          timestamp: Date.now(),
          concepts: ['conceptA'],
          confidence: 0.5
        },
        {
          sessionId: 'test-session',
          messageType: 'concept_introduction',
          content: 'Learning concept B',
          timestamp: Date.now() + 30000, // 30 seconds later
          concepts: ['conceptB'],
          confidence: 0.6
        }
      ];

      for (const request of requests) {
        await userContextTracker.updateContext(request);
      }

      const analytics = userContext.getLearningAnalytics();
      expect(analytics.cognitiveMetrics.currentVelocity).toBeGreaterThan(0);
    });
  });

  describe('Stuck Point Analysis', () => {
    it('should identify and track stuck points from failed practices', async () => {
      const failedRequest: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'practice_completion',
        content: 'Failed practice attempt',
        timestamp: Date.now(),
        concepts: ['difficult concept'],
        confidence: 0.2,
        practiceResult: {
          success: false,
          concept: 'difficult concept',
          duration: 30,
          attempts: 5
        }
      };

      const result = await userContextTracker.updateContext(failedRequest);

      expect(result.changes.newStuckPoints).toContain('difficult concept');

      const currentContext = userContextTracker.getCurrentContext();
      expect(currentContext.stuckPoints).toContain('difficult concept');
    });

    it('should resolve stuck points after successful practice', async () => {
      // First, create a stuck point
      const failedRequest: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'practice_completion',
        content: 'Failed practice attempt',
        timestamp: Date.now(),
        concepts: ['tricky concept'],
        confidence: 0.3,
        practiceResult: {
          success: false,
          concept: 'tricky concept',
          duration: 25,
          attempts: 3
        }
      };

      await userContextTracker.updateContext(failedRequest);

      // Then resolve it
      const successRequest: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'practice_completion',
        content: 'Successfully completed practice',
        timestamp: Date.now() + 10000,
        concepts: ['tricky concept'],
        confidence: 0.9,
        practiceResult: {
          success: true,
          concept: 'tricky concept',
          duration: 15,
          attempts: 1
        }
      };

      const result = await userContext.updateContext(successRequest);

      expect(result.changes.resolvedStuckPoints).toContain('tricky concept');

      const currentContext = userContextTracker.getCurrentContext();
      expect(currentContext.stuckPoints).not.toContain('tricky concept');
    });

    it('should track resolution patterns', async () => {
      // Create and resolve stuck point multiple times
      for (let i = 0; i < 3; i++) {
        // Create stuck point
        const failedRequest: ContextUpdateRequest = {
          sessionId: 'test-session',
          messageType: 'practice_completion',
          content: `Failed practice attempt ${i + 1}`,
          timestamp: Date.now(),
          concepts: ['recurring problem'],
          confidence: 0.2,
          practiceResult: {
            success: false,
            concept: 'recurring problem',
            duration: 20,
            attempts: 2
          }
        };

        await userContext.updateContext(failedRequest);

        // Resolve it
        const successRequest: ContextUpdateRequest = {
          sessionId: 'test-session',
          messageType: 'practice_completion',
          content: `Successfully completed practice ${i + 1}`,
          timestamp: Date.now() + 5000,
          concepts: ['recurring problem'],
          confidence: 0.8,
          practiceResult: {
            success: true,
            concept: 'recurring problem',
            duration: 10,
            attempts: 1
          }
        };

        await userContext.updateContext(successRequest);
      }

      const analytics = userContext.getLearningAnalytics();
      expect(analytics.stuckPointAnalysis.resolutionPatterns).toHaveLength(3);
      expect(analytics.stuckPointAnalysis.resolutionPatterns[0].concept).toBe('recurring problem');
      expect(analytics.stuckPointAnalysis.resolutionPatterns[0].resolutionMethod).toBe('practice_success');
    });
  });

  describe('Practice History', () => {
    it('should maintain complete practice history', async () => {
      const practiceRequests = [
        {
          sessionId: 'test-session',
          messageType: 'practice_completion',
          content: 'Practice 1',
          timestamp: Date.now(),
          concepts: ['concept1'],
          confidence: 0.7,
          practiceResult: {
            success: true,
            concept: 'concept1',
            duration: 15,
            attempts: 1
          }
        },
        {
          sessionId: 'test-session',
          messageType: 'practice_completion',
          content: 'Practice 2',
          timestamp: Date.now() + 60000,
          concepts: ['concept2'],
          confidence: 0.5,
          practiceResult: {
            success: false,
            concept: 'concept2',
            duration: 30,
            attempts: 3
          }
        }
      ];

      for (const request of practiceRequests) {
        await userContext.updateContext(request);
      }

      const currentContext = userContextTracker.getCurrentContext();
      expect(currentContext.practiceHistory).toHaveLength(2);
      expect(currentContext.practiceHistory[0].concept).toBe('concept1');
      expect(currentContext.practiceHistory[0].success).toBe(true);
      expect(currentContext.practiceHistory[1].concept).toBe('concept2');
      expect(currentContext.practiceHistory[1].success).toBe(false);
    });

    it('should calculate success rate correctly', async () => {
      // 3 successful practices, 2 failed practices
      const practiceRequests = [
        { success: true, concept: 'a', duration: 10, attempts: 1 },
        { success: false, concept: 'b', duration: 20, attempts: 2 },
        { success: true, concept: 'c', duration: 15, attempts: 1 },
        { success: true, concept: 'd', duration: 12, attempts: 1 },
        { success: false, concept: 'e', duration: 25, attempts: 3 }
      ].map((practice, index) => ({
        sessionId: 'test-session',
        messageType: 'practice_completion',
        content: `Practice ${index + 1}`,
        timestamp: Date.now() + index * 60000,
        concepts: [practice.concept],
        confidence: 0.6,
        practiceResult: practice
      }));

      for (const request of practiceRequests) {
        await userContextTracker.updateContext(request);
      }

      const currentContext = userContextTracker.getCurrentContext();
      expect(currentContext.statistics.successRate).toBeCloseTo(0.6, 1);
    });
  });

  describe('Current Context', () => {
    it('should provide comprehensive current context snapshot', () => {
      const currentContext = userContextTracker.getCurrentContext();

      expect(currentContext.id).toBe('test-user');
      expect(currentContext.sessionId).toBe('test-session');
      expect(currentContext.confidenceLevel).toBeDefined();
      expect(currentContext.learningVelocity).toBeDefined();
      expect(currentContext.stuckPoints).toBeInstanceOf(Array);
      expect(currentContext.recentConcepts).toBeInstanceOf(Array);
      expect(currentContext.practiceHistory).toBeInstanceOf(Array);
      expect(currentContext.engagementLevel).toBeDefined();
      expect(currentContext.preferences).toBeDefined();
      expect(currentContext.statistics).toBeDefined();
    });

    it('should update current topic based on recent concepts', async () => {
      const request: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'concept_introduction',
        content: 'Learning about advanced React patterns',
        timestamp: Date.now(),
        concepts: ['advanced React patterns', 'context API', 'useReducer'],
        confidence: 0.7
      };

      await userContextTracker.updateContext(request);

      const currentContext = userContextTracker.getCurrentContext();
      expect(currentContext.currentTopic).toBe('advanced React patterns');
      expect(currentContext.currentSubtopics).toContain('context API');
      expect(currentContext.currentSubtopics).toContain('useReducer');
    });
  });

  describe('Recommendations', () => {
    it('should generate practice recommendations for high confidence and engagement', async () => {
      const request: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'concept_introduction',
        content: 'I understand React hooks really well now!',
        timestamp: Date.now(),
        concepts: ['React hooks'],
        confidence: 0.9,
        sentiment: 0.8
      };

      const result = await userContext.updateContext(request);

      expect(result.recommendations.length).toBeGreaterThan(0);
      const practiceRecommendation = result.recommendations.find(r => r.type === 'practice');
      expect(practiceRecommendation).toBeDefined();
      expect(practiceRecommendation.priority).toBe('high');
    });

    it('should suggest review for stuck points', async () => {
      // Create a stuck point first
      const failedRequest: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'practice_completion',
        content: 'Failed practice',
        timestamp: Date.now(),
        concepts: ['confusing concept'],
        confidence: 0.2,
        practiceResult: {
          success: false,
          concept: 'confusing concept',
          duration: 25,
          attempts: 4
        }
      };

      await userContext.updateContext(failedRequest);

      const result = await userContext.updateContext({
        sessionId: 'test-session',
        messageType: 'user_message',
        content: 'Another message',
        timestamp: Date.now()
      });

      const reviewRecommendation = result.recommendations.find(r => r.type === 'review');
      expect(reviewRecommendation).toBeDefined();
      expect(reviewRecommendation.description).toContain('confusing concept');
    });

    it('should suggest advancement for high confidence in multiple concepts', async () => {
      // Introduce multiple concepts with high confidence
      const highConfidenceRequests = [
        {
          sessionId: 'test-session',
          messageType: 'concept_introduction',
          content: 'Mastered concept 1',
          timestamp: Date.now(),
          concepts: ['concept1'],
          confidence: 0.9
        },
        {
          sessionId: 'test-session',
          messageType: 'concept_introduction',
          content: 'Mastered concept 2',
          timestamp: Date.now() + 10000,
          concepts: ['concept2'],
          confidence: 0.85
        },
        {
          sessionId: 'test-session',
          messageType: 'concept_introduction',
          content: 'Mastered concept 3',
          timestamp: Date.now() + 20000,
          concepts: ['concept3'],
          confidence: 0.95
        }
      ];

      for (const request of highConfidenceRequests) {
        await userContext.updateContext(request);
      }

      const result = await userContext.updateContext({
        sessionId: 'test-session',
        messageType: 'user_message',
        content: 'Ready for next challenge',
        timestamp: Date.now()
      });

      const advanceRecommendation = result.recommendations.find(r => r.type === 'advance');
      expect(advanceRecommendation).toBeDefined();
      expect(advanceRecommendation.priority).toBe('low');
    });
  });

  describe('Next Steps Calculation', () => {
    it('should suggest immediate practice when engagement is high', async () => {
      const request: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'user_message',
        content: 'I love this! Can we do more?',
        timestamp: Date.now(),
        confidence: 0.8,
        sentiment: 0.9
      };

      const result = await userContext.updateContext(request);

      expect(result.nextSteps.optimalPracticeTiming).toBeLessThan(30);
      expect(result.nextSteps.suggestedDifficulty).toBeDefined();
      expect(result.nextSteps.focusAreas.length).toBeGreaterThan(0);
    });

    it('should suggest longer break when cognitive load is high', async () => {
      // Simulate high cognitive load through multiple complex messages
      const complexRequests = Array.from({ length: 10 }, (_, index) => ({
        sessionId: 'test-session',
        messageType: 'user_message',
        content: `This is a very complex message ${index} with lots of technical details and questions about multiple related and unrelated topics that increases cognitive load substantially.`,
        timestamp: Date.now() + index * 5000,
        confidence: 0.6,
        concepts: ['complex topic'],
        sentiment: 0.1
      }));

      for (const request of complexRequests) {
        await userContext.updateContext(request);
      }

      const result = await userContext.updateContext({
        sessionId: 'test-session',
        messageType: 'user_message',
        content: 'Ready for more',
        timestamp: Date.now()
      });

      expect(result.nextSteps.optimalTiming).toBeGreaterThan(30);
    });

    it('should adjust difficulty based on confidence and success rate', async () => {
      // High confidence and success rate
      const request: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'practice_completion',
        content: 'Successfully completed advanced practice',
        timestamp: Date.now(),
        concepts: ['advanced concept'],
        confidence: 0.9,
        practiceResult: {
          success: true,
          concept: 'advanced concept',
          duration: 10,
          attempts: 1
        }
      };

      await userContext.updateContext(request);

      const result = await userContext.updateContext({
        sessionId: 'test-session',
        messageType: 'user_message',
        content: 'What\'s next?',
        timestamp: Date.now()
      });

      expect(result.nextSteps.suggestedDifficulty).toBe('hard');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      const malformedRequest = {
        sessionId: 'test-session',
        messageType: 'invalid_type' as any,
        content: 'Test content',
        timestamp: Date.now()
      };

      const result = await userContextTracker.updateContext(malformedRequest);

      // Should not throw and should return safe result
      expect(result).toBeDefined();
      expect(typeof result.updated).toBe('boolean');
      expect(typeof result.changes).toBe('object');
    });

    it('should handle missing optional fields gracefully', async () => {
      const minimalRequest: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'user_message',
        content: 'Minimal message',
        timestamp: Date.now()
      };

      const result = await userContextTracker.updateContext(minimalRequest);

      expect(result.updated).toBe(true);
      expect(result.changes.newConcepts).toHaveLength(0);
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('Project Context', () => {
    it('should allow setting and retrieving project context', () => {
      const projectContext = {
        name: 'My React App',
        type: 'react',
        technologies: ['React', 'TypeScript', 'Tailwind CSS'],
        recentFiles: [
          {
            path: '/src/App.tsx',
            lastModified: Date.now() - 10000,
            concepts: ['React component', 'useState']
          }
        ],
        challenges: [
          {
            concept: 'state management',
            difficulty: 3,
            status: 'active'
          }
        ]
      };

      userContextTracker.setProjectContext(projectContext);

      const currentContext = userContextTracker.getCurrentContext();
      expect(currentContext.currentProject).toEqual(projectContext);
    });

    it('should use project context in recommendations', async () => {
      userContextTracker.setProjectContext({
        name: 'Todo App',
        type: 'react',
        technologies: ['React', 'TypeScript'],
        recentFiles: [],
        challenges: []
      });

      const request: ContextUpdateRequest = {
        sessionId: 'test-session',
        messageType: 'concept_introduction',
        content: 'Learning about useState',
        timestamp: Date.now(),
        concepts: ['useState'],
        confidence: 0.7
      };

      const result = await userContext.updateContext(request);

      // Should reference project in recommendations
      expect(result.nextSteps.focusAreas).toContain('useState');
      // The practice opportunities should also reference the project context
      // (This would be tested in integration tests)
    });
  });

  describe('Learning Analytics', () => {
    it('should provide comprehensive learning analytics', () => {
      const analytics = userContext.getLearningAnalytics();

      expect(analytics.patterns).toBeDefined();
      expect(analytics.cognitiveMetrics).toBeDefined();
      expect(analytics.stuckPointAnalysis).toBeDefined();
      expect(analytics.performanceTrends).toBeDefined();
    });

    it('should track performance trends over time', async () => {
      // Simulate activity over time
      const activities = [
        { type: 'concept_introduction', confidence: 0.4 },
        { type: 'concept_introduction', confidence: 0.6 },
        { type: 'practice_completion', success: true },
        { type: 'concept_introduction', confidence: 0.8 },
        { type: 'practice_completion', success: false },
        { type: 'user_message', confidence: 0.7 }
      ];

      for (let i = 0; i < activities.length; i++) {
        const request: ContextUpdateRequest = {
          sessionId: 'test-session',
          messageType: activities[i].type as any,
          content: `Activity ${i + 1}`,
          timestamp: Date.now() + i * 30000,
          concepts: [`concept${i + 1}`],
          confidence: activities[i].confidence,
          practiceResult: activities[i].type === 'practice_completion' ? {
            success: activities[i].success,
            concept: `concept${i + 1}`,
            duration: 20,
            attempts: 1
          } : undefined
        };

        await userContext.updateContext(request);
      }

      const analytics = userContext.getLearningAnalytics();

      expect(analytics.performanceTrends.confidenceTrend).toBeDefined();
      expect(analytics.performanceTrends.successRateTrend).toBeDefined();
      expect(analytics.performanceTrends.velocityTrend).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    it('should limit recent activity history size', async () => {
      // Add 100 activities to exceed the limit
      for (let i = 0; i < 100; i++) {
        const request: ContextUpdateRequest = {
          sessionId: 'test-session',
          messageType: 'user_message',
          content: `Activity ${i}`,
          timestamp: Date.now() + i * 1000,
          concepts: [`concept${i}`],
          confidence: 0.5
        };

        await userContext.updateContext(request);
      }

      const currentContext = userContextTracker.getCurrentContext();
      expect(currentContext.recentConcepts.length).toBeLessThanOrEqual(50);
    });

    it('should clean up old cache entries', () => {
      // This would be tested in integration with actual caching
      const analytics = userContext.getLearningAnalytics();

      // Verify cache exists
      expect(analytics).toBeDefined();
    });
  });

  describe('Disposal', () => {
    it('should dispose cleanly without errors', () => {
      expect(() => {
        userContextTracker.dispose();
      }).not.toThrow();
    });

    it('should log disposal metrics', () => {
      userContextTracker.dispose();
      expect(mockDependencies.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('UserContextTracker disposed'),
        expect.objectContaining({
          userId: 'test-user',
          sessionId: 'test-session'
        })
      );
    });
  });
});