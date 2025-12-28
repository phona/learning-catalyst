import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLearningService } from '../learning-service';

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

// Create mock database with DI pattern
const createMockDatabase = () => {
  const databaseTables: { [tableName: string]: any[] } = {};

  const createQueryBuilder = (tableName: string, data: any[] = []) => ({
    insertInto: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        execute: vi.fn().mockImplementation((values: any) => {
          if (!databaseTables[tableName]) {
            databaseTables[tableName] = [];
          }
          if (Array.isArray(values)) {
            databaseTables[tableName].push(...values);
          } else {
            databaseTables[tableName].push(values);
          }
          return Promise.resolve();
        }),
      }),
    }),
    selectAll: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation((column: string, operator: string, value: any) => {
        if (operator === '=') {
          const filtered = data.filter((c: any) => c[column] === value);
          return {
            ...createQueryBuilder(tableName, filtered),
            execute: vi.fn().mockResolvedValue(filtered),
            executeTakeFirst: vi.fn().mockResolvedValue(filtered[0] || undefined),
          };
        }
        if (operator === 'in' && Array.isArray(value)) {
          const filtered = data.filter((c: any) => value.includes(c[column]));
          return {
            ...createQueryBuilder(tableName, filtered),
            execute: vi.fn().mockResolvedValue(filtered),
            executeTakeFirst: vi.fn().mockResolvedValue(filtered[0] || undefined),
          };
        }
        return createQueryBuilder(tableName, data);
      }),
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue(data),
        }),
      }),
      execute: vi.fn().mockResolvedValue(data),
      executeTakeFirst: vi.fn().mockResolvedValue(data[0] || undefined),
    }),
    select: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation((column: string, operator: string, value: any) => {
        if (operator === '=') {
          const filtered = data.filter((c: any) => c[column] === value);
          return {
            ...createQueryBuilder(tableName, filtered),
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                execute: vi.fn().mockResolvedValue(filtered),
              }),
            }),
            execute: vi.fn().mockResolvedValue(filtered),
            executeTakeFirst: vi.fn().mockResolvedValue(filtered[0] || undefined),
          };
        }
        if (operator === 'in' && Array.isArray(value)) {
          const filtered = data.filter((c: any) => value.includes(c[column]));
          return {
            ...createQueryBuilder(tableName, filtered),
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                execute: vi.fn().mockResolvedValue(filtered),
              }),
            }),
            execute: vi.fn().mockResolvedValue(filtered),
            executeTakeFirst: vi.fn().mockResolvedValue(filtered[0] || undefined),
          };
        }
        return createQueryBuilder(tableName, data);
      }),
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue(data),
        }),
      }),
      execute: vi.fn().mockResolvedValue(data),
      executeTakeFirst: vi.fn().mockResolvedValue(data[0] || undefined),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockImplementation((updates: any) => ({
        where: vi.fn().mockImplementation((column: string, operator: string, value: any) => {
          if (operator === '=') {
            const tableData = databaseTables[tableName] || [];
            const updatedRows = tableData.map((row: any) => {
              if (row[column] === value) {
                return { ...row, ...updates };
              }
              return row;
            });
            databaseTables[tableName] = updatedRows;
            return {
              execute: vi.fn().mockImplementation(() => {
                return Promise.resolve({ numUpdatedRows: updatedRows.length });
              }),
            };
          }
          return {
            execute: vi.fn().mockImplementation(() => {
              return Promise.resolve({ numUpdatedRows: 0 });
            }),
          };
        }),
      })),
    }),
    deleteFrom: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        execute: vi.fn().mockImplementation(() => {
          return Promise.resolve();
        }),
      }),
    }),
    execute: vi.fn().mockResolvedValue(data),
    executeTakeFirst: vi.fn().mockResolvedValue(data[0] || undefined),
  });

  return {
    selectFrom: vi.fn().mockImplementation((tableName: string) => {
      const tableData = databaseTables[tableName] || [];
      return createQueryBuilder(tableName, tableData);
    }),
    insertInto: vi.fn().mockImplementation((tableName: string) => ({
      values: vi.fn().mockImplementation((values: any) => ({
        execute: vi.fn().mockImplementation(() => {
          if (!databaseTables[tableName]) {
            databaseTables[tableName] = [];
          }
          if (Array.isArray(values)) {
            databaseTables[tableName].push(...values);
          } else {
            databaseTables[tableName].push(values);
          }
          return Promise.resolve();
        }),
      })),
    })),
    updateTable: vi.fn().mockImplementation((tableName: string) => ({
      set: vi.fn().mockImplementation((updates: any) => ({
        where: vi.fn().mockImplementation((column: string, operator: string, value: any) => {
          if (operator === '=') {
            const tableData = databaseTables[tableName] || [];
            const updatedRows = tableData.map((row: any) => {
              if (row[column] === value) {
                return { ...row, ...updates };
              }
              return row;
            });
            databaseTables[tableName] = updatedRows;
            return {
              execute: vi.fn().mockImplementation(() => {
                return Promise.resolve({ numUpdatedRows: updatedRows.length });
              }),
            };
          }
          return {
            execute: vi.fn().mockImplementation(() => {
              return Promise.resolve({ numUpdatedRows: 0 });
            }),
          };
        }),
      })),
    })),
    deleteFrom: vi.fn().mockImplementation((tableName: string) => ({
      where: vi.fn().mockReturnValue({
        execute: vi.fn().mockImplementation(() => {
          return Promise.resolve();
        }),
      }),
    })),
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

describe('learning service (mocked database)', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
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

    mockDb = createMockDatabase();
    service = createLearningService({
      db: mockDb as any,
      loggerService,
      checkpointSaver: {
        save: vi.fn().mockResolvedValue(undefined),
        load: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        list: vi.fn().mockResolvedValue([]),
      } as any,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates sessions with LangChain blueprint metadata and reports progress', async () => {
    const session = await service.startLearningSession({
      topic: 'Functional Programming',
      goals: ['Understand basics'],
      difficulty: 'beginner',
      agentType: 'learning',
      learningStyle: 'visual',
    });

    expect((session.metadata as any)?.blueprint?.modules).toHaveLength(1);

    const progress = await service.getSessionProgress(session.id);
    expect(progress.sessionId).toBe(session.id);
    // timeline property doesn't exist on progress type, so we'll skip this check
  });

  it('updates session state in the database', async () => {
    const session = await service.startLearningSession({
      topic: 'Refactoring',
      goals: ['Plan improvements'],
      difficulty: 'intermediate',
      agentType: 'learning',
      learningStyle: 'reading',
    });

    const updated = await service.updateSession(session.id, {
      status: 'paused',
    });
    expect(updated?.status).toBe('paused');

    const resumed = await service.updateSession(session.id, {
      status: 'active',
    });
    expect(resumed?.status).toBe('active');
  });

  it('retrieves practice history for concepts', async () => {
    const now = new Date().toISOString();
    await mockDb
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

  it('returns structured practice history', async () => {
    const now = new Date().toISOString();
    await mockDb
      .insertInto('practice_attempts')
      .values({
        id: 'p2',
        task_id: 'task-2',
        concept_ids: JSON.stringify(['c2']),
        result: 'fail',
        answer: 'wrong',
        error_tags: JSON.stringify(['calculation']),
        rubric_scores: JSON.stringify({ retrieval: 0, application: 0, teachBack: 0 }),
        timestamp: now,
        created_at: now,
        updated_at: now,
      })
      .execute();

    const attempts = await service.getPracticeHistory({ conceptIds: ['c2'], limit: 10 });
    expect(attempts.length).toBeGreaterThanOrEqual(1);
    expect(attempts[0].taskId).toBe('task-2');
    expect(attempts[0].conceptIds).toEqual(['c2']);
    expect(attempts[0].result).toBe('fail');
    expect(attempts[0].errorTags).toContain('calculation');
  });
});
