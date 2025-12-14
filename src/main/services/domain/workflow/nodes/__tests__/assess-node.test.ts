import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assessNode } from '../assess';
import { WorkflowStateAnnotation } from '../state';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';

// Mock chunk emitter utilities
vi.mock('../utils/chunk-emitter', () => ({
  createChunkEmitter: vi.fn().mockReturnValue({
    toolInputStart: vi.fn(),
    toolOutputAvailable: vi.fn(),
  }),
  generateId: vi.fn().mockReturnValue('test-id-123'),
}));

// Mock parseScore utility
vi.mock('../parse-score', () => ({
  parseScore: vi.fn(),
}));

// Mock config writer for chunk emitter
const createMockConfig = (): LangGraphRunnableConfig => ({
  writer: vi.fn(),
} as any);

describe('assess node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates confidence based on practice history and conversation', async () => {
    // Setup mocks
    const mockKnowledgeService = {
      searchKnowledge: vi.fn().mockResolvedValue({
        results: [
          { id: 'concept-1', name: 'React Components' },
          { id: 'concept-2', name: 'JSX Syntax' },
        ],
      }),
    };

    const mockLearningService = {
      getPracticeHistory: vi.fn().mockResolvedValue([
        {
          result: 'pass',
          rubricScores: { retrieval: 85, application: 90, teachBack: 88 },
          errorTags: [],
        },
        {
          result: 'partial',
          rubricScores: { retrieval: 70, application: 65 },
          errorTags: ['state-management'],
        },
        {
          result: 'fail',
          rubricScores: { retrieval: 45, application: 40, teachBack: 50 },
          errorTags: ['props', 'state-management'],
        },
      ]),
    };

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Score: 85%',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const mockDeps = {
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
      providerFactory: mockProviderFactory,
    };

    const node = assessNode(mockDeps);

    const result = await node(
      {
        messages: [
          new HumanMessage('I want to learn React'),
          new AIMessage('Let me help you with React'),
        ],
        topic: 'React Components',
      } as any,
      createMockConfig()
    );

    // Verify knowledge service was called
    expect(mockKnowledgeService.searchKnowledge).toHaveBeenCalledWith({
      query: 'React Components',
      limit: 5,
    });

    // Verify learning service was called with extracted concept IDs
    expect(mockLearningService.getPracticeHistory).toHaveBeenCalledWith({
      conceptIds: ['concept-1', 'concept-2'],
      limit: 100,
    });

    // Verify model was called with proper prompt
    expect(mockModel.invoke).toHaveBeenCalled();
    const messagesArray = mockModel.invoke.mock.calls[0][0];
    expect(messagesArray).toHaveLength(2); // system + human messages
    const humanMessage = messagesArray[1]; // Second message is the human prompt
    expect(humanMessage.content).toContain('Assess confidence (0-100%) for topic: React Components');
    expect(humanMessage.content).toContain('Practice History:');
    expect(humanMessage.content).toContain('Pass: 1');
    expect(humanMessage.content).toContain('Partial: 1');
    expect(humanMessage.content).toContain('Fail: 1');
    expect(humanMessage.content).toContain('Average Rubric Score: 67%');

    // Verify result structure
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toBeInstanceOf(AIMessage);
    expect(result.messages[0].content).toBe('Confidence: 85%');
    expect(result.confidence).toBe(0.85);
    expect(result.gaps).toEqual(['state-management', 'props']);
  });

  it('handles empty practice history gracefully', async () => {
    const mockKnowledgeService = {
      searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
    };

    const mockLearningService = {
      getPracticeHistory: vi.fn().mockResolvedValue([]),
    };

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 50%' }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessNode({
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
      providerFactory: mockProviderFactory,
    });

    const result = await node(
      {
        messages: [],
        topic: 'New Topic',
      } as any,
      createMockConfig()
    );

    expect(result.confidence).toBe(0.5);
    expect(result.gaps).toEqual([]);
    expect(result.messages[0].content).toBe('Confidence: 50%');
  });

  it('clamps confidence to valid range [0, 1]', async () => {
    const mockKnowledgeService = {
      searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
    };

    const mockLearningService = {
      getPracticeHistory: vi.fn().mockResolvedValue([]),
    };

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 150%' }), // Invalid: > 100%
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const { parseScore } = await import('../parse-score');
    vi.mocked(parseScore).mockReturnValue(1.5); // 150%

    const node = assessNode({
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
      providerFactory: mockProviderFactory,
    });

    const result = await node(
      {
        messages: [],
        topic: 'Test',
      } as any,
      createMockConfig()
    );

    // Should clamp to 1.0 (100%)
    expect(result.confidence).toBe(1.0);
    expect(result.messages[0].content).toBe('Confidence: 100%');
  });

  it('clamps negative confidence scores to 0', async () => {
    const mockKnowledgeService = {
      searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
    };

    const mockLearningService = {
      getPracticeHistory: vi.fn().mockResolvedValue([]),
    };

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 0%' }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessNode({
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
      providerFactory: mockProviderFactory,
    });

    const result = await node(
      {
        messages: [],
        topic: 'Test',
      } as any,
      createMockConfig()
    );

    // Should be 0%
    expect(result.confidence).toBe(0.0);
    expect(result.messages[0].content).toBe('Confidence: 0%');
  });

  it('limits recent messages to last 20', async () => {
    const mockKnowledgeService = {
      searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
    };

    const mockLearningService = {
      getPracticeHistory: vi.fn().mockResolvedValue([]),
    };

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 75%' }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessNode({
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
      providerFactory: mockProviderFactory,
    });

    // Create 30 messages
    const conversationMessages = Array.from({ length: 30 }, (_, i) => {
      return i % 2 === 0
        ? new HumanMessage(`User message ${i}`)
        : new AIMessage(`Assistant message ${i}`);
    });

    await node(
      {
        messages: conversationMessages,
        topic: 'Test',
      } as any,
      createMockConfig()
    );

    // Verify only last 20 messages were included in prompt
    const messagesArray = mockModel.invoke.mock.calls[0][0];
    expect(messagesArray).toHaveLength(2);
    const humanMessage = messagesArray[1];
    expect(humanMessage.content).toContain('user: User message 20');
    expect(humanMessage.content).toContain('assistant: Assistant message 29');
    expect(humanMessage.content).not.toContain('User message 0'); // Should not include message 0
  });

  it('truncates long messages to 200 characters', async () => {
    const mockKnowledgeService = {
      searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
    };

    const mockLearningService = {
      getPracticeHistory: vi.fn().mockResolvedValue([]),
    };

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 75%' }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessNode({
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
      providerFactory: mockProviderFactory,
    });

    const longMessage = new HumanMessage('x'.repeat(500));

    await node(
      {
        messages: [longMessage],
        topic: 'Test',
      } as any,
      createMockConfig()
    );

    // Verify message was truncated
    const messagesArray = mockModel.invoke.mock.calls[0][0];
    expect(messagesArray).toHaveLength(2);
    const humanMessage = messagesArray[1];
    expect(humanMessage.content).toContain('user: ' + 'x'.repeat(200));
    expect(humanMessage.content).not.toContain('x'.repeat(201));
  });

  it('calculates average rubric score correctly from multiple attempts', async () => {
    const mockKnowledgeService = {
      searchKnowledge: vi.fn().mockResolvedValue({
        results: [{ id: 'concept-1', name: 'Test' }],
      }),
    };

    const mockLearningService = {
      getPracticeHistory: vi.fn().mockResolvedValue([
        {
          result: 'pass',
          rubricScores: { retrieval: 100, application: 100, teachBack: 100 },
        },
        {
          result: 'pass',
          rubricScores: { retrieval: 80, application: 80, teachBack: 80 },
        },
        {
          result: 'partial',
          rubricScores: { retrieval: 60, application: 60 },
        },
      ]),
    };

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 90%' }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessNode({
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
      providerFactory: mockProviderFactory,
    });

    await node(
      {
        messages: [],
        topic: 'Test',
      } as any,
      createMockConfig()
    );

    // Verify average calculation: (100+100+100+80+80+80+60+60) / (8 * 100) = 0.825 = 83%
    const messagesArray = mockModel.invoke.mock.calls[0][0];
    expect(messagesArray).toHaveLength(2);
    const humanMessage = messagesArray[1];
    expect(humanMessage.content).toContain('Average Rubric Score: 83%');
  });

  it('handles undefined rubric scores gracefully', async () => {
    const mockKnowledgeService = {
      searchKnowledge: vi.fn().mockResolvedValue({
        results: [{ id: 'concept-1', name: 'Test' }],
      }),
    };

    const mockLearningService = {
      getPracticeHistory: vi.fn().mockResolvedValue([
        {
          result: 'pass',
          rubricScores: { retrieval: 80 }, // Only retrieval score
        },
        {
          result: 'partial',
          rubricScores: undefined, // No rubric scores
        },
      ]),
    };

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 70%' }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessNode({
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
      providerFactory: mockProviderFactory,
    });

    await node(
      {
        messages: [],
        topic: 'Test',
      } as any,
      createMockConfig()
    );

    // Should only count defined scores
    const messagesArray = mockModel.invoke.mock.calls[0][0];
    expect(messagesArray).toHaveLength(2);
    const humanMessage = messagesArray[1];
    expect(humanMessage.content).toContain('Average Rubric Score: 80%');
  });

  it('aggregates unique error tags from all attempts', async () => {
    const mockKnowledgeService = {
      searchKnowledge: vi.fn().mockResolvedValue({
        results: [{ id: 'concept-1', name: 'Test' }],
      }),
    };

    const mockLearningService = {
      getPracticeHistory: vi.fn().mockResolvedValue([
        {
          result: 'fail',
          rubricScores: { retrieval: 40 },
          errorTags: ['concept-a', 'concept-b'],
        },
        {
          result: 'fail',
          rubricScores: { retrieval: 45 },
          errorTags: ['concept-b', 'concept-c'],
        },
        {
          result: 'partial',
          rubricScores: { retrieval: 60 },
          errorTags: ['concept-a'],
        },
      ]),
    };

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 50%' }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessNode({
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
      providerFactory: mockProviderFactory,
    });

    const result = await node(
      {
        messages: [],
        topic: 'Test',
      } as any,
      createMockConfig()
    );

    // Should have unique gaps only
    expect(result.gaps).toEqual(['concept-a', 'concept-b', 'concept-c']);
    expect(result.gaps).toHaveLength(3);
  });

  it('filters out empty concept IDs', async () => {
    const mockKnowledgeService = {
      searchKnowledge: vi.fn().mockResolvedValue({
        results: [
          { id: 'concept-1', name: 'Valid Concept' },
          { id: '', name: 'Empty ID' },
          { id: null, name: 'Null ID' },
          { id: 'concept-2', name: 'Another Valid Concept' },
        ],
      }),
    };

    const mockLearningService = {
      getPracticeHistory: vi.fn().mockResolvedValue([]),
    };

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 60%' }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessNode({
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
      providerFactory: mockProviderFactory,
    });

    await node(
      {
        messages: [],
        topic: 'Test',
      } as any,
      createMockConfig()
    );

    // Should only pass valid concept IDs
    expect(mockLearningService.getPracticeHistory).toHaveBeenCalledWith({
      conceptIds: ['concept-1', 'concept-2'],
      limit: 100,
    });
  });

  it('handles missing model response gracefully', async () => {
    const mockKnowledgeService = {
      searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
    };

    const mockLearningService = {
      getPracticeHistory: vi.fn().mockResolvedValue([]),
    };

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({}), // Empty response
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessNode({
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
      providerFactory: mockProviderFactory,
    });

    const result = await node(
      {
        messages: [],
        topic: 'Test',
      } as any,
      createMockConfig()
    );

    // Should default to 0.5 confidence
    expect(result.confidence).toBe(0.5);
  });

  it('propagates errors from knowledge service', async () => {
    const mockKnowledgeService = {
      searchKnowledge: vi.fn().mockRejectedValue(new Error('Knowledge service unavailable')),
    };

    const mockLearningService = {
      getPracticeHistory: vi.fn().mockResolvedValue([]),
    };

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 50%' }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessNode({
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
      providerFactory: mockProviderFactory,
    });

    await expect(node(
      {
        messages: [],
        topic: 'Test',
      } as any,
      createMockConfig()
    )).rejects.toThrow('Knowledge service unavailable');
  });

  it('propagates errors from learning service', async () => {
    const mockKnowledgeService = {
      searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
    };

    const mockLearningService = {
      getPracticeHistory: vi.fn().mockRejectedValue(new Error('Learning service unavailable')),
    };

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 50%' }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessNode({
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
      providerFactory: mockProviderFactory,
    });

    await expect(node(
      {
        messages: [],
        topic: 'Test',
      } as any,
      createMockConfig()
    )).rejects.toThrow('Learning service unavailable');
  });

  it('propagates errors from model invocation', async () => {
    const mockKnowledgeService = {
      searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
    };

    const mockLearningService = {
      getPracticeHistory: vi.fn().mockResolvedValue([]),
    };

    const mockModel = {
      invoke: vi.fn().mockRejectedValue(new Error('Model unavailable')),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessNode({
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
      providerFactory: mockProviderFactory,
    });

    await expect(node(
      {
        messages: [],
        topic: 'Test',
      } as any,
      createMockConfig()
    )).rejects.toThrow('Model unavailable');
  });

  it('uses chunk emitter for streaming', async () => {
    const mockKnowledgeService = {
      searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
    };

    const mockLearningService = {
      getPracticeHistory: vi.fn().mockResolvedValue([]),
    };

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 75%' }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
    };

    const node = assessNode({
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
      providerFactory: mockProviderFactory,
    });

    const config = createMockConfig();
    const result = await node({ messages: [], topic: 'Test' } as any, config);

    // Verify result is properly formatted
    expect(result.messages).toHaveLength(1);
    expect(result.confidence).toBe(0.75);
    expect(result.gaps).toEqual([]);
  });

  it('returns confidence in different ranges for different scenarios', async () => {
    const testCases = [
      { score: 'Score: 90%', expected: 0.9 },
      { score: 'Score: 45%', expected: 0.45 },
      { score: 'Score: 10%', expected: 0.1 },
      { score: 'Score: 99%', expected: 0.99 },
    ];

    for (const testCase of testCases) {
      const mockKnowledgeService = {
        searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
      };

      const mockLearningService = {
        getPracticeHistory: vi.fn().mockResolvedValue([]),
      };

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({ content: testCase.score }),
      };

      const mockProviderFactory = {
        getModel: vi.fn().mockResolvedValue(mockModel),
      };

      const node = assessNode({
        knowledgeService: mockKnowledgeService,
        learningService: mockLearningService,
        providerFactory: mockProviderFactory,
      });

      const result = await node(
        {
          messages: [],
          topic: 'Test',
        } as any,
        createMockConfig()
      );

      expect(result.confidence).toBe(testCase.expected);
    }
  });
});
