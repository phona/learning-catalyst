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
/* eslint-disable no-undef */

import { describe, it, expect, beforeEach, vi } from 'vitest';

type IpcHandler = (...args: unknown[]) => unknown;

const handlerMap = vi.hoisted(() => new Map<string, IpcHandler>());

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: IpcHandler): void => {
      handlerMap.set(channel, handler);
    }
  }
}));

import { registerAnalyticsHandlers } from '../analytics-handlers';

const getHandler = (channel: string): IpcHandler => {
  const handler = handlerMap.get(channel);
  expect(handler).toBeDefined();
  return handler as IpcHandler;
};

describe('analytics handlers', () => {
  beforeEach(() => {
    handlerMap.clear();
  });

  it('provides dashboard data', async (): Promise<void> => {
    registerAnalyticsHandlers();

    const response = await (getHandler('analytics:getDashboard'))(null, {}) as {
      success: boolean;
      dashboard: {
        overview: {
          sessionsCompleted: number;
          streak: number;
        };
        recentActivity: unknown[];
      };
    };

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

  it('returns performance metrics with success flag', async (): Promise<void> => {
    registerAnalyticsHandlers();

    const response = await (getHandler('analytics:getPerformance'))(null, {
      timeRange: 'month',
      breakdown: 'summary'
    }) as {
      success: boolean;
      performance: {
        overall: { totalTime: number };
        metadata: { timeRange: string };
      };
    };

    expect(response.success).toBe(true);
    expect(response.performance).toMatchObject({
      overall: expect.objectContaining({ totalTime: expect.any(Number) }),
      metadata: expect.objectContaining({ timeRange: 'month' })
    });
  });
});
