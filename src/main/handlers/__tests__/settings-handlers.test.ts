import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createIpcPair } from '@/test/utils/fakes/ipc-fake';
import { setupSettingsHandlers } from '../settings-handlers';
import type { AppConfig } from '@/shared/types';

describe('settings handlers (documented surface)', () => {
  const configService = {
    getConfig: vi.fn<() => Promise<AppConfig | null>>(),
    setConfig: vi.fn<(config: Partial<AppConfig>) => Promise<void>>(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    configService.setConfig.mockResolvedValue(undefined);
  });

  it('loads workspace configuration via ConfigService', async () => {
    const sampleConfig = { ui: { theme: 'dark' } } as unknown as AppConfig;
    configService.getConfig.mockResolvedValue(sampleConfig);

    const { ipcMain, ipcRenderer } = createIpcPair();
    setupSettingsHandlers(ipcMain as any, {
      configService: configService as any,
      app: { getVersion: () => '9.9.9', quit: vi.fn() },
    });

    const result = await ipcRenderer.invoke('settings:getWorkspaceConfig');

    expect(result).toEqual(sampleConfig);
    expect(configService.getConfig).toHaveBeenCalledTimes(1);
  });

  it('persists workspace configuration when requested', async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();
    setupSettingsHandlers(ipcMain as any, {
      configService: configService as any,
      app: { getVersion: () => '9.9.9', quit: vi.fn() },
    });

    const config = { ui: { theme: 'dark' } } as Partial<AppConfig>;
    const result = await ipcRenderer.invoke('settings:setWorkspaceConfig', config);
    expect(result).toBeUndefined();

    expect(configService.setConfig).toHaveBeenCalledWith(config);
  });

  it('returns app version through settings:getAppVersion', async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();
    setupSettingsHandlers(ipcMain as any, {
      configService: configService as any,
      app: { getVersion: () => '9.9.9', quit: vi.fn() },
    });

    const version = await ipcRenderer.invoke('settings:getAppVersion');

    expect(version).toEqual('9.9.9');
  });
});
