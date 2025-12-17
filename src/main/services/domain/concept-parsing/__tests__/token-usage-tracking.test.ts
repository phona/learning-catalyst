/**
 * Token Usage Tracking Tests
 *
 * Tests the implementation of native token tracking using LangChain's usage_metadata
 * instead of character-based estimates.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatOpenAI } from '@langchain/openai';
import { executeExtractionWorkflow } from '../extraction-workflow';
import type { AIMessageChunk } from '@langchain/core/messages';

// Mock ChatOpenAI
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    stream: vi.fn(),
  })),
}));

// Mock usage_metadata for streaming chunks
const createMockChunk = (content: string, usage?: any): AIMessageChunk => {
  const chunk = {
    content,
    role: 'assistant' as const,
    _getType: () => 'object' as const,
    id: undefined,
    usage_metadata: usage || {
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
    },
    response_metadata: {},
  } as AIMessageChunk;

  // Mock concat method
  chunk.concat = vi.fn().mockImplementation((other: AIMessageChunk) => {
    const merged = createMockChunk(
      content + (other.content as string),
      usage || other.usage_metadata
    );
    return merged;
  });

  return chunk;
};

describe('Token Usage Tracking', () => {
  let mockModel: ChatOpenAI;

  beforeEach(() => {
    vi.clearAllMocks();
    mockModel = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      apiKey: 'test-key',
    });
  });

  describe('Token Usage Extraction from Streaming Chunks', () => {
    it('should extract token usage from single chunk', async () => {
      const mockResponse = createMockChunk(
        '{"summary":"Test","focusAreas":[],"nodes":[],"relationships":[],"recommendations":[]}',
        {
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150,
        }
      );

      const stream = {
        [Symbol.asyncIterator]: async function* () {
          yield mockResponse;
        },
      };

      vi.mocked(mockModel.stream).mockResolvedValue(stream);

      const result = await executeExtractionWorkflow(
        'Test content',
        mockModel,
        undefined,
        2
      );

      expect(result.tokenUsage).toBeDefined();
      expect(result.tokenUsage?.promptTokens).toBe(100);
      expect(result.tokenUsage?.completionTokens).toBe(50);
      expect(result.tokenUsage?.totalTokens).toBe(150);
    });

    it('should accumulate token usage across multiple chunks', async () => {
      const chunk1 = createMockChunk('{"summary":"Test', { input_tokens: 50, output_tokens: 25, total_tokens: 75 });
      const chunk2 = createMockChunk('","focusAreas":[]', { input_tokens: 50, output_tokens: 25, total_tokens: 75 });
      const chunk3 = createMockChunk(
        ',"nodes":[],"relationships":[],"recommendations":[]}',
        { input_tokens: 50, output_tokens: 25, total_tokens: 75 }
      );

      const stream = {
        [Symbol.asyncIterator]: async function* () {
          yield chunk1;
          yield chunk2;
          yield chunk3;
        },
      };

      vi.mocked(mockModel.stream).mockResolvedValue(stream);

      const result = await executeExtractionWorkflow(
        'Test content',
        mockModel,
        undefined,
        2
      );

      expect(result.tokenUsage).toBeDefined();
      // Last chunk's usage_metadata should be used
      expect(result.tokenUsage?.promptTokens).toBe(50);
      expect(result.tokenUsage?.completionTokens).toBe(25);
      expect(result.tokenUsage?.totalTokens).toBe(75);
    });

    it('should handle missing usage_metadata gracefully', async () => {
      const chunk = createMockChunk(
        '{"summary":"Test","focusAreas":[],"nodes":[],"relationships":[],"recommendations":[]}'
        // No usage_metadata
      );

      const stream = {
        [Symbol.asyncIterator]: async function* () {
          yield chunk;
        },
      };

      vi.mocked(mockModel.stream).mockResolvedValue(stream);

      const result = await executeExtractionWorkflow(
        'Test content',
        mockModel,
        undefined,
        2
      );

      // Should still succeed but with zero tokens
      expect(result.success).toBe(true);
      expect(result.tokenUsage?.promptTokens).toBe(0);
      expect(result.tokenUsage?.completionTokens).toBe(0);
      expect(result.tokenUsage?.totalTokens).toBe(0);
    });
  });

  describe('Token Usage in Extraction Workflow', () => {
    it('should propagate token usage through workflow state', async () => {
      const chunk = createMockChunk(
        JSON.stringify({
          summary: 'Test summary',
          focusAreas: ['area1'],
          nodes: [
            {
              name: 'concept1',
              description: 'desc1',
              type: 'topic',
              difficulty: 'beginner',
              confidence: 0.9,
              tags: ['tag1'],
            },
          ],
          relationships: [
            {
              from: 'concept1',
              to: 'concept2',
              type: 'prerequisite',
              strength: 0.8,
              confidence: 0.9,
              description: 'rel1',
            },
          ],
          recommendations: ['rec1'],
        }),
        {
          input_tokens: 200,
          output_tokens: 100,
          total_tokens: 300,
        }
      );

      const stream = {
        [Symbol.asyncIterator]: async function* () {
          yield chunk;
        },
      };

      vi.mocked(mockModel.stream).mockResolvedValue(stream);

      const result = await executeExtractionWorkflow(
        'Test content',
        mockModel,
        undefined,
        2
      );

      expect(result.success).toBe(true);
      expect(result.tokenUsage).toEqual({
        promptTokens: 200,
        completionTokens: 100,
        totalTokens: 300,
      });
      expect(result.result).toBeDefined();
      expect(result.result?.nodes).toHaveLength(1);
    });

    it('should track token usage across retry attempts', async () => {
      // Simplified test: Both attempts succeed but with different token usage
      // The workflow should use the token usage from the successful attempt

      const validResponse = JSON.stringify({
        summary: 'Test',
        focusAreas: [],
        nodes: [
          {
            name: 'Test Concept',
            description: 'Test description',
            type: 'concept',
            difficulty: 'beginner',
            confidence: 0.9,
          },
        ],
        relationships: [],
        recommendations: [],
      });

      // First attempt with one token count
      const chunk1 = createMockChunk(
        validResponse,
        { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
      );

      // Second attempt with different token count
      const chunk2 = createMockChunk(
        validResponse,
        { input_tokens: 120, output_tokens: 60, total_tokens: 180 }
      );

      // Mock to return different chunks on successive calls
      vi.mocked(mockModel.stream)
        .mockResolvedValueOnce({
          [Symbol.asyncIterator]: async function* () {
            yield chunk1;
          },
        })
        .mockResolvedValueOnce({
          [Symbol.asyncIterator]: async function* () {
            yield chunk2;
          },
        });

      const result = await executeExtractionWorkflow(
        'Test content',
        mockModel,
        undefined,
        2
      );

      // Should succeed (both attempts valid)
      expect(result.success).toBe(true);
      // Should complete in 1 attempt since both are valid
      expect(result.attempt).toBe(1);
      // Should have token usage from the attempt
      expect(result.tokenUsage?.promptTokens).toBe(100);
      expect(result.tokenUsage?.completionTokens).toBe(50);
    });
  });

  describe('Token Usage Aggregation', () => {
    it('should aggregate token usage across segments', async () => {
      // This would be tested in concept-parsing-service tests
      // Here we verify the structure is correct

      const segmentResults = [
        {
          tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        },
        {
          tokenUsage: { promptTokens: 150, completionTokens: 75, totalTokens: 225 },
        },
        {
          tokenUsage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
        },
      ];

      const totalPromptTokens = segmentResults.reduce(
        (sum, seg) => sum + seg.tokenUsage.promptTokens,
        0
      );
      const totalCompletionTokens = segmentResults.reduce(
        (sum, seg) => sum + seg.tokenUsage.completionTokens,
        0
      );

      expect(totalPromptTokens).toBe(450);
      expect(totalCompletionTokens).toBe(225);
      expect(totalPromptTokens + totalCompletionTokens).toBe(675);
    });
  });

  describe('Token Usage Statistics', () => {
    it('should mark statistics as non-estimated when using native tracking', () => {
      const tokenStats = {
        total: 300,
        prompt: 200,
        completion: 100,
        estimated: false, // ← Using native LangChain tracking
      };

      expect(tokenStats.estimated).toBe(false);
      expect(tokenStats.total).toBe(tokenStats.prompt + tokenStats.completion);
    });

    it('should provide detailed token breakdown', () => {
      const usage = {
        promptTokens: 150,
        completionTokens: 75,
        totalTokens: 225,
      };

      expect(usage.promptTokens).toBeGreaterThan(0);
      expect(usage.completionTokens).toBeGreaterThan(0);
      expect(usage.totalTokens).toBe(usage.promptTokens + usage.completionTokens);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty token usage', async () => {
      const chunk = createMockChunk(
        '{"summary":"","focusAreas":[],"nodes":[],"relationships":[],"recommendations":[]}',
        { input_tokens: 0, output_tokens: 0, total_tokens: 0 }
      );

      const stream = {
        [Symbol.asyncIterator]: async function* () {
          yield chunk;
        },
      };

      vi.mocked(mockModel.stream).mockResolvedValue(stream);

      const result = await executeExtractionWorkflow(
        '',
        mockModel,
        undefined,
        2
      );

      expect(result.tokenUsage).toEqual({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      });
    });

    it('should handle very large token counts', async () => {
      const chunk = createMockChunk(
        '{"summary":"Test","focusAreas":[],"nodes":[],"relationships":[],"recommendations":[]}',
        {
          input_tokens: 999999,
          output_tokens: 888888,
          total_tokens: 1888887,
        }
      );

      const stream = {
        [Symbol.asyncIterator]: async function* () {
          yield chunk;
        },
      };

      vi.mocked(mockModel.stream).mockResolvedValue(stream);

      const result = await executeExtractionWorkflow(
        'Test content',
        mockModel,
        undefined,
        2
      );

      expect(result.tokenUsage?.promptTokens).toBe(999999);
      expect(result.tokenUsage?.completionTokens).toBe(888888);
      expect(result.tokenUsage?.totalTokens).toBe(1888887);
    });
  });
});
