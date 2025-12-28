import { describe, it, expect, afterEach, vi } from 'vitest';
import { createElectronAPIClient } from '@/renderer/services/api/electron-api-client';

describe('electron-api-client when electronAPI exists', () => {
  const originalWindow = window;

  afterEach(() => {
    (window as any).electronAPI = undefined;
    // restore console warn spy if used
    vi.restoreAllMocks();
  });

  it('returns the provided window.electronAPI and does not warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fakeApi = { ping: vi.fn() } as any;
    (window as any).electronAPI = fakeApi;

    const client = createElectronAPIClient();

    expect(client).toBe(fakeApi);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
