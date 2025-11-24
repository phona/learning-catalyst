import { describe, expect, it, vi } from 'vitest';
import { createElectronAPIClient, createMockElectronAPIClient } from '../electron-api-client';
import type { ElectronAPI } from '@/shared/types/electron-api';

describe('electron-api-client', () => {
  it('returns window.electronAPI when present', () => {
    const api = { sentinel: true } as unknown as ElectronAPI;
    // @ts-expect-error override global
    globalThis.window = { electronAPI: api } as any;

    const client = createElectronAPIClient();

    expect(client).toBe(api);
  });

  it('falls back to mock client when missing', () => {
    // @ts-expect-error override global
    globalThis.window = {};
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const client = createElectronAPIClient();

    expect(client.analytics?.getDashboard).toBeDefined();
    expect(warn).toHaveBeenCalled();
  });

  it('mock client surfaces representative methods', async () => {
    const client = createMockElectronAPIClient();

    const dashboard = await client.analytics.getDashboard();
    expect(dashboard.success).toBe(true);

    const agents = await client.agents.getAvailableAgents();
    expect(agents.data?.[0].id).toBe('agent_mock');

    const chat = await client.chat.sendMessage({
      sessionId: 's1',
      message: 'hello',
      providerId: 'p1',
    });
    expect(chat.success).toBe(true);

    const config = await client.settings.getConfig();
    expect(config.success).toBe(true);
  });
});
