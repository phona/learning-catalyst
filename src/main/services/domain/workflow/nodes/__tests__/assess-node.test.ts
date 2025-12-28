import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assessNode } from '../assess';
import { WorkflowStateAnnotation } from '../../state';
import type { WorkflowDeps, WorkflowState } from '../../state';
import { DEFAULT_PRACTICE_STATE } from '../../subgraphs/practice/types';
import { DEFAULT_TEACH_STATE } from '../../subgraphs/teach/types';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import type { SearchResult } from '@/shared/types/electron-api/knowledge-api';

// Mock chunk emitter utilities
vi.mock('../utils/chunk-emitter', () => ({
  createChunkEmitter: vi.fn().mockReturnValue({
    textStart: vi.fn(),
    textDelta: vi.fn(),
    textEnd: vi.fn(),
    toolInputStart: vi.fn(),
    toolInputAvailable: vi.fn(),
    toolOutputAvailable: vi.fn(),
    reasoningStart: vi.fn(),
    reasoningDelta: vi.fn(),
    reasoningEnd: vi.fn(),
    error: vi.fn(),
    finish: vi.fn(),
    abort: vi.fn(),
  }),
  generateId: vi.fn().mockReturnValue('test-id-123'),
}));

// Helper function to create complete mock logger service
const createMockLoggerService = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  child: vi.fn().mockReturnValue({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      child: vi.fn(),
    }),
  }),
});

// Helper function to create complete mock agent manager
const createMockAgentManager = (overrides = {}) => ({
  runAgent: vi.fn(),
  terminateAgent: vi.fn(),
  isAgentRunning: vi.fn(),
  getAgentState: vi.fn(),
  getAgent: vi.fn(),
  ...overrides,
});

// Helper function to create complete mock config service
const createMockConfigService = (overrides = {}) => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  getAll: vi.fn(),
  has: vi.fn(),
  getConfig: vi.fn(),
  setConfig: vi.fn(),
  getProviderConfig: vi.fn(),
  setProviderConfig: vi.fn(),
  onConfigChanged: vi.fn(),
  isSetupComplete: vi.fn(),
  ...overrides,
});

// Helper function to create complete mock checkpointer
const createMockCheckpointer = (overrides = {}) => ({
  get: vi.fn(),
  put: vi.fn(),
  list: vi.fn(),
  delete: vi.fn(),
  serde: vi.fn(),
  getTuple: vi.fn(),
  putWrites: vi.fn(),
  deleteThread: vi.fn(),
  getNextVersion: vi.fn(),
  ...overrides,
});

// Helper function to create complete mock practice service
const createMockPracticeService = (overrides = {}) => ({
  recordPracticeAttempt: vi.fn(),
  rebuild: vi.fn(),
  ...overrides,
});

const makeState = (overrides: Partial<WorkflowState>): WorkflowState => ({
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
  practice: DEFAULT_PRACTICE_STATE,
  teach: DEFAULT_TEACH_STATE,
  ...overrides,
});

// Helper function to create complete mock dependencies
const createMockDeps = (overrides: Partial<WorkflowDeps> = {}): WorkflowDeps => ({
  loggerService: createMockLoggerService() as any,
  checkpointer: createMockCheckpointer() as any,
  configService: createMockConfigService() as any,
  providerFactory: createMockProviderFactory() as any,
  knowledgeService: createMockKnowledgeService() as any,
  practiceService: createMockPracticeService() as any,
  learningService: createMockLearningService() as any,
  ...(overrides as any),
});

// Helper function to create complete mock knowledge service
const createMockKnowledgeService = (overrides = {}) => ({
  ingestConceptParsingResult: vi.fn(),
  searchKnowledge: vi.fn(),
  semanticSearch: vi.fn(),
  exploreConcept: vi.fn(),
  getRelatedConcepts: vi.fn(),
  getKnowledgeMap: vi.fn(),
  findRelatedByPrompt: vi.fn(),
  ...overrides,
});

