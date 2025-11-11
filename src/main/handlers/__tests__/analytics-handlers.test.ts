import { describe, it, expect, beforeEach, vi } from 'vitest';

const handlerMap = vi.hoisted(() => new Map<string, (...args: any[]) => any>());

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: any[]) => any) => {
      handlerMap.set(channel, handler);
    }
  }
}));

import { registerAnalyticsHandlers } from '../analytics-handlers';

const getHandler = (channel: string) => {
  const handler = handlerMap.get(channel);
  expect(handler).toBeDefined();
  return handler!;
};

describe('analytics handlers', () => {
  beforeEach(() => {
    handlerMap.clear();
  });

  it('provides dashboard data', async () => {
    registerAnalyticsHandlers();

    const response = await getHandler('analytics:getDashboard')(null, {});

    expect(response).toMatchObject({
      success: true,
      dashboard: expect.objectContaining({
        overview: expect.objectContaining({
          sessionsCompleted: expect.any(Number),
          streak: expect.any(Number)
        }),
        recentActivity: expect.any(Array)
      })
    });
  });

  it('returns performance metrics with success flag', async () => {
    registerAnalyticsHandlers();

    const response = await getHandler('analytics:getPerformance')(null, {
      timeRange: 'month',
      breakdown: 'summary'
    });

    expect(response.success).toBe(true);
    expect(response.performance).toMatchObject({
      overall: expect.objectContaining({ totalTime: expect.any(Number) }),
      metadata: expect.objectContaining({ timeRange: 'month' })
    });
  });
});
