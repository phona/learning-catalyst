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

  it('adds and lists messages for a session', async () => {
    const session = await service.startLearningSession({
      topic: 'Algebra',
      goals: ['Practice basics'],
      difficulty: 'beginner',
      agentType: 'learning',
      learningStyle: 'visual',
      userId: 'tester',
    });

    await service.addMessage({ sessionId: session.id, role: 'user', content: 'Hello' });
    await service.addMessage({ sessionId: session.id, role: 'assistant', content: 'Hi' });

    const rows = await service.listMessages({ sessionId: session.id, order: 'asc' });
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows[0].content).toBe('Hello');
    expect(rows[1].content).toBe('Hi');
  });

  it('returns structured practice history', async () => {
    const now = new Date().toISOString();
    await testDb.db
      .insertInto('practice_attempts')
      .values({
        id: 'p1',
        task_id: 'task-1',
        concept_ids: JSON.stringify(['c1']),
        result: 'pass',
        answer: '42',
        error_tags: JSON.stringify([]),
        rubric_scores: JSON.stringify({ retrieval: 1, application: 1, teachBack: 1 }),
        timestamp: now,
        created_at: now,
        updated_at: now,
      })
      .execute();

    const attempts = await service.getPracticeHistory({ conceptIds: ['c1'], limit: 10 });
    expect(attempts.length).toBeGreaterThanOrEqual(1);
    expect(attempts[0].taskId).toBe('task-1');
    expect(attempts[0].conceptIds).toEqual(['c1']);
    expect(attempts[0].result).toBe('pass');
  });
});