// Helper function to create complete mock learning service
const createMockLearningService = (overrides = {}) => ({
  createLearningPath: vi.fn(),
  getLearningPath: vi.fn(),
  getUserProgress: vi.fn(),
  startLearningSession: vi.fn(),
  pauseSession: vi.fn(),
  resumeSession: vi.fn(),
  completeSession: vi.fn(),
  getSessionProgress: vi.fn(),
  getRecentSessions: vi.fn(),
  searchSessions: vi.fn(),
  getPracticeHistory: vi.fn(),
  getSession: vi.fn(),
  updateSession: vi.fn(),
  deleteSession: vi.fn(),
  updateSessionTitle: vi.fn(),
  getSessionStatistics: vi.fn(),
  ...overrides,
});

// Helper function to create complete mock provider factory
const createMockProviderFactory = (overrides = {}) => ({
  getModel: vi.fn(),
  getEmbeddings: vi.fn(),
  getEmbeddingModel: vi.fn(),
  getRerankModel: vi.fn(),
  ...overrides,
});

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
    const mockKnowledgeService = createMockKnowledgeService({
      searchKnowledge: vi.fn().mockResolvedValue({
        results: [
          {
            id: 'concept-1',
            title: 'React Components',
            type: 'concept' as const,
            category: 'programming',
            relevanceScore: 0.95,
            preview: 'Learn about React components',
            tags: ['react', 'components'],
          },
          {
            id: 'concept-2',
            title: 'JSX Syntax',
            type: 'concept' as const,
            category: 'programming',
            relevanceScore: 0.9,
            preview: 'Understanding JSX syntax',
            tags: ['jsx', 'syntax'],
          },
        ],
      }),
    });

    const mockLearningService = createMockLearningService({
      getPracticeHistory: vi.fn().mockResolvedValue([
        {
          taskId: 'task-1',
          conceptIds: ['concept-1', 'concept-2'],
          result: 'pass' as const,
          rubricScores: { retrieval: 85, application: 90, teachBack: 88 },
          errorTags: [],
        },
        {
          taskId: 'task-2',
          conceptIds: ['concept-1'],
          result: 'partial' as const,
          rubricScores: { retrieval: 70, application: 65 },
          errorTags: ['state-management'],
        },
        {
          taskId: 'task-3',
          conceptIds: ['concept-2'],
          result: 'fail' as const,
          rubricScores: { retrieval: 45, application: 40, teachBack: 50 },
          errorTags: ['props', 'state-management'],
        },
      ]),
    });

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Score: 85%',
      }),
    };

    const mockProviderFactory = createMockProviderFactory({
      getModel: vi.fn().mockResolvedValue(mockModel),
    });

    const mockDeps = createMockDeps({
      providerFactory: mockProviderFactory,
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
    });

    const node = assessNode(mockDeps);

    const state = makeState({
      messages: [
        new HumanMessage('I want to learn React'),
        new AIMessage('Let me help you with React'),
      ],
      topic: 'React Components',
    });

    const result = await node(state, createMockConfig());

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
    // Note: Assess node no longer adds messages to state - it uses streaming via config.writer
    // The confidence calculation is internal workflow data
    expect(result.messages).toHaveLength(0); // No messages added by assess node
    expect(result.confidence).toBe(0.85);
    expect(result.gaps).toEqual(['state-management', 'props']);
  });

  it('handles empty practice history gracefully', async () => {
    const mockKnowledgeService = createMockKnowledgeService({
      searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
    });

    const mockLearningService = createMockLearningService({
      getPracticeHistory: vi.fn().mockResolvedValue([]),
    });

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 50%' }),
    };

    const mockProviderFactory = createMockProviderFactory({
      getModel: vi.fn().mockResolvedValue(mockModel),
    });

    const node = assessNode(createMockDeps({
      providerFactory: mockProviderFactory,
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
    }));

    const state = makeState({
      messages: [],
      topic: 'New Topic',
    });

    const result = await node(state, createMockConfig());

    // Note: Assess node no longer adds messages - confidence is internal workflow data
    expect(result.confidence).toBe(0.5);
    expect(result.gaps).toEqual([]);
    expect(result.messages).toHaveLength(0);
  });

  it('clamps confidence to valid range [0, 1]', async () => {
    const mockKnowledgeService = createMockKnowledgeService({
      searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
    });

    const mockLearningService = createMockLearningService({
      getPracticeHistory: vi.fn().mockResolvedValue([]),
    });

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 150%' }), // Invalid: > 100%
    };

    const mockProviderFactory = createMockProviderFactory({
      getModel: vi.fn().mockResolvedValue(mockModel),
    });

    const node = assessNode(createMockDeps({
      providerFactory: mockProviderFactory,
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
    }));

    const state = makeState({
      messages: [],
      topic: 'Test',
    });

    const result = await node(state, createMockConfig());

    // Should clamp to 1.0 (100%)
    expect(result.confidence).toBe(1.0);
    expect(result.messages).toHaveLength(0); // No messages added by assess node
  });

  it('clamps negative confidence scores to 0', async () => {
    const mockKnowledgeService = createMockKnowledgeService({
      searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
    });

    const mockLearningService = createMockLearningService({
      getPracticeHistory: vi.fn().mockResolvedValue([]),
    });

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 0%' }),
    };

    const mockProviderFactory = createMockProviderFactory({
      getModel: vi.fn().mockResolvedValue(mockModel),
    });

    const node = assessNode(createMockDeps({
      providerFactory: mockProviderFactory,
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
    }));

    const state = makeState({
      messages: [],
      topic: 'Test',
    });

    const result = await node(state, createMockConfig());

    // Should be 0%
    expect(result.confidence).toBe(0.0);
    expect(result.messages).toHaveLength(0); // No messages added by assess node
  });

  it('limits recent messages to last 20', async () => {
    const mockKnowledgeService = createMockKnowledgeService({
      searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
    });

    const mockLearningService = createMockLearningService({
      getPracticeHistory: vi.fn().mockResolvedValue([]),
    });

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 75%' }),
    };

    const mockProviderFactory = createMockProviderFactory({
      getModel: vi.fn().mockResolvedValue(mockModel),
    });

    const node = assessNode(createMockDeps({
      providerFactory: mockProviderFactory,
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
    }));

    // Create 30 messages
    const conversationMessages = Array.from({ length: 30 }, (_, i) => {
      return i % 2 === 0
        ? new HumanMessage(`User message ${i}`)
        : new AIMessage(`Assistant message ${i}`);
    });

    const state = makeState({
      messages: conversationMessages,
      topic: 'Test',
    });

    await node(state, createMockConfig());

    // Verify only last 20 messages were included in prompt
    const messagesArray = mockModel.invoke.mock.calls[0][0];
    expect(messagesArray).toHaveLength(2);
    const humanMessage = messagesArray[1];
    expect(humanMessage.content).toContain('user: User message 20');
    expect(humanMessage.content).toContain('assistant: Assistant message 29');
    expect(humanMessage.content).not.toContain('User message 0'); // Should not include message 0
  });

  it('truncates long messages to 200 characters', async () => {
    const mockKnowledgeService = createMockKnowledgeService({
      searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
    });

    const mockLearningService = createMockLearningService({
      getPracticeHistory: vi.fn().mockResolvedValue([]),
    });

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 75%' }),
    };

    const mockProviderFactory = createMockProviderFactory({
      getModel: vi.fn().mockResolvedValue(mockModel),
    });

    const node = assessNode(createMockDeps({
      providerFactory: mockProviderFactory,
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
    }));

    const longMessage = new HumanMessage('x'.repeat(500));

    const state = makeState({
      messages: [longMessage],
      topic: 'Test',
    });

    await node(state, createMockConfig());

    // Verify message was truncated
    const messagesArray = mockModel.invoke.mock.calls[0][0];
    expect(messagesArray).toHaveLength(2);
    const humanMessage = messagesArray[1];
    expect(humanMessage.content).toContain('user: ' + 'x'.repeat(200));
    expect(humanMessage.content).not.toContain('x'.repeat(201));
  });

  it('calculates average rubric score correctly from multiple attempts', async () => {
    const mockKnowledgeService = createMockKnowledgeService({
      searchKnowledge: vi.fn().mockResolvedValue({
        results: [
          {
            id: 'concept-1',
            title: 'Test',
            type: 'concept' as const,
            category: 'testing',
            relevanceScore: 0.9,
            preview: 'Test concept',
            tags: ['test'],
          },
        ],
      }),
    });

    const mockLearningService = createMockLearningService({
      getPracticeHistory: vi.fn().mockResolvedValue([
        {
          taskId: 'task-1',
          conceptIds: ['concept-1'],
          result: 'pass' as const,
          rubricScores: { retrieval: 100, application: 100, teachBack: 100 },
          errorTags: [],
        },
        {
          taskId: 'task-2',
          conceptIds: ['concept-1'],
          result: 'pass' as const,
          rubricScores: { retrieval: 80, application: 80, teachBack: 80 },
          errorTags: [],
        },
        {
          taskId: 'task-3',
          conceptIds: ['concept-1'],
          result: 'partial' as const,
          rubricScores: { retrieval: 60, application: 60 },
          errorTags: [],
        },
      ]),
    });

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 90%' }),
    };

    const mockProviderFactory = createMockProviderFactory({
      getModel: vi.fn().mockResolvedValue(mockModel),
    });

    const node = assessNode(createMockDeps({
      providerFactory: mockProviderFactory,
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
    }));

    const state = makeState({
      messages: [],
      topic: 'Test',
    });

    await node(state, createMockConfig());

    // Verify average calculation: (100+100+100+80+80+80+60+60) / (8 * 100) = 0.825 = 83%
    const messagesArray = mockModel.invoke.mock.calls[0][0];
    expect(messagesArray).toHaveLength(2);
    const humanMessage = messagesArray[1];
    expect(humanMessage.content).toContain('Average Rubric Score: 83%');
  });

  it('handles undefined rubric scores gracefully', async () => {
    const mockKnowledgeService = createMockKnowledgeService({
      searchKnowledge: vi.fn().mockResolvedValue({
        results: [
          {
            id: 'concept-1',
            title: 'Test',
            type: 'concept' as const,
            category: 'testing',
            relevanceScore: 0.9,
            preview: 'Test concept',
            tags: ['test'],
          },
        ],
      }),
    });

    const mockLearningService = createMockLearningService({
      getPracticeHistory: vi.fn().mockResolvedValue([
        {
          taskId: 'task-1',
          conceptIds: ['concept-1'],
          result: 'pass' as const,
          rubricScores: { retrieval: 80 }, // Only retrieval score
          errorTags: [],
        },
        {
          taskId: 'task-2',
          conceptIds: ['concept-1'],
          result: 'partial' as const,
          rubricScores: undefined, // No rubric scores
          errorTags: [],
        },
      ]),
    });

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 70%' }),
    };

    const mockProviderFactory = createMockProviderFactory({
      getModel: vi.fn().mockResolvedValue(mockModel),
    });

    const node = assessNode(createMockDeps({
      providerFactory: mockProviderFactory,
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
    }));

    const state = makeState({
      messages: [],
      topic: 'Test',
    });

    await node(state, createMockConfig());

    // Should only count defined scores
    const messagesArray = mockModel.invoke.mock.calls[0][0];
    expect(messagesArray).toHaveLength(2);
    const humanMessage = messagesArray[1];
    expect(humanMessage.content).toContain('Average Rubric Score: 80%');
  });

  it('aggregates unique error tags from all attempts', async () => {
    const mockKnowledgeService = createMockKnowledgeService({
      searchKnowledge: vi.fn().mockResolvedValue({
        results: [
          {
            id: 'concept-1',
            title: 'Test',
            type: 'concept' as const,
            category: 'testing',
            relevanceScore: 0.9,
            preview: 'Test concept',
            tags: ['test'],
          },
        ],
      }),
    });

    const mockLearningService = createMockLearningService({
      getPracticeHistory: vi.fn().mockResolvedValue([
        {
          taskId: 'task-1',
          conceptIds: ['concept-1'],
          result: 'fail' as const,
          rubricScores: { retrieval: 40 },
          errorTags: ['concept-a', 'concept-b'],
        },
        {
          taskId: 'task-2',
          conceptIds: ['concept-1'],
          result: 'fail' as const,
          rubricScores: { retrieval: 45 },
          errorTags: ['concept-b', 'concept-c'],
        },
        {
          taskId: 'task-3',
          conceptIds: ['concept-1'],
          result: 'partial' as const,
          rubricScores: { retrieval: 60 },
          errorTags: ['concept-a'],
        },
      ]),
    });

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 50%' }),
    };

    const mockProviderFactory = createMockProviderFactory({
      getModel: vi.fn().mockResolvedValue(mockModel),
    });

    const node = assessNode(createMockDeps({
      providerFactory: mockProviderFactory,
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
    }));

    const state = makeState({
      messages: [],
      topic: 'Test',
    });

    const result = await node(state, createMockConfig());

    // Should have unique gaps only
    expect(result.gaps).toEqual(['concept-a', 'concept-b', 'concept-c']);
    expect(result.gaps).toHaveLength(3);
  });

  it('filters out empty concept IDs', async () => {
    const mockKnowledgeService = createMockKnowledgeService({
      searchKnowledge: vi.fn().mockResolvedValue({
        results: [
          {
            id: 'concept-1',
            title: 'Valid Concept',
            type: 'concept' as const,
            category: 'testing',
            relevanceScore: 0.9,
            preview: 'Valid concept',
            tags: ['test'],
          },
          {
            id: '',
            title: 'Empty ID',
            type: 'concept' as const,
            category: 'testing',
            relevanceScore: 0.8,
            preview: 'Empty ID',
            tags: ['test'],
          },
          {
            id: null as any,
            title: 'Null ID',
            type: 'concept' as const,
            category: 'testing',
            relevanceScore: 0.7,
            preview: 'Null ID',
            tags: ['test'],
          },
          {
            id: 'concept-2',
            title: 'Another Valid Concept',
            type: 'concept' as const,
            category: 'testing',
            relevanceScore: 0.9,
            preview: 'Another concept',
            tags: ['test'],
          },
        ],
      }),
    });

    const mockLearningService = createMockLearningService({
      getPracticeHistory: vi.fn().mockResolvedValue([]),
    });

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 60%' }),
    };

    const mockProviderFactory = createMockProviderFactory({
      getModel: vi.fn().mockResolvedValue(mockModel),
    });

    const node = assessNode(createMockDeps({
      providerFactory: mockProviderFactory,
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
    }));

    const state = makeState({
      messages: [],
      topic: 'Test',
    });

    await node(state, createMockConfig());

    // Should only pass valid concept IDs
    expect(mockLearningService.getPracticeHistory).toHaveBeenCalledWith({
      conceptIds: ['concept-1', 'concept-2'],
      limit: 100,
    });
  });

  it('handles missing model response gracefully', async () => {
    const mockKnowledgeService = createMockKnowledgeService({
      searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
    });

    const mockLearningService = createMockLearningService({
      getPracticeHistory: vi.fn().mockResolvedValue([]),
    });

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({}), // Empty response
    };

    const mockProviderFactory = createMockProviderFactory({
      getModel: vi.fn().mockResolvedValue(mockModel),
    });

    const node = assessNode(createMockDeps({
      providerFactory: mockProviderFactory,
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
    }));

    const state = makeState({
      messages: [],
      topic: 'Test',
    });

    const result = await node(state, createMockConfig());

    // Should default to 0.5 confidence
    expect(result.confidence).toBe(0.5);
  });

  it('propagates errors from knowledge service', async () => {
    const mockKnowledgeService = createMockKnowledgeService({
      searchKnowledge: vi.fn().mockRejectedValue(new Error('Knowledge service unavailable')),
    });

    const mockLearningService = createMockLearningService({
      getPracticeHistory: vi.fn().mockResolvedValue([]),
    });

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 50%' }),
    };

    const mockProviderFactory = createMockProviderFactory({
      getModel: vi.fn().mockResolvedValue(mockModel),
    });

    const node = assessNode(createMockDeps({
      providerFactory: mockProviderFactory,
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
    }));

    const state = makeState({
      messages: [],
      topic: 'Test',
    });

    await expect(node(state, createMockConfig())).rejects.toThrow('Knowledge service unavailable');
  });

  it('propagates errors from learning service', async () => {
    const mockKnowledgeService = createMockKnowledgeService({
      searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
    });

    const mockLearningService = createMockLearningService({
      getPracticeHistory: vi.fn().mockRejectedValue(new Error('Learning service unavailable')),
    });

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 50%' }),
    };

    const mockProviderFactory = createMockProviderFactory({
      getModel: vi.fn().mockResolvedValue(mockModel),
    });

    const node = assessNode(createMockDeps({
      providerFactory: mockProviderFactory,
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
    }));

    const state = makeState({
      messages: [],
      topic: 'Test',
    });

    await expect(node(state, createMockConfig())).rejects.toThrow('Learning service unavailable');
  });

  it('propagates errors from model invocation', async () => {
    const mockKnowledgeService = createMockKnowledgeService({
      searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
    });

    const mockLearningService = createMockLearningService({
      getPracticeHistory: vi.fn().mockResolvedValue([]),
    });

    const mockModel = {
      invoke: vi.fn().mockRejectedValue(new Error('Model unavailable')),
    };

    const mockProviderFactory = createMockProviderFactory({
      getModel: vi.fn().mockResolvedValue(mockModel),
    });

    const node = assessNode(createMockDeps({
      providerFactory: mockProviderFactory,
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
    }));

    const state = makeState({
      messages: [],
      topic: 'Test',
    });

    await expect(node(state, createMockConfig())).rejects.toThrow('Model unavailable');
  });

  it('uses chunk emitter for streaming', async () => {
    const mockKnowledgeService = createMockKnowledgeService({
      searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
    });

    const mockLearningService = createMockLearningService({
      getPracticeHistory: vi.fn().mockResolvedValue([]),
    });

    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: 'Score: 75%' }),
    };

    const mockProviderFactory = createMockProviderFactory({
      getModel: vi.fn().mockResolvedValue(mockModel),
    });

    const node = assessNode(createMockDeps({
      providerFactory: mockProviderFactory,
      knowledgeService: mockKnowledgeService,
      learningService: mockLearningService,
    }));

    const config = createMockConfig();
    const state = makeState({
      messages: [],
      topic: 'Test',
    });
    const result = await node(state, config);

    // Verify result is properly formatted
    // Note: Assess node no longer adds messages - confidence is internal workflow data
    expect(result.messages).toHaveLength(0);
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
      const mockKnowledgeService = createMockKnowledgeService({
        searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
      });

      const mockLearningService = createMockLearningService({
        getPracticeHistory: vi.fn().mockResolvedValue([]),
      });

      const mockModel = {
        invoke: vi.fn().mockResolvedValue({ content: testCase.score }),
      };

      const mockProviderFactory = createMockProviderFactory({
        getModel: vi.fn().mockResolvedValue(mockModel),
      });

      const node = assessNode(createMockDeps({
        providerFactory: mockProviderFactory,
        knowledgeService: mockKnowledgeService,
        learningService: mockLearningService,
      }));

      const state = makeState({
        messages: [],
        topic: 'Test',
      });

      const result = await node(state, createMockConfig());

      expect(result.confidence).toBe(testCase.expected);
    }
  });
});
