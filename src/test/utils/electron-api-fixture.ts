import { createMockElectronAPIClient } from '@/renderer/services/api/electron-api-client';
import type { ElectronAPI } from '@/shared/types/electron-api';

/**
 * Returns a typed mock ElectronAPI that mirrors the shape used by renderer services.
 * You can pass partial overrides for just the domains you need in a test.
 */
export function createMockElectronAPI(overrides: Partial<ElectronAPI> = {}): ElectronAPI {
  const base = createMockElectronAPIClient();
  return {
    ...base,
    ...overrides,
    // Deep-merge nested domains when provided in overrides
    analytics: { ...(base.analytics || {}), ...(overrides.analytics || {}) },
    sessions: { ...(base.sessions || {}), ...(overrides.sessions || {}) },
    chat: { ...(base.chat || {}), ...(overrides.chat || {}) },
    knowledge: { ...(base.knowledge || {}), ...(overrides.knowledge || {}) },
    content: { ...(base.content || {}), ...(overrides.content || {}) },
    settings: { ...(base.settings || {}), ...(overrides.settings || {}) },
    catalyst: { ...(base.catalyst || {}), ...(overrides.catalyst || {}) },
  } as ElectronAPI;
}

/**
 * Helper to create a resolved response for ElectronAPI methods.
 */
export function ok<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

/**
 * Helper to create a failure response.
 */
export function fail(message: string): { success: false; error: { message: string } } {
  return { success: false, error: { message } } as const;
}

