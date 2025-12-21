import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupSettingsHandlers } from '../settings-handlers';
import { ipcMain } from 'electron';
import type { ConfigService } from '@/main/services/core/config/config-service';
import type { AppConfig } from '@/shared/types';

type IpcHandler = (event: unknown, ...args: unknown[]) => unknown | Promise<unknown>;

const electronMocks = vi.hoisted(() => ({
  handlerMap: new Map<string, IpcHandler>(),
  app: {
    getVersion: vi.fn().mockReturnValue('9.9.9'),
    quit: vi.fn(),
  },
}));

const mockConfigServiceFns = vi.hoisted(() => ({
  getConfig: vi.fn<() => Promise<AppConfig | null>>(),
  setConfig: vi.fn<(config: Partial<AppConfig>) => Promise<void>>(),
}));

const mockConfigService = mockConfigServiceFns as unknown as ConfigService;

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: IpcHandler) =>
      electronMocks.handlerMap.set(channel, handler),
  },
  app: electronMocks.app,
}));

const getHandler = (channel: string): IpcHandler => {
  const handler = electronMocks.handlerMap.get(channel);
  expect(handler).toBeDefined();
  return handler as IpcHandler;
};

describe('settings handlers (documented surface)', () => {
  beforeEach(() => {
    electronMocks.handlerMap.clear();
    mockConfigServiceFns.getConfig.mockReset();
    mockConfigServiceFns.setConfig.mockReset();
    Object.values(electronMocks.app).forEach((mockFn) => {
      if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
        mockFn.mockReset();
      }
    });
    electronMocks.app.getVersion.mockReturnValue('9.9.9');
    mockConfigServiceFns.setConfig.mockResolvedValue(undefined);
  });

  it('loads workspace configuration via ConfigService', async () => {
    const sampleConfig = { ui: { theme: 'dark' } } as unknown as AppConfig;
    mockConfigServiceFns.getConfig.mockResolvedValue(sampleConfig);

    setupSettingsHandlers(ipcMain, { configService: mockConfigService });

    const result = await getHandler('settings:getWorkspaceConfig')(undefined);

    expect(result).toEqual(sampleConfig);
    expect(mockConfigServiceFns.getConfig).toHaveBeenCalledTimes(1);
  });

  it('persists workspace configuration when requested', async () => {
    setupSettingsHandlers(ipcMain, { configService: mockConfigService });

    const config = { ui: { theme: 'dark' } } as Partial<AppConfig>;
    const result = await getHandler('settings:setWorkspaceConfig')(undefined, config);
    expect(result).toBeUndefined();

    expect(mockConfigServiceFns.setConfig).toHaveBeenCalledWith(config);
  });

  it('returns app version through settings:getAppVersion', async () => {
    setupSettingsHandlers(ipcMain, { configService: mockConfigService });

    const version = await getHandler('settings:getAppVersion')(undefined);

    expect(version).toEqual('9.9.9');
  });
});
