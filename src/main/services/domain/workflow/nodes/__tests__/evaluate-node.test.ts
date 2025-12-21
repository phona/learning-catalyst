import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateNode } from '../evaluate';
import { WorkflowStateAnnotation, type WorkflowState } from '../../state';
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

// Mock config writer for chunk emitter
const createMockConfig = (): LangGraphRunnableConfig => ({
  writer: vi.fn(),
} as any);

// Helper to create a minimal valid state
const createMockState = (overrides: Partial<WorkflowState> = {}): WorkflowState => ({
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
    userIntent: undefined,
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
    teachIntent: undefined,
    gaps: [],
    understandingLevel: 0,
    mastered: false,
    assessmentReason: '',
    questionsAsked: 0,
  },
  ...overrides,
});

// Helper to create a minimal valid WorkflowDeps
const createMockWorkflowDeps = (mockProviderFactory: any) =>
  ({
    agentManager: {} as any,
    loggerService: {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    } as any,
    checkpointer: {} as any,
    configService: {} as any,
    providerFactory: mockProviderFactory,
    knowledgeService: {} as any,
    practiceService: {} as any,
    learningService: {} as any,
  } as any);

describe('evaluate node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('evaluates user answer and calculates mastery', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Score: 85%',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
      getEmbeddings: vi.fn().mockResolvedValue({}),
      getEmbeddingModel: vi.fn().mockResolvedValue({}),
      getRerankModel: vi.fn().mockResolvedValue({}),
    };

    const node = evaluateNode(createMockWorkflowDeps(mockProviderFactory));

    const result = await node(
      createMockState({
        topic: 'React',
        practicePrompt: 'What is JSX?',
        userAnswer: 'JSX is a syntax extension for JavaScript',
        mastery: 0.5,
        attemptCount: 0,
      }),
      createMockConfig()
    );

    expect(mockProviderFactory.getModel).toHaveBeenCalledWith();

    expect(mockModel.invoke).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining('Grade the user\'s answer'),
        }),
      ])
    );

    expect(result.mastery).toBe(0.85);
    expect(result.attemptCount).toBe(1);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toBeInstanceOf(HumanMessage);
    expect((result.messages[0] as any).response_metadata?.content).toBe('Score: 85%');
  });

  it('increments attempt count correctly', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Score: 70%',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
      getEmbeddings: vi.fn().mockResolvedValue({}),
      getEmbeddingModel: vi.fn().mockResolvedValue({}),
      getRerankModel: vi.fn().mockResolvedValue({}),
    };

    const node = evaluateNode(createMockWorkflowDeps(mockProviderFactory));

    const result = await node(
      createMockState({
        topic: 'JavaScript',
        practicePrompt: 'What is a closure?',
        userAnswer: 'A closure is...',
        mastery: 0.3,
        attemptCount: 2,
      }),
      createMockConfig()
    );

    expect(result.attemptCount).toBe(3);
    expect(result.mastery).toBe(0.7);
  });

  it('handles perfect score', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Score: 100%',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
      getEmbeddings: vi.fn().mockResolvedValue({}),
      getEmbeddingModel: vi.fn().mockResolvedValue({}),
      getRerankModel: vi.fn().mockResolvedValue({}),
    };

    const node = evaluateNode(createMockWorkflowDeps(mockProviderFactory));

    const result = await node(
      createMockState({
        topic: 'TypeScript',
        practicePrompt: 'Define an interface',
        userAnswer: 'interface Person { name: string }',
        mastery: 0.0,
        attemptCount: 0,
      }),
      createMockConfig()
    );

    expect(result.mastery).toBe(1.0);
    expect(result.attemptCount).toBe(1);
  });

  it('handles zero score', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Score: 0%',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
      getEmbeddings: vi.fn().mockResolvedValue({}),
      getEmbeddingModel: vi.fn().mockResolvedValue({}),
      getRerankModel: vi.fn().mockResolvedValue({}),
    };

    const node = evaluateNode(createMockWorkflowDeps(mockProviderFactory));

    const result = await node(
      createMockState({
        topic: 'React',
        practicePrompt: 'What is state?',
        userAnswer: 'I don\'t know',
        mastery: 0.0,
        attemptCount: 0,
      }),
      createMockConfig()
    );

    expect(result.mastery).toBe(0.0);
    expect(result.attemptCount).toBe(1);
  });

  it('falls back to existing mastery when parsing fails', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'No score in this response',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
      getEmbeddings: vi.fn().mockResolvedValue({}),
      getEmbeddingModel: vi.fn().mockResolvedValue({}),
      getRerankModel: vi.fn().mockResolvedValue({}),
    };

    const node = evaluateNode(createMockWorkflowDeps(mockProviderFactory));

    const result = await node(
      createMockState({
        topic: 'JavaScript',
        practicePrompt: 'Question?',
        userAnswer: 'Answer',
        mastery: 0.75,
        attemptCount: 1,
      }),
      createMockConfig()
    );

    expect(result.mastery).toBe(0.75); // Falls back to existing mastery
    expect(result.attemptCount).toBe(2);
  });

  it('uses default mastery when both parsing and existing mastery fail', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Invalid response',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
      getEmbeddings: vi.fn().mockResolvedValue({}),
      getEmbeddingModel: vi.fn().mockResolvedValue({}),
      getRerankModel: vi.fn().mockResolvedValue({}),
    };

    const node = evaluateNode(createMockWorkflowDeps(mockProviderFactory));

    const result = await node(
      createMockState({
        topic: 'React',
        practicePrompt: 'Question?',
        userAnswer: 'Answer',
        mastery: undefined,
        attemptCount: 0,
      }),
      createMockConfig()
    );

    expect(result.mastery).toBe(0.5); // Default mastery
    expect(result.attemptCount).toBe(1);
  });

  it('handles empty practice prompt and answer', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Score: 80%',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
      getEmbeddings: vi.fn().mockResolvedValue({}),
      getEmbeddingModel: vi.fn().mockResolvedValue({}),
      getRerankModel: vi.fn().mockResolvedValue({}),
    };

    const node = evaluateNode(createMockWorkflowDeps(mockProviderFactory));

    const result = await node(
      createMockState({
        topic: 'JavaScript',
        practicePrompt: '',
        userAnswer: '',
        mastery: 0.0,
        attemptCount: 0,
      }),
      createMockConfig()
    );

    expect(mockModel.invoke).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining('Grade the user\'s answer'),
        }),
      ])
    );

    expect(result.mastery).toBe(0.8);
    expect(result.attemptCount).toBe(1);
  });

  it('passes topic and content to model correctly', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Score: 90%',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue(mockModel),
      getEmbeddings: vi.fn().mockResolvedValue({}),
      getEmbeddingModel: vi.fn().mockResolvedValue({}),
      getRerankModel: vi.fn().mockResolvedValue({}),
    };

    const node = evaluateNode(createMockWorkflowDeps(mockProviderFactory));

    await node(
      createMockState({
        topic: 'TypeScript',
        practicePrompt: 'What is a type?',
        userAnswer: 'A type is...',
        mastery: 0.0,
        attemptCount: 0,
      }),
      createMockConfig()
    );

    const callArgs = mockModel.invoke.mock.calls[0][0];
    const concatenatedContent = callArgs.map((msg: any) => msg.content).join('\n');
    expect(concatenatedContent).toContain('TypeScript');
    expect(concatenatedContent).toContain('What is a type?');
    expect(concatenatedContent).toContain('A type is...');
  });
});
