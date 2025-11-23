/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupLearningHandlers } from '../learning-handlers';
import { ipcMain } from 'electron';

const handlerMap = new Map<string, (...args: any[]) => any>();

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: any[]) => any) => {
      handlerMap.set(channel, handler);
    },
  },
}));

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const loggerService = {
  child: vi.fn(() => logger),
};

const learningService = {
  getLearningPath: vi.fn(async (pathId: string) => ({
    id: pathId,
    title: 'Saved Path',
  })) as ReturnType<typeof vi.fn>,
  startLearningSession: vi.fn(async (params: any) => ({ id: 'session-123', ...params })),
  getSessionProgress: vi.fn(async (sessionId: string) => ({ sessionId, overallProgress: 42 })),
  pauseSession: vi.fn(async (sessionId: string) => ({ success: true, resumeData: { sessionId } })),
  resumeSession: vi.fn(async (sessionId: string) => ({ success: true, context: { sessionId } })),
  completeSession: vi.fn(async (sessionId: string) => ({ sessionId, summary: {} })),
  getRecentSessions: vi.fn(async () => [{ id: 'session-1', topic: 'React' }]),
  searchSessions: vi.fn(async () => ({ sessions: [], totalResults: 0 })),
};

const getHandler = (channel: string) => {
  const handler = handlerMap.get(channel);
  expect(handler).toBeDefined();
  return handler as any;
};

describe('learning handlers', () => {
  beforeEach(() => {
    handlerMap.clear();
    vi.clearAllMocks();
    setupLearningHandlers(ipcMain, {
      learningService,
      loggerService,
    });
  });

  it('returns an error when learning path is missing', async () => {
    learningService.getLearningPath.mockResolvedValueOnce(null);

    const response = await getHandler('learning:get-path')(null, 'missing');

    expect(response.success).toBe(false);
    expect(response.error?.message).toBe('Learning path not found');
  });

  it('starts a learning session with mock context', async () => {
    const payload = {
      topic: 'Electron',
      goals: ['goal1'],
      userId: 'user-x',
    };
    const result = await getHandler('learning:start-session')(null, payload);

    expect(result.success).toBe(true);
    expect(learningService.startLearningSession).toHaveBeenCalledWith({
      topic: 'Electron',
      goals: ['goal1'],
      difficulty: undefined,
      agentType: undefined,
      learningStyle: undefined,
      userId: 'user-x',
    });
  });

  it('gets session progress via the service', async () => {
    const result = await getHandler('learning:get-progress')(null, 'session-abc');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ sessionId: 'session-abc', overallProgress: 42 });
    expect(learningService.getSessionProgress).toHaveBeenCalledWith('session-abc');
  });

  it('pauses a session via the service', async () => {
    const response = await getHandler('learning:pause-session')(null, 'session-1');

    expect(response.success).toBe(true);
    expect(response.data).toEqual({ success: true, resumeData: { sessionId: 'session-1' } });
    expect(learningService.pauseSession).toHaveBeenCalledWith('session-1');
  });

  it('returns recent sessions from service data', async () => {
    const response = await getHandler('learning:get-recent-sessions')(null, { limit: 5 });

    expect(response.success).toBe(true);
    expect(response.data).toEqual([{ id: 'session-1', topic: 'React' }]);
    expect(learningService.getRecentSessions).toHaveBeenCalledWith({ limit: 5 });
  });
});
