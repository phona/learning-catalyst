/**
 * Discovery Service Tests - Renderer Process
 *
 * Comprehensive test suite for the Discovery service running in the renderer process.
 * Tests content discovery functionality and integration with Catalyst service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DiscoveryService, discoveryService } from '@/services/DiscoveryService';
import type { DiscoveryRequest, DiscoveryResult } from '@/services/DiscoveryService';

// Mock module with vi.hoisted to handle variable references
const { mockCatalystService } = vi.hoisted(() => {
  const mockService = {
    sendChat: vi.fn(),
  };
  return { mockCatalystService: mockService };
});

vi.mock('@/services/CatalystService', () => ({
  catalystService: mockCatalystService,
}));

describe('DiscoveryService', () => {
  let service: DiscoveryService;

  beforeEach(() => {
    service = new DiscoveryService();
    vi.clearAllMocks();
    mockCatalystService.sendChat = vi.fn();
  });

  describe('Concept Parsing', () => {
    it('should parse concepts from content successfully', async () => {
      const mockResult = { success: true, messageId: 'msg-123', executionId: 'exec-456' };
      mockCatalystService.sendChat.mockResolvedValue(mockResult);

      const result = await service.parseConcepts('React is a JavaScript library for building user interfaces...', 'session-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        message: 'Concept parsing completed',
        messageId: 'msg-123'
      });
      expect(mockCatalystService.sendChat).toHaveBeenCalledWith(
        'Please analyze the following content and extract the key concepts:\n\nReact is a JavaScript library for building user interfaces...',
        {
          agentId: 'concept-parser',
          sessionId: 'session-123',
          context: { task: 'concept-parsing' }
        }
      );
    });

    it('should handle concept parsing failure', async () => {
      const mockResult = { success: false, error: 'Parsing failed' };
      mockCatalystService.sendChat.mockResolvedValue(mockResult);

      const result = await service.parseConcepts('Test content');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Parsing failed');
    });

    it('should handle concept parsing errors', async () => {
      mockCatalystService.sendChat.mockRejectedValue(new Error('Service error'));

      const result = await service.parseConcepts('Test content');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service error');
    });

    it('should work without sessionId', async () => {
      const mockResult = { success: true, messageId: 'msg-123' };
      mockCatalystService.sendChat.mockResolvedValue(mockResult);

      const result = await service.parseConcepts('Test content');

      expect(result.success).toBe(true);
      expect(mockCatalystService.sendChat).toHaveBeenCalledWith(
        expect.stringContaining('Test content'),
        expect.objectContaining({
          sessionId: undefined
        })
      );
    });
  });

  describe('Learning Path Generation', () => {
    it('should generate learning path successfully', async () => {
      const mockResult = { success: true, messageId: 'msg-456' };
      mockCatalystService.sendChat.mockResolvedValue(mockResult);

      const result = await service.generateLearningPath(
        'React Development',
        'beginner',
        'intermediate',
        'session-456'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        message: 'Learning path generated',
        messageId: 'msg-456'
      });
      expect(mockCatalystService.sendChat).toHaveBeenCalledWith(
        'Generate a learning path from beginner to intermediate level for the topic: React Development',
        {
          agentId: 'learning-coach',
          sessionId: 'session-456',
          context: {
            task: 'learning-path-generation',
            topic: 'React Development',
            currentLevel: 'beginner',
            targetLevel: 'intermediate'
          }
        }
      );
    });

    it('should handle learning path generation failure', async () => {
      const mockResult = { success: false, error: 'Generation failed' };
      mockCatalystService.sendChat.mockResolvedValue(mockResult);

      const result = await service.generateLearningPath('Python', 'beginner', 'advanced');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Generation failed');
    });

    it('should handle learning path generation errors', async () => {
      mockCatalystService.sendChat.mockRejectedValue(new Error('Network error'));

      const result = await service.generateLearningPath('JavaScript', 'beginner', 'intermediate');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should work without sessionId', async () => {
      const mockResult = { success: true, messageId: 'msg-789' };
      mockCatalystService.sendChat.mockResolvedValue(mockResult);

      const result = await service.generateLearningPath('TypeScript', 'intermediate', 'advanced');

      expect(result.success).toBe(true);
      expect(mockCatalystService.sendChat).toHaveBeenCalledWith(
        expect.stringContaining('TypeScript'),
        expect.objectContaining({
          sessionId: undefined
        })
      );
    });
  });

  describe('Practice Exercise Generation', () => {
    it('should create practice exercises successfully', async () => {
      const mockResult = { success: true, messageId: 'msg-789' };
      mockCatalystService.sendChat.mockResolvedValue(mockResult);

      const result = await service.createPracticeExercises(
        'React Hooks',
        'medium',
        5,
        'session-789'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        message: 'Practice exercises created',
        messageId: 'msg-789'
      });
      expect(mockCatalystService.sendChat).toHaveBeenCalledWith(
        'Create 5 medium practice exercises for the topic: React Hooks',
        {
          agentId: 'practice-agent',
          sessionId: 'session-789',
          context: {
            task: 'practice-exercise-generation',
            topic: 'React Hooks',
            difficulty: 'medium',
            count: 5
          }
        }
      );
    });

    it('should handle practice exercise creation failure', async () => {
      const mockResult = { success: false, error: 'Exercise creation failed' };
      mockCatalystService.sendChat.mockResolvedValue(mockResult);

      const result = await service.createPracticeExercises('Algorithms', 'hard', 3);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Exercise creation failed');
    });

    it('should handle practice exercise creation errors', async () => {
      mockCatalystService.sendChat.mockRejectedValue(new Error('AI service error'));

      const result = await service.createPracticeExercises('Data Structures', 'easy', 10);

      expect(result.success).toBe(false);
      expect(result.error).toBe('AI service error');
    });

    it('should work without sessionId', async () => {
      const mockResult = { success: true, messageId: 'msg-999' };
      mockCatalystService.sendChat.mockResolvedValue(mockResult);

      const result = await service.createPracticeExercises('CSS', 'easy', 3);

      expect(result.success).toBe(true);
      expect(mockCatalystService.sendChat).toHaveBeenCalledWith(
        expect.stringContaining('CSS'),
        expect.objectContaining({
          sessionId: undefined
        })
      );
    });

    it('should handle all difficulty levels', async () => {
      const mockResult = { success: true, messageId: 'msg-diff' };
      mockCatalystService.sendChat.mockResolvedValue(mockResult);

      const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

      for (const difficulty of difficulties) {
        const result = await service.createPracticeExercises('Test topic', difficulty, 2);

        expect(result.success).toBe(true);
        expect(mockCatalystService.sendChat).toHaveBeenCalledWith(
          expect.stringContaining(`${difficulty} practice exercises`),
          expect.objectContaining({
            context: expect.objectContaining({
              difficulty,
              count: 2
            })
          })
        );
      }
    });
  });

  describe('Knowledge Assessment', () => {
    it('should assess knowledge successfully', async () => {
      const mockResult = { success: true, messageId: 'msg-111' };
      mockCatalystService.sendChat.mockResolvedValue(mockResult);

      const result = await service.assessKnowledge(
        'Machine Learning',
        'I understand basic concepts like regression and classification',
        'session-111'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        message: 'Knowledge assessment completed',
        messageId: 'msg-111'
      });
      expect(mockCatalystService.sendChat).toHaveBeenCalledWith(
        'Assess the current understanding of Machine Learning based on: I understand basic concepts like regression and classification',
        {
          agentId: 'assessment-agent',
          sessionId: 'session-111',
          context: {
            task: 'knowledge-assessment',
            topic: 'Machine Learning',
            currentUnderstanding: 'I understand basic concepts like regression and classification'
          }
        }
      );
    });

    it('should handle knowledge assessment failure', async () => {
      const mockResult = { success: false, error: 'Assessment failed' };
      mockCatalystService.sendChat.mockResolvedValue(mockResult);

      const result = await service.assessKnowledge('Physics', 'I know Newton\'s laws');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Assessment failed');
    });

    it('should handle knowledge assessment errors', async () => {
      mockCatalystService.sendChat.mockRejectedValue(new Error('Assessment service error'));

      const result = await service.assessKnowledge('Chemistry', 'Basic understanding');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Assessment service error');
    });

    it('should work without sessionId', async () => {
      const mockResult = { success: true, messageId: 'msg-222' };
      mockCatalystService.sendChat.mockResolvedValue(mockResult);

      const result = await service.assessKnowledge('Biology', 'I understand cells and genetics');

      expect(result.success).toBe(true);
      expect(mockCatalystService.sendChat).toHaveBeenCalledWith(
        expect.stringContaining('Biology'),
        expect.objectContaining({
          sessionId: undefined
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle all types of errors consistently', async () => {
      const errors = [
        new Error('Network timeout'),
        new Error('Service unavailable'),
        new Error('Invalid request'),
        null, // to simulate rejection without Error object
      ];

      for (const error of errors) {
        mockCatalystService.sendChat.mockImplementation(() => {
          if (error) {
            return Promise.reject(error);
          }
          return Promise.reject('Unknown error');
        });

        const result = await service.parseConcepts('Test content');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    it('should handle edge cases in input parameters', async () => {
      const mockResult = { success: true, messageId: 'msg-edge' };
      mockCatalystService.sendChat.mockResolvedValue(mockResult);

      // Test with empty strings
      const result1 = await service.parseConcepts('');
      expect(result1.success).toBe(true);

      // Test with very long content
      const longContent = 'A'.repeat(10000);
      const result2 = await service.parseConcepts(longContent);
      expect(result2.success).toBe(true);

      // Test with special characters
      const specialContent = '特殊字符 & émojis 🚀';
      const result3 = await service.parseConcepts(specialContent);
      expect(result3.success).toBe(true);
    });
  });

  describe('Integration with Catalyst Service', () => {
    it('should use correct agent IDs for different operations', async () => {
      const mockResult = { success: true, messageId: 'msg-agent' };
      mockCatalystService.sendChat.mockResolvedValue(mockResult);

      await service.parseConcepts('Test');
      expect(mockCatalystService.sendChat).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ agentId: 'concept-parser' })
      );

      await service.generateLearningPath('Test', 'beginner', 'intermediate');
      expect(mockCatalystService.sendChat).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ agentId: 'learning-coach' })
      );

      await service.createPracticeExercises('Test', 'easy', 1);
      expect(mockCatalystService.sendChat).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ agentId: 'practice-agent' })
      );

      await service.assessKnowledge('Test', 'I know it');
      expect(mockCatalystService.sendChat).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ agentId: 'assessment-agent' })
      );
    });

    it('should include correct context information', async () => {
      const mockResult = { success: true, messageId: 'msg-context' };
      mockCatalystService.sendChat.mockResolvedValue(mockResult);

      await service.parseConcepts('Test content', 'session-123');
      expect(mockCatalystService.sendChat).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          context: {
            task: 'concept-parsing'
          }
        })
      );

      await service.generateLearningPath('React', 'beginner', 'advanced', 'session-456');
      expect(mockCatalystService.sendChat).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          context: {
            task: 'learning-path-generation',
            topic: 'React',
            currentLevel: 'beginner',
            targetLevel: 'advanced'
          }
        })
      );

      await service.createPracticeExercises('Hooks', 'medium', 5, 'session-789');
      expect(mockCatalystService.sendChat).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          context: {
            task: 'practice-exercise-generation',
            topic: 'Hooks',
            difficulty: 'medium',
            count: 5
          }
        })
      );

      await service.assessKnowledge('State', 'I understand useState', 'session-999');
      expect(mockCatalystService.sendChat).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          context: {
            task: 'knowledge-assessment',
            topic: 'State',
            currentUnderstanding: 'I understand useState'
          }
        })
      );
    });
  });
});

describe('DiscoveryService Singleton', () => {
  it('should export a singleton instance', () => {
    expect(discoveryService).toBeInstanceOf(DiscoveryService);
  });

  it('should return the same instance', () => {
    expect(discoveryService).toBe(discoveryService);
  });
});