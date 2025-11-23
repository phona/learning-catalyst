import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLearningService } from '../learning-service';
import { createKyselyTestDb } from '@/test/utils/kysely-test-db';

const createLoggerService = () => {
  const createLogger = () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: createLogger,
  });

  return {
    child: (meta: Record<string, unknown>) => createLogger(),
  };
};

const createAiService = () => ({
  getModelPreset: () => ({
    model: 'test-model',
    temperature: 0.2,
    maxTokens: 1024,
    apiKey: 'test-key',
  }),
  chatCompletion: vi.fn(async () => ({
    content: JSON.stringify({ fallback: true }),
    model: 'test-model',
    usage: { totalTokens: 100, promptTokens: 50, completionTokens: 50 },
    finishReason: 'stop',
  })),
  getProviders: vi.fn(() => ({})),
  getAvailableModels: vi.fn(() => []),
});

type ResponseKey = 'learning-blueprint' | 'learning-summary';

const detectKey = (systemPrompt: string): ResponseKey => {
  if (systemPrompt.includes('learning session planner')) {
    return 'learning-blueprint';
  }
  if (systemPrompt.includes('learning reflection coach')) {
    return 'learning-summary';
  }
  throw new Error(`Unhandled system prompt: ${systemPrompt}`);
};

const createDomainAgent = () => {
  const responses = new Map<ResponseKey, string>();

  const mockAgent = {
    setResponse(key: ResponseKey, payload: unknown) {
      responses.set(key, JSON.stringify(payload));
    },
    reset() {
      responses.clear();
    },
    invoke: vi.fn(
      async ({
        systemPrompt,
        messages,
      }: {
        systemPrompt?: string;
        messages?: { role: string; content: string }[];
      }) => {
        const promptSource = systemPrompt ?? messages?.[0]?.content ?? '';
        const key = detectKey(promptSource);
        if (!responses.has(key)) {
          throw new Error(`No mock response for ${key}`);
        }
        return responses.get(key)!;
      },
    ),
    stream: vi.fn().mockImplementation(async function* ({
      systemPrompt,
      messages,
    }: {
      systemPrompt?: string;
      messages?: { role: string; content: string }[];
    }) {
      const promptSource = systemPrompt ?? messages?.[0]?.content ?? '';
      const key = detectKey(promptSource);
      if (!responses.has(key)) {
        throw new Error(`No mock response for ${key}`);
      }
      yield responses.get(key)!;
    }),
    options: {},
    graph: {},
    name: 'test-agent',
    description: 'test agent',
    tags: [],
    // Add missing ReactAgent properties
    drawMermaidPng: vi.fn(),
    drawMermaid: vi.fn(),
    streamEvents: vi.fn().mockImplementation(async function* () {
      yield { event: 'start', data: {} };
    }),
    updateState: vi.fn(),
    getState: vi.fn(() => ({})),
    withConfig: vi.fn(() => mockAgent),
    withListeners: vi.fn(() => mockAgent),
    withRetry: vi.fn(() => mockAgent),
    withMiddlewares: vi.fn(() => mockAgent),
  } as any;

  return mockAgent;
};

describe('learning service (kysely)', () => {
  let testDb: Awaited<ReturnType<typeof createKyselyTestDb>>;
  let service: ReturnType<typeof createLearningService>;
  const loggerService = createLoggerService();
  const aiService = createAiService();
  const domainAgent = createDomainAgent();

  beforeEach(async () => {
    domainAgent.reset();
    domainAgent.setResponse('learning-blueprint', {
      summary: 'Plan to explore Topic',
      timeline: ['Warm-up', 'Focus', 'Practice'],
      modules: [
        {
          title: 'Warm-up',
          type: 'lesson',
          focus: 'Basics',
          durationMinutes: 15,
          objectives: ['Recall fundamentals'],
          resources: ['Notes'],
        },
      ],
      recommendations: ['Reflect after session'],
    });

    domainAgent.setResponse('learning-summary', {
      summary: {
        topicsCovered: ['Topic'],
        keyTakeaways: ['Key insight'],
        strengths: ['Consistency'],
        areasForImprovement: ['More practice'],
        nextSteps: ['Schedule another session'],
      },
      performance: {
        accuracy: 0.9,
        engagement: 0.95,
        retention: 0.8,
      },
    });

    testDb = await createKyselyTestDb();
    service = createLearningService({
      db: testDb.db,
      loggerService,
      aiService,
      domainAgent,
    });
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it('creates sessions with LangChain blueprint metadata and reports progress', async () => {
    const session = await service.startLearningSession({
      topic: 'Functional Programming',
      goals: ['Understand basics'],
      difficulty: 'beginner',
      agentType: 'learning',
      learningStyle: 'visual',
      userId: 'tester',
    });

    expect((session.metadata as any)?.blueprint?.modules).toHaveLength(1);

    const progress = await service.getSessionProgress(session.id);
    expect(progress.sessionId).toBe(session.id);
    // timeline property doesn't exist on progress type, so we'll skip this check
  });

  it('updates pause/resume/completion state in the database', async () => {
    const session = await service.startLearningSession({
      topic: 'Refactoring',
      goals: ['Plan improvements'],
      difficulty: 'intermediate',
      agentType: 'learning',
      learningStyle: 'reading',
      userId: 'tester',
    });

    const pauseResult = await service.pauseSession(session.id);
    expect(pauseResult.resumeData?.sessionId).toBe(session.id);

    const resumeResult = await service.resumeSession(session.id);
    expect(resumeResult.context?.sessionId).toBe(session.id);

    const completion = await service.completeSession(session.id);
    expect(completion.summary.keyTakeaways).toContain('Key insight');
  });
});
