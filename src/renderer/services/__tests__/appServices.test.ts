import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ServiceContainer } from '@/renderer/services/service-container';

vi.mock('@/renderer/services/service-container', () => ({
  createServiceContainer: vi.fn(() => {
    const container: ServiceContainer = {
      analytics: {} as ServiceContainer['analytics'],
      session: {} as ServiceContainer['session'],
      chat: {} as ServiceContainer['chat'],
      file: {} as ServiceContainer['file'],
    };
    return container;
  }),
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
    const mockCreateServiceContainer = vi.mocked(createServiceContainer);
    const beforeCalls = mockCreateServiceContainer.mock.calls.length;
    await appServices.initialize();
    const analytics = appServices.getAnalytics();
    const session = appServices.getSessionService();
    expect(analytics).toBeDefined();
    expect(session).toBeDefined();
    expect(mockCreateServiceContainer.mock.calls.length).toBe(beforeCalls + 1);
  });

  it('cleanup resets container', async () => {
    await appServices.initialize();
    await appServices.cleanup();
    expect(appServices.isInitialized()).toBe(false);
    expect(() => appServices.getSessionService()).toThrow(/initialized/);
  });
});
