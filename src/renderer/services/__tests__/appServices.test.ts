import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/renderer/services/service-container', () => ({
  createServiceContainer: vi.fn(() => ({
    analytics: { track: vi.fn() },
    session: { list: vi.fn() },
  })),
}));

vi.mock('@/renderer/services/api/electron-api-client', () => ({
  createElectronAPIClient: vi.fn(() => ({ mock: true })),
}));

import { appServices } from '../appServices';
import { createServiceContainer } from '@/renderer/services/service-container';

describe('appServices legacy layer', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await appServices.cleanup();
  });

  it('guards access before initialization', async () => {
    expect(appServices.isInitialized()).toBe(false);
    expect(() => appServices.getAnalytics()).toThrow(/initialized/);
    await expect(appServices.initialize()).resolves.toBeUndefined();
    expect(appServices.isInitialized()).toBe(true);
  });

  it('returns stubbed services after initialization', async () => {
    const beforeCalls = (createServiceContainer as any).mock.calls.length;
    await appServices.initialize();
    const analytics = appServices.getAnalytics();
    const session = appServices.getSessionService();
    expect(analytics.track).toBeDefined();
    expect(session.list).toBeDefined();
    expect((createServiceContainer as any).mock.calls.length).toBe(beforeCalls + 1);
  });

  it('cleanup resets container', async () => {
    await appServices.initialize();
    await appServices.cleanup();
    expect(appServices.isInitialized()).toBe(false);
    expect(() => appServices.getSessionService()).toThrow(/initialized/);
  });
});
