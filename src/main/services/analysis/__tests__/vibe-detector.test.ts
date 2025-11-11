/**
 * Vibe Detector Tests
 *
 * Comprehensive unit tests for VibeDetector service covering
 * all vibe types, edge cases, and fallback mechanisms.
 * Part of Phase 1 vibe detection system implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VibeDetector, VibeDetectionRequest } from '../vibe-detector';
import { VibeType, DEFAULT_VIBE_DETECTION_CONFIG } from '@/shared/types/practice';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseLanguageModel } from '@langchain/core/language_models/base';

// Mock LangChain model for testing
class MockVibeModel {
  async invoke(messages: any[]): Promise<any> {
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage.content as string;

    // Mock responses based on prompt content
    if (content.includes('vibe_type") || content.includes('vibe_type')) {
      // Test for different vibe scenarios
      if (content.includes('I understand') || content.includes('got it')) {
        return {
          content: JSON.stringify({
            vibe: 'understanding',
            confidence: 0.85,
            reasoning: 'User shows clear understanding with phrases like "I understand" and "got it"',
            practiceReadiness: 0.8,
            suggestedTopics: ['React hooks', 'useState'],
            detectedFrom: ['message_content', 'language_patterns'],
            keyIndicators: ['understanding keywords', 'positive tone']
          })
        };
      }

      if (content.includes("don't understand") || content.includes('confused')) {
        return {
          content: JSON.stringify({
            vibe: 'confused',
            confidence: 0.82,
            reasoning: 'User expresses confusion with phrases like "don\'t understand" and needs clarification',
            practiceReadiness: 0.4,
            suggestedTopics: ['React hooks', 'useState'],
            detectedFrom: ['message_content', 'negative_indicators'],
            keyIndicators: ['confusion keywords', 'help requests']
          })
        };
      }

      if (content.includes('aha!') || content.includes('breakthrough')) {
        return {
          content: JSON.stringify({
            vibe: 'breakthrough',
            confidence: 0.91,
            reasoning: 'User shows excitement and insight with "aha!" and "breakthrough" expressions',
            practiceReadiness: 0.92,
            suggestedTopics: ['React hooks', 'useState'],
            detectedFrom: ['emotional_indicators', 'sudden_understanding'],
            keyIndicators: ['excitement', 'insight language']
          })
        };
      }

      if (content.includes('trying') || content.includes('implementing')) {
        return {
          content: JSON.stringify({
            vibe: 'practicing',
            confidence: 0.78,
            reasoning: 'User is actively practicing with phrases like "trying" and "implementing"',
            practiceReadiness: 0.3,
            suggestedTopics: ['current practice'],
            detectedFrom: ['action_keywords', 'present_tense'],
            keyIndicators: ['practice language', 'implementation focus']
          })
        };
      }

      if (content.includes('I thought you meant') || content.includes('my understanding was')) {
        return {
          content: JSON.stringify({
            vibe: 'misunderstanding',
            confidence: 0.87,
            reasoning: 'User reveals misunderstanding with corrective phrases',
            practiceReadiness: 0.15,
            suggestedTopics: ['clarification needed'],
            detectedFrom: ['correction_phrases', 'self_correction'],
            keyIndicators: ['acknowledgment of error', 'reconciliation']
          })
        };
      }
    }

    // Default response for edge cases
    return {
      content: JSON.stringify({
        vibe: 'understanding',
        confidence: 0.5,
        reasoning: 'Default response for unclear vibe',
        practiceReadiness: 0.5,
        suggestedTopics: [],
        detectedFrom: ['fallback'],
        keyIndicators: []
      })
    };
  }
}

describe('VibeDetector', () => {
  let vibeDetector: VibeDetector;
  let mockModel: BaseLanguageModel;

  beforeEach(() => {
    vi.clearAllMocks();
    mockModel = new MockVibeModel() as any;
    vibeDetector = new VibeDetector(mockModel);
  });

  describe('Basic Vibe Detection', () => {
    it('should detect understanding vibe correctly', async () => {
      const request: VibeDetectionRequest = {
        conversationHistory: [
          { role: 'user', content: 'I understand React hooks now', timestamp: Date.now() },
          { role: 'assistant', content: 'Great! Hooks are indeed powerful', timestamp: Date.now() },
          { role: 'user', content: 'Got it, I can see how useState works', timestamp: Date.now() }
        ],
        userContext: {
          confidenceLevel: 0.8,
          learningVelocity: 1.2,
          stuckPoints: [],
          recentConcepts: [
            { concept: 'useState', confidence: 0.7 }
          ]
        },
        currentTopic: 'React hooks'
      };

      const result = await vibeDetector.detectVibe(request);

      expect(result.vibe).toBe('understanding');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.practiceReadiness).toBeGreaterThan(0.7);
      expect(result.suggestedTopics).toContain('React hooks');
      expect(result.detectedFrom).toContain('message_content');
      expect(result.keyIndicators.length).toBeGreaterThan(0);
    });

    it('should detect confused vibe correctly', async () => {
      const request: VibeDetectionRequest = {
        conversationHistory: [
          { role: 'user', content: "I don't understand React hooks", timestamp: Date.now() },
          { role: 'user', content: "This doesn't make sense to me", timestamp: Date.now() },
          { role: 'user', content: "Can you explain it again?", timestamp: Date.now() }
        ],
        userContext: {
          confidenceLevel: 0.3,
          learningVelocity: 0.5,
          stuckPoints: ['React hooks'],
          recentConcepts: []
        },
        currentTopic: 'React hooks'
      };

      const result = await vibeDetector.detectVibe(request);

      expect(result.vibe).toBe('confused');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.practiceReadiness).toBeLessThan(0.5);
      expect(result.detectedFrom).toContain('message_content');
    });

    it('should detect breakthrough vibe correctly', async () => {
      const request: VibeDetectionRequest = {
        conversationHistory: [
          { role: 'user', content: 'Aha! I think I finally get React hooks!', timestamp: Date.now() },
          { role: 'user', content: 'Breakthrough! useState clicked for me', timestamp: Date.now() },
          { role: 'user', content: 'This is so much clearer now', timestamp: Date.now() }
        ],
        userContext: {
          confidenceLevel: 0.7,
          learningVelocity: 1.8,
          stuckPoints: ['useState', 'hooks'],
          recentConcepts: [
            { concept: 'useState', confidence: 0.5 }
          ]
        },
        currentTopic: 'React hooks'
      };

      const result = await vibeDetector.detectVibe(request);

      expect(result.vibe).toBe('breakthrough');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.practiceReadiness).toBeGreaterThan(0.85);
      expect(result.keyIndicators).toContain('excitement');
    });

    it('should detect practicing vibe correctly', async () => {
      const request: VibeDetectionRequest = {
        conversationHistory: [
          { role: 'user', content: 'Let me try implementing useState', timestamp: Date.now() },
          { role: 'user', content: 'I am trying to build a counter component', timestamp: Date.now() },
          { role: 'user', content: 'Here is my code so far', timestamp: Date.now() }
        ],
        userContext: {
          confidenceLevel: 0.6,
          learningVelocity: 1.0,
          stuckPoints: [],
          recentConcepts: [
            { concept: 'useState', confidence: 0.8 }
          ]
        },
        currentTopic: 'React hooks'
      };

      const result = await vibeDetector.detectVibe(request);

      expect(result.vibe).toBe('practicing');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.practiceReadiness).toBeLessThan(0.4);
      expect(result.detectedFrom).toContain('action_keywords');
    });

    it('should detect misunderstanding vibe correctly', async () => {
      const request: VibeDetectionRequest = {
        conversationHistory: [
          { role: 'user', content: 'I thought you meant useState maintains state globally', timestamp: Date.now() },
          { role: 'user', content: 'My understanding was wrong about how hooks work', timestamp: Date.now() },
          { role: 'user', content: 'Can you correct me if I misunderstood?', timestamp: Date.now() }
        ],
        userContext: {
          confidenceLevel: 0.8,
          learningVelocity: 1.1,
          stuckPoints: [],
          recentConcepts: [
            { concept: 'useState', confidence: 0.9 }
          ]
        },
        currentTopic: 'React hooks'
      };

      const result = await vibeDetector.detectVibe(request);

      expect(result.vibe).toBe('misunderstanding');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.practiceReadiness).toBeLessThan(0.3);
      expect(result.detectedFrom).toContain('correction_phrases');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle insufficient conversation history gracefully', async () => {
      const request: VibeDetectionRequest = {
        conversationHistory: [
          { role: 'user', content: 'Hello', timestamp: Date.now() }
        ],
        userContext: {
          confidenceLevel: 0.5,
          learningVelocity: 1.0,
          stuckPoints: [],
          recentConcepts: []
        },
        currentTopic: 'General'
      };

      const result = await vibeDetector.detectVibe(request);

      expect(result.vibe).toBe('understanding'); // Default fallback
      expect(result.confidence).toBe(0.5);
      expect(result.reasoning).toContain('Insufficient conversation history');
      expect(result.practiceReadiness).toBe(0.3);
      expect(result.detectedFrom).toContain('insufficient_data');
    });

    it('should handle AI model errors with pattern-based fallback', async () => {
      // Mock model to throw error
      const errorModel = {
        invoke: vi.fn().mockRejectedValue(new Error('AI model unavailable'))
      } as any;

      const errorProneDetector = new VibeDetector(errorModel);

      const request: VibeDetectionRequest = {
        conversationHistory: [
          { role: 'user', content: 'I understand useState', timestamp: Date.now() },
          { role: 'user', content: 'Got it, makes perfect sense', timestamp: Date.now() },
          { role: 'user', content: 'Yes, totally get it now', timestamp: Date.now() }
        ],
        userContext: {
          confidenceLevel: 0.9,
          learningVelocity: 1.4,
          stuckPoints: [],
          recentConcepts: [
            { concept: 'useState', confidence: 0.95 }
          ]
        },
        currentTopic: 'useState'
      };

      const result = await errorProneDetector.detectVibe(request);

      // Should still return result using pattern-based detection
      expect(result.vibe).toBe('understanding');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning).toContain('pattern analysis');
      expect(result.detectedFrom).toContain('fallback');
    });

    it('should handle malformed AI response gracefully', async () => {
      // Mock model to return malformed JSON
      const malformedModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'This is not valid JSON response {invalid'
        })
      } as any;

      const malformedDetector = new VibeDetector(malformedModel);

      const request: VibeDetectionRequest = {
        conversationHistory: [
          { role: 'user', content: 'I understand React hooks now', timestamp: Date.now() }
        ],
        userContext: {
          confidenceLevel: 0.7,
          learningVelocity: 1.2,
          stuckPoints: [],
          recentConcepts: []
        },
        currentTopic: 'React hooks'
      };

      const result = await malformedDetector.detectVibe(request);

      // Should fallback to understanding vibe with default confidence
      expect(result.vibe).toBe('understanding');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning).toContain('pattern analysis');
    });

    it('should validate and normalize invalid vibe types', async () => {
      // Mock model to return invalid vibe type
      const invalidModel = {
        invoke: vi.fn().mockResolvedValue({
          content: JSON.stringify({
            vibe: 'invalid_vibe',
            confidence: 0.8,
            reasoning: 'Invalid vibe type',
            practiceReadiness: 0.7,
            suggestedTopics: ['topic'],
            detectedFrom: ['test'],
            keyIndicators: []
          })
        })
      } as any;

      const invalidDetector = new VibeDetector(invalidModel);

      const request: VibeDetectionRequest = {
        conversationHistory: [
          { role: 'user', content: 'Test message', timestamp: Date.now() }
        ],
        userContext: {
          confidenceLevel: 0.5,
          learningVelocity: 1.0,
          stuckPoints: [],
          recentConcepts: []
        },
        currentTopic: 'Test'
      };

      const result = await invalidDetector.detectVibe(request);

      // Should normalize to valid vibe type
      expect(result.vibe).toBe('understanding'); // Default fallback
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('Pattern-based Detection', () => {
    it('should detect patterns from user messages', async () => {
      const request: VibeDetectionRequest = {
        conversationHistory: [
          { role: 'assistant', content: 'Assistant response', timestamp: Date.now() },
          { role: 'user', content: 'I really understand this concept now', timestamp: Date.now() },
          { role: 'user', content: 'Got it, makes perfect sense', timestamp: Date.now() },
          { role: 'user', content: 'I totally get what you mean', timestamp: Date.now() }
        ],
        userContext: {
          confidenceLevel: 0.8,
          learningVelocity: 1.3,
          stuckPoints: [],
          recentConcepts: []
        },
        currentTopic: 'Concept understanding'
      };

      const result = await vibeDetector.detectVibe(request);

      expect(result.vibe).toBe('understanding');
      expect(result.confidence).toBeGreaterThan(0.6); // Pattern-based confidence
      expect(result.suggestedTopics).toContain('concept understanding');
    });

    it('should extract topics from conversation messages', async () => {
      const request: VibeDetectionRequest = {
        conversationHistory: [
          { role: 'user', content: 'I am learning React with useState and useEffect', timestamp: Date.now() },
          { role: 'user', content: 'Using TypeScript for my components', timestamp: Date.now() },
          { role: 'user', content: 'Building an Express API with Node.js', timestamp: Date.now() }
        ],
        userContext: {
          confidenceLevel: 0.7,
          learningVelocity: 1.2,
          stuckPoints: [],
          recentConcepts: []
        },
        currentTopic: 'Full stack development'
      };

      const result = await vibeDetector.detectVibe(request);

      expect(result.suggestedTopics).toContain('react');
      expect(result.suggestedTopics).toContain('typescript');
      expect(result.suggestedTopics).toContain('express');
      expect(result.suggestedTopics).toContain('node.js');
    });
  });

  describe('Context Integration', () => {
    it('should boost confidence based on user context for understanding', async () => {
      const request: VibeDetectionRequest = {
        conversationHistory: [
          { role: 'user', content: 'I understand React hooks', timestamp: Date.now() }
        ],
        userContext: {
          confidenceLevel: 0.9, // High confidence
          learningVelocity: 1.4,
          stuckPoints: [],
          recentConcepts: []
        },
        currentTopic: 'React hooks'
      };

      const result = await vibeDetector.detectVibe(request);

      expect(result.vibe).toBe('understanding');
      expect(result.confidence).toBeGreaterThan(0.7); // Should get contextual boost
      expect(result.practiceReadiness).toBeGreaterThan(0.7);
    });

    it('should adjust practice readiness based on recent practice time', async () => {
      const recentPracticeTime = Date.now() - 10 * 60 * 1000; // 10 minutes ago

      const request: VibeDetectionRequest = {
        conversationHistory: [
          { role: 'user', content: 'I understand React hooks well', timestamp: Date.now() }
        ],
        userContext: {
          confidenceLevel: 0.9,
          learningVelocity: 1.4,
          stuckPoints: [],
          recentConcepts: [],
          lastPracticeTime: recentPracticeTime // Recent practice
        },
        currentTopic: 'React hooks'
      };

      const result = await vibeDetector.detectVibe(request);

      expect(result.vibe).toBe('understanding');
      // Practice readiness should be reduced due to recent practice
      expect(result.practiceReadiness).toBeLessThan(0.6);
    });

    it('should provide confidence boost for breakthrough with high learning velocity', async () => {
      const request: VibeDetectionRequest = {
        conversationHistory: [
          { role: 'user', content: 'Aha! React hooks clicked!', timestamp: Date.now() }
        ],
        userContext: {
          confidenceLevel: 0.7,
          learningVelocity: 2.0, // High learning velocity
          stuckPoints: ['previous concepts'],
          recentConcepts: []
        },
        currentTopic: 'React hooks'
      };

      const result = await vibeDetector.detectVibe(request);

      expect(result.vibe).toBe('breakthrough');
      // Should get contextual boost for high learning velocity
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.practiceReadiness).toBeGreaterThan(0.85);
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = vibeDetector.getConfig();
      expect(config.confidenceThreshold).toBe(0.7);
      expect(config.practiceReadinessThreshold).toBe(0.8);
      expect(config.minMessagesForDetection).toBe(3);
      expect(config.contextWindow).toBe(15);
      expect(config.maxPracticeOpportunities).toBe(5);
    });

    it('should allow configuration updates', () => {
      const newConfig = {
        confidenceThreshold: 0.8,
        practiceReadinessThreshold: 0.9,
        minMessagesForDetection: 5,
        contextWindow: 20,
        maxPracticeOpportunities: 3
      };

      vibeDetector.updateConfig(newConfig);

      const updatedConfig = vibeDetector.getConfig();
      expect(updatedConfig.confidenceThreshold).toBe(0.8);
      expect(updatedConfig.practiceReadinessThreshold).toBe(0.9);
      expect(updatedConfig.minMessagesForDetection).toBe(5);
      expect(updatedConfig.contextWindow).toBe(20);
      expect(updatedConfig.maxPracticeOpportunities).toBe(3);
    });

    it('should use custom configuration for single detection', async () => {
      const request: VibeDetectionRequest = {
        conversationHistory: [
          { role: 'user', content: 'I understand this', timestamp: Date.now() }
        ],
        userContext: {
          confidenceLevel: 0.7,
          learningVelocity: 1.0,
          stuckPoints: [],
          recentConcepts: []
        },
        currentTopic: 'Test',
        config: {
          confidenceThreshold: 0.9, // Higher threshold
          practiceReadinessThreshold: 0.85,
          minMessagesForDetection: 2, // Lower minimum
          contextWindow: 10
        }
      };

      const result = await vibeDetector.detectVibe(request);

      expect(result.confidence).toBeGreaterThanOrEqual(0.9); // Should meet higher threshold
      expect(result.reasoning).toBeDefined();
    });
  });

  describe('Combined AI and Pattern Detection', () => {
    it('should increase confidence when AI and patterns agree', async () => {
      // Mock model to agree with patterns
      const agreeableModel = {
        invoke: vi.fn().mockResolvedValue({
          content: JSON.stringify({
            vibe: 'understanding',
            confidence: 0.75,
            reasoning: 'User shows understanding',
            practiceReadiness: 0.7,
            suggestedTopics: ['React hooks'],
            detectedFrom: ['ai_analysis'],
            keyIndicators: ['positive language']
          })
        })
      } as any;

      const agreeableDetector = new VibeDetector(agreeableModel);

      const request: VibeDetectionRequest = {
        conversationHistory: [
          { role: 'user', content: 'I understand React hooks', timestamp: Date.now() },
          { role: 'user', content: 'Got it, makes sense', timestamp: Date.now() },
          { role: 'user', content: 'I see what you mean', timestamp: Date.now() }
        ],
        userContext: {
          confidenceLevel: 0.8,
          learningVelocity: 1.2,
          stuckPoints: [],
          recentConcepts: []
        },
        currentTopic: 'React hooks'
      };

      const result = await agreeableDetector.detectVibe(request);

      expect(result.vibe).toBe('understanding');
      expect(result.confidence).toBeGreaterThan(0.8); // Should be boosted from agreement
      expect(result.reasoning).toContain('validated by pattern analysis');
      expect(result.detectedFrom).toContain('pattern_validation');
    });

    it('should handle disagreement between AI and patterns', async () => {
      // Mock model to disagree with patterns
      const disagreeableModel = {
        invoke: vi.fn().mockResolvedValue({
          content: JSON.stringify({
            vibe: 'confused',
            confidence: 0.6,
            reasoning: 'User shows confusion',
            practiceReadiness: 0.4,
            suggestedTopics: ['React hooks'],
            detectedFrom: ['ai_analysis'],
            keyIndicators: ['negative indicators']
          })
        })
      } as any;

      const disagreeableDetector = new VibeDetector(disagreeableModel);

      const request: VibeDetectionRequest = {
        conversationHistory: [
          { role: 'user', content: 'I understand React hooks', timestamp: Date.now() },
          { role: 'user', content: 'Got it, makes perfect sense', timestamp: Date.now() },
          { role: 'user', content: 'I totally get it now', timestamp: Date.now() }
        ],
        userContext: {
          confidenceLevel: 0.8,
          learningVelocity: 1.2,
          stuckPoints: [],
          recentConcepts: []
        },
        currentTopic: 'React hooks'
      };

      const result = await disagreeableDetector.detectVibe(request);

      // Should favor AI due to higher confidence
      expect(result.confidence).toBeGreaterThan(0.5); // Weighted average
      expect(result.reasoning).toContain('AI detected confused');
      expect(result.reasoning).toContain('patterns detected understanding');
    });
  });

  describe('Performance and Timing', () => {
    it('should complete detection within reasonable time', async () => {
      const request: VibeDetectionRequest = {
        conversationHistory: Array.from({ length: 20 }, (_, i) => ({
          role: 'user',
          content: `Message ${i} with various content about React hooks and useState`,
          timestamp: Date.now() - (20 - i) * 60000
        })),
        userContext: {
          confidenceLevel: 0.7,
          learningVelocity: 1.1,
          stuckPoints: ['previous concept'],
          recentConcepts: [
            { concept: 'useState', confidence: 0.8 }
          ]
        },
        currentTopic: 'React hooks'
      };

      const startTime = Date.now();
      const result = await vibeDetector.detectVibe(request);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should complete in <2 seconds
      expect(result.vibe).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle large conversation histories efficiently', async () => {
      const request: VibeDetectionRequest = {
        conversationHistory: Array.from({ length: 100 }, (_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Long message ${i} with extensive discussion about React hooks, patterns, useState, useEffect, and various implementation details`,
          timestamp: Date.now() - (100 - i) * 60000
        })),
        userContext: {
          confidenceLevel: 0.75,
          learningVelocity: 1.3,
          stuckPoints: ['complex topic'],
          recentConcepts: Array.from({ length: 10 }, (_, i) => ({
            concept: `concept${i}`,
            confidence: 0.5 + Math.random() * 0.4
          }))
        },
        currentTopic: 'Advanced React patterns'
      };

      const startTime = Date.now();
      const result = await vibeDetector.detectVibe(request);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(3000); // Should handle large histories efficiently
      expect(result.vibe).toBeDefined();
      expect(result.suggestedTopics.length).toBeGreaterThan(0);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should detect mixed conversation with confusion then understanding', async () => {
      const request: VibeDetectionRequest = {
        conversationHistory: [
          { role: 'user', content: "I don't understand React hooks", timestamp: Date.now() - 300000 },
          { role: 'assistant', content: "Let me explain hooks in a different way", timestamp: Date.now() - 240000 },
          { role: 'user', content: "Oh, I see now! That makes sense", timestamp: Date.now() - 180000 },
          { role: 'user', content: "I understand how useState maintains state", timestamp: Date.now() - 120000 },
          { role: 'user', content: "Got it, ready to practice", timestamp: Date.now() - 60000 }
        ],
        userContext: {
          confidenceLevel: 0.6,
          learningVelocity: 1.1,
          stuckPoints: ['React hooks'],
          recentConcepts: [
            { concept: 'useState', confidence: 0.8 }
          ]
        },
        currentTopic: 'React hooks'
      };

      const result = await vibeDetector.detectVibe(request);

      // Should focus on recent understanding despite earlier confusion
      expect(result.vibe).toBe('understanding');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.practiceReadiness).toBeGreaterThan(0.6);
      expect(result.reasoning).toContain('pattern analysis');
    });

    it('should detect breakthrough after period of confusion', async () => {
      const request: VibeDetectionRequest = {
        conversationHistory: [
          { role: 'user', content: "I'm stuck on useEffect", timestamp: Date.now() - 240000 },
          { role: 'user', content: "This doesn't make sense to me", timestamp: Date.now() - 180000 },
          { role: 'user', content: "Can you explain dependency arrays?", timestamp: Date.now() - 120000 },
          { role: 'user', content: "Aha! I think I get it now!", timestamp: Date.now() - 60000 },
          { role: 'user', content: "Breakthrough! The dependency makes sense", timestamp: Date.now() - 30000 }
        ],
        userContext: {
          confidenceLevel: 0.4,
          learningVelocity: 0.7,
          stuckPoints: ['useEffect', 'dependency array'],
          recentConcepts: []
        },
        currentTopic: 'useEffect'
      };

      const result = await vibeDetector.detectVibe(request);

      expect(result.vibe).toBe('breakthrough');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.practiceReadiness).toBeGreaterThan(0.8);
      expect(result.keyIndicators).toContain('excitement');
    });

    it('should handle scenario with multiple topics', async () => {
      const request: VibeDetectionRequest = {
        conversationHistory: [
          { role: 'user', content: "I'm learning React hooks, but I also want to understand TypeScript generics", timestamp: Date.now() - 180000 },
          { role: 'user', content: "How do I combine useState with proper typing?", timestamp: Date.now() - 120000 },
          { role: 'user', content: "I understand the hooks part, but generics are confusing", timestamp: Date.now() - 60000 }
        ],
        userContext: {
          confidenceLevel: 0.7,
          learningVelocity: 1.0,
          stuckPoints: ['TypeScript generics'],
          recentConcepts: [
            { concept: 'useState', confidence: 0.9 },
            { concept: 'generics', confidence: 0.4 }
          ]
        },
        currentTopic: 'TypeScript generics'
      };

      const result = await vibeDetector.detectVibe(request);

      expect(result.vibe).toBe('confused');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.suggestedTopics).toContain('typescript');
      expect(result.suggestedTopics).toContain('react');
      expect(result.suggestedTopics).toContain('generics');
    });
  });
});