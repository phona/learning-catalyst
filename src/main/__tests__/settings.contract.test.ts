import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupSettingsHandlers } from "../handlers/settings-handlers";
import { IPC_ERROR_CODES } from "@/shared/types/ipc-error";

// Lightweight IPC + app mock so we don't need real Electron
const handlerMap = new Map<string, (...args: any[]) => any>();

vi.mock('electron', () => {
  const ipcMain = {
    handle: (channel: string, handler: (...args: any[]) => any) => {
      handlerMap.set(channel, handler);
    },
    removeHandler: (channel: string) => handlerMap.delete(channel),
  };

  const ipcRenderer = {
    invoke: async (channel: string, ...args: any[]) => {
      const handler = handlerMap.get(channel);
      if (!handler) throw new Error(`No handler for ${channel}`);
      return handler({ sender: ipcRenderer }, ...args);
    },
  };

  const app = {
    getVersion: vi.fn(() => '1.0.0-mock'),
    quit: vi.fn(),
  };

  class MessageChannelMain {}

  return { ipcMain, ipcRenderer, app, MessageChannelMain };
});

// Import after mocking electron
import { ipcRenderer } from 'electron';

const makeConfigService = () => {
  return {
    getConfig: vi.fn(async () => ({ ai: { providers: {} }, ui: {}, learning: {}, privacy: {} })),
    setConfig: vi.fn(async () => undefined),
  };
};

describe('settings IPC contract (no real Electron)', () => {
  beforeEach(() => {
    handlerMap.clear();
  });

  it('returns available providers summary', async () => {
    const configService = makeConfigService();
    setupSettingsHandlers({ configService } as any);

    const res = await ipcRenderer.invoke('settings:getAvailableProviders');
    expect(res.success).toBe(true);
    expect(res.data?.summary?.total).toBeGreaterThan(0);
  });

  it('updates user preferences and reports changed keys', async () => {
    const configService = makeConfigService();
    setupSettingsHandlers({ configService } as any);

    const res = await ipcRenderer.invoke('settings:update-preferences', { theme: 'dark' });
    expect(res.success).toBe(true);
    expect(res.data?.updatedSettings?.theme).toBe('dark');
    expect(res.data?.changes).toContain('theme');
  });

  it('configures provider and echoes providerId', async () => {
    const configService = makeConfigService();
    setupSettingsHandlers({ configService } as any);

    const res = await ipcRenderer.invoke('settings:configureProvider', {
      provider: 'openai',
      config: { providerType: 'openai', apiKey: 'k' },
    });

    expect(res.success).toBe(true);
    expect(res.data?.providerId).toBe('openai');
  });

  it('saves workspace config successfully', async () => {
    const configService = makeConfigService();
    setupSettingsHandlers({ configService } as any);

    const res = await ipcRenderer.invoke('settings:setWorkspaceConfig', { ui: { theme: 'dark' } });

    expect(res.success).toBe(true);
    expect(configService.setConfig).toHaveBeenCalledWith({ ui: { theme: 'dark' } });
  });

  it('returns failure when config write fails', async () => {
    const configService = makeConfigService();
    configService.setConfig = vi.fn(async () => {
      throw new Error('disk full');
    });
    setupSettingsHandlers({ configService } as any);

    const res = await ipcRenderer.invoke('settings:setWorkspaceConfig', { ui: { theme: 'dark' } });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe(IPC_ERROR_CODES.settings.configWriteFailed);
  });
});
