/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupSettingsHandlers } from '../settings-handlers';

const electronMocks = vi.hoisted(() => ({
  handlerMap: new Map<string, (...args: any[]) => any>(),
  app: {
    getVersion: vi.fn().mockReturnValue('9.9.9'),
    quit: vi.fn(),
  },
}));

const fsMocks = vi.hoisted(() => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  access: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: any[]) => any) =>
      electronMocks.handlerMap.set(channel, handler),
  },
  app: electronMocks.app,
}));

vi.mock('fs/promises', () => fsMocks);

const getHandler = (channel: string): ((...args: any[]) => any) => {
  const handler = electronMocks.handlerMap.get(channel);
  expect(handler).toBeDefined();
  return handler as (...args: any[]) => any;
};

describe('settings handlers (documented surface)', () => {
  beforeEach(() => {
    electronMocks.handlerMap.clear();
    Object.values(fsMocks).forEach((mockFn) => mockFn.mockReset());
    Object.values(electronMocks.app).forEach((mockFn) => {
      if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
        mockFn.mockReset();
      }
    });
    electronMocks.app.getVersion.mockReturnValue('9.9.9');
    fsMocks.mkdir.mockResolvedValue(undefined);
    fsMocks.writeFile.mockResolvedValue(undefined);
  });

  it('loads workspace configuration from disk', async () => {
    fsMocks.access.mockResolvedValue(undefined);
    const sampleConfig = { ui: { theme: 'dark' } };
    fsMocks.readFile.mockResolvedValue(JSON.stringify(sampleConfig));

    setupSettingsHandlers('/workspace');

    const result = await getHandler('settings:getWorkspaceConfig')(null);

    expect(result).toEqual({ success: true, data: sampleConfig });
    expect(fsMocks.readFile).toHaveBeenCalledWith(expect.stringContaining('.catalyst'), 'utf-8');
  });

  it('persists workspace configuration when requested', async () => {
    setupSettingsHandlers('/workspace');

    const config = { ui: { theme: 'dark' } } as any;
    const result = await getHandler('settings:setWorkspaceConfig')(null, config);
    expect(result.success).toBe(true);

    expect(fsMocks.mkdir).toHaveBeenCalledWith(expect.stringContaining('.catalyst'), {
      recursive: true,
    });
    expect(fsMocks.writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/\.catalyst[\\/\\]config\.json$/),
      JSON.stringify(config, null, 2),
      'utf-8',
    );
  });

  it('returns app version through settings:getAppVersion', async () => {
    setupSettingsHandlers('/workspace');

    const version = await getHandler('settings:getAppVersion')(null);

    expect(version).toEqual({ success: true, data: '9.9.9' });
  });
});
