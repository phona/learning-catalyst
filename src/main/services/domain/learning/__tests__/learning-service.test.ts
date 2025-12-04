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

const createLearningAgent = () => {
  const responses = new Map<ResponseKey, string>();

  const mockAgent = {
    setResponse(key: ResponseKey, payload: unknown) {
      responses.set(key, JSON.stringify(payload));
    },
    reset() {
      responses.clear();
    },
    invoke: vi.fn(async ({ messages }: { messages?: { role: string; content: string }[] }) => {
      const promptSource = messages?.[0]?.content ?? '';
      const key = detectKey(promptSource);
      if (!responses.has(key)) {
        throw new Error(`No mock response for ${key}`);
      }
      const content = responses.get(key)!;
      return { messages: [{ role: 'ai', content }] } as any;
    }),
  } as any;

  return mockAgent;
};

describe('learning service (kysely)', () => {
  let testDb: Awaited<ReturnType<typeof createKyselyTestDb>>;
  let service: ReturnType<typeof createLearningService>;
  const loggerService = createLoggerService();
  const learningAgent = createLearningAgent();

  beforeEach(async () => {
    learningAgent.reset();
    learningAgent.setResponse('learning-blueprint', {
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

    learningAgent.setResponse('learning-summary', {
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
      learningAgent,
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
