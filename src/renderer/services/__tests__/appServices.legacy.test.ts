import { describe, expect, it, vi } from 'vitest';
import {
  appServices,
  initializeAppServices,
  cleanupAppServices,
  getAnalytics,
  getSessionService,
} from '../appServices';
import * as containerModule from '../service-container';
import * as apiClientModule from '../api/electron-api-client';

describe('appServices legacy layer', () => {
  it('initializes container only once and exposes analytics/session services', async () => {
    const fakeContainer = { analytics: { sentinel: 1 }, session: { sentinel: 2 } } as any;
    const createSpy = vi
      .spyOn(containerModule, 'createServiceContainer')
      .mockReturnValue(fakeContainer);
    vi.spyOn(apiClientModule, 'createElectronAPIClient').mockReturnValue({} as any);

    await initializeAppServices();
    await initializeAppServices(); // should be idempotent

    expect(appServices.isInitialized()).toBe(true);
    expect(getAnalytics()).toBe(fakeContainer.analytics);
    expect(getSessionService()).toBe(fakeContainer.session);
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it('cleanup resets initialization', async () => {
    await cleanupAppServices();
    expect(appServices.isInitialized()).toBe(false);
  });

  it('throws for unavailable services', () => {
    expect(() => appServices.getDatabase()).toThrow(/not available/);
    expect(() => appServices.getKnowledgeGraph()).toThrow(/not available/);
    expect(() => appServices.getVectorDatabase()).toThrow(/not available/);
    expect(() => appServices.getAgentManager()).toThrow(/not available/);
  });
});
