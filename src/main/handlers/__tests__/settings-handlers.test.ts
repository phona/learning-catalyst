import { describe, it, expect, beforeEach, vi } from 'vitest';

const electronMocks = vi.hoisted(() => ({
  handlerMap: new Map<string, (...args: any[]) => any>(),
  app: {
    getVersion: vi.fn().mockReturnValue('9.9.9'),
    getPath: vi.fn().mockReturnValue('/tmp'),
    getAppPath: vi.fn().mockReturnValue('/app'),
    quit: vi.fn()
  }
}));

const fsMocks = vi.hoisted(() => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  access: vi.fn(),
  mkdir: vi.fn()
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: any[]) => any) =>
      electronMocks.handlerMap.set(channel, handler)
  },
  app: electronMocks.app
}));

vi.mock('fs/promises', () => fsMocks);

import { setupSettingsHandlers } from '../settings-handlers';

const getHandler = (channel: string) => {
  const handler = electronMocks.handlerMap.get(channel);
  expect(handler).toBeDefined();
  return handler as any;
};

describe('settings handlers', () => {
  beforeEach(() => {
    electronMocks.handlerMap.clear();
    Object.values(fsMocks).forEach((mockFn) => {
      mockFn.mockReset();
    });
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

    expect(result).toEqual(sampleConfig);
    expect(fsMocks.readFile).toHaveBeenCalledWith(
      expect.stringContaining('.catalyst'),
      'utf-8'
    );
  });

  it('persists workspace configuration when requested', async () => {
    setupSettingsHandlers('/workspace');

    const config = { ui: { theme: 'dark' } } as any;
    await getHandler('settings:setWorkspaceConfig')(null, config);

    expect(fsMocks.mkdir).toHaveBeenCalledWith(
      expect.stringContaining('.catalyst'),
      { recursive: true }
    );
    expect(fsMocks.writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/\.catalyst[\\/\\]config\.json$/),
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  });

  it('updates nested workspace config keys', async () => {
    fsMocks.access.mockResolvedValue(undefined);
    fsMocks.readFile.mockResolvedValue(JSON.stringify({ ui: { theme: 'dark' } }));

    setupSettingsHandlers('/workspace');

    await getHandler('settings:setWorkspaceConfigKey')(null, 'ui.theme', 'light');

    expect(fsMocks.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify({ ui: { theme: 'light' } }, null, 2),
      'utf-8'
    );
  });

  it('returns app version through settings:getAppVersion', async () => {
    setupSettingsHandlers('/workspace');

    const version = await getHandler('settings:getAppVersion')(null);

    expect(version).toBe('9.9.9');
    expect(electronMocks.app.getVersion).toHaveBeenCalled();
  });
});
