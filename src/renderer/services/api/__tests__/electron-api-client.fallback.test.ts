import { describe, it, expect, vi } from 'vitest';
import { createElectronAPIClient, createMockElectronAPIClient } from '@/renderer/services/api/electron-api-client';

describe('electron-api-client fallback', () => {
  it('returns window.electronAPI when present', () => {
    const stubApi = { analytics: { getDashboard: vi.fn() } };
    (globalThis as any).window = { electronAPI: stubApi };

    const client = createElectronAPIClient();

    expect(client).toBe(stubApi);
  });

  it('falls back to mock client and warns when missing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    (globalThis as any).window = {};

    const client = createElectronAPIClient();

    expect(warnSpy).toHaveBeenCalled();
    expect(client.analytics).toBeDefined();
    warnSpy.mockRestore();
  });

  it('mock client exposes basic analytics stub', async () => {
    const mock = createMockElectronAPIClient();
    const res = await mock.analytics.getDashboard();

    expect(res.success).toBe(true);
    expect(res.data?.recentSessions).toEqual([]);
  });
});
