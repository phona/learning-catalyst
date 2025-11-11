import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceError } from '../../services/types';

const mocks = vi.hoisted(() => {
  const handlerMap = new Map<string, (...args: any[]) => any>();

  const runWithContext = vi.fn(async (_sessionId, _operation, handler: () => any) => {
    return handler();
  });

  const catalystInstance = { runWithContext };
  const getCatalystService = vi.fn(() => catalystInstance);

  const logger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  };

  return {
    handlerMap,
    runWithContext,
    catalystInstance,
    getCatalystService,
    logger
  };
});

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: any[]) => any) => {
      mocks.handlerMap.set(channel, handler);
    }
  },
  MessageChannelMain: vi.fn()
}));

vi.mock('../../services/catalyst/catalyst-service', () => ({
  getCatalystService: mocks.getCatalystService
}));

vi.mock('../../services/logger', () => ({
  LoggerFactory: {
    getInstance: () => ({
      createContextAwareLogger: () => mocks.logger
    })
  }
}));

import { setupLearningHandlers } from '../learning-handlers';

const getHandler = (channel: string) => {
  const handler = mocks.handlerMap.get(channel);
  expect(handler).toBeDefined();
  return handler!;
};

describe('learning handlers', () => {
  beforeEach(() => {
    mocks.handlerMap.clear();
    vi.clearAllMocks();
    mocks.getCatalystService.mockReturnValue(mocks.catalystInstance);
    mocks.runWithContext.mockImplementation(async (_session, _operation, handler: () => any) => handler());
  });

  it('starts a learning session via catalyst service context', async () => {
    setupLearningHandlers();

    const params = { topic: 'React Fundamentals', agentType: 'learning' };
    const response = await getHandler('learning:startSession')(null, params);

    expect(response.success).toBe(true);
    expect(response.session).toMatchObject({
      topic: 'React Fundamentals',
      agentType: 'learning',
      status: 'active'
    });
    expect(mocks.runWithContext).toHaveBeenCalledWith(
      'system',
      'learning:startSession',
      expect.any(Function),
      expect.objectContaining({
        operation: 'learning:startSession',
        topic: 'React Fundamentals',
        agentType: 'learning',
        source: 'ipc_handler'
      })
    );
  });

  it('updates session progress and reports improvement', async () => {
    setupLearningHandlers();

    const params = { sessionId: 'session-123', progress: 0.75, type: 'auto', notes: 'checkpoint reached' };
    const response = await getHandler('learning:updateProgress')(null, params);

    expect(response.success).toBe(true);
    expect(response.updatedProgress).toMatchObject({
      sessionId: 'session-123',
      currentProgress: 0.75,
      metadata: expect.objectContaining({
        updateType: 'auto',
        notes: 'checkpoint reached'
      })
    });
    expect(response.updatedProgress.improvement).toBeCloseTo(0.3, 5);
    expect(mocks.runWithContext).toHaveBeenCalledWith(
      'session-123',
      'learning:updateProgress',
      expect.any(Function),
      expect.objectContaining({
        sessionId: 'session-123',
        operation: 'learning:updateProgress',
        source: 'ipc_handler'
      })
    );
  });

  it('returns personalized recommendations for a session', async () => {
    setupLearningHandlers();

    const response = await getHandler('learning:getRecommendations')(null, 'session-abc');

    expect(response.success).toBe(true);
    expect(Array.isArray(response.recommendations)).toBe(true);
    expect(response.recommendations.length).toBeGreaterThan(0);
    expect(response.recommendations[0]).toMatchObject({
      title: expect.any(String),
      type: expect.any(String),
      reason: expect.any(String)
    });
    expect(mocks.runWithContext).toHaveBeenCalledWith(
      'session-abc',
      'learning:getRecommendations',
      expect.any(Function),
      expect.objectContaining({ sessionId: 'session-abc', operation: 'learning:getRecommendations' })
    );
  });

  it('lists active sessions with derived metadata', async () => {
    setupLearningHandlers();

    const response = await getHandler('learning:listSessions')(null);

    expect(response.success).toBe(true);
    expect(response.sessions).toHaveLength(2);
    expect(response.sessions[0]).toMatchObject({
      id: expect.any(String),
      topic: expect.any(String),
      metadata: expect.objectContaining({
        difficulty: expect.any(String),
        conceptsCount: expect.any(Number)
      })
    });
    expect(mocks.runWithContext).toHaveBeenCalledWith(
      'system',
      'learning:listSessions',
      expect.any(Function),
      expect.objectContaining({ operation: 'learning:listSessions', source: 'ipc_handler' })
    );
  });

  it('generates a learning path with modules and milestones', async () => {
    setupLearningHandlers();

    const params = { topic: 'React', currentLevel: 'beginner', targetLevel: 'advanced' };
    const response = await getHandler('learning:generatePath')(null, params);

    expect(response.success).toBe(true);
    expect(response.learningPath).toMatchObject({
      topic: 'React',
      modules: expect.any(Array),
      milestones: expect.any(Array)
    });
    expect(response.learningPath.modules.length).toBeGreaterThan(0);
    expect(response.learningPath.modules[0]).toMatchObject({
      title: expect.any(String),
      difficulty: expect.any(String),
      status: expect.any(String)
    });
    expect(mocks.runWithContext).toHaveBeenCalledWith(
      'system',
      'learning:generatePath',
      expect.any(Function),
      expect.objectContaining({ operation: 'learning:generatePath', topic: 'React' })
    );
  });

  it('throws a ServiceError when catalyst service is unavailable', async () => {
    mocks.getCatalystService.mockReturnValueOnce(null).mockReturnValue(mocks.catalystInstance);
    setupLearningHandlers();

    await expect(
      getHandler('learning:startSession')(null, { topic: 'Resiliency' })
    ).rejects.toBeInstanceOf(ServiceError);

    expect(mocks.runWithContext).not.toHaveBeenCalled();
  });
});
