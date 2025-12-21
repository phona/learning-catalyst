/**
 * Bug Test Utilities
 *
 * Specialized testing utilities for bug reproduction and crash testing.
 * Provides utilities for testing error scenarios, memory leaks, and crash recovery.
 */

import { vi } from 'vitest';
import { createMockElectronAPI as createBaseMockElectronAPI } from './electron-api-fixture';

/**
 * Creates a mock ElectronAPI with additional crash testing capabilities
 */
export function createMockElectronAPI(overrides: Partial<any> = {}) {
  const baseAPI = createBaseMockElectronAPI(overrides);

  return {
    ...baseAPI,
    // Add chat methods for title generation tests
    chat: {
      generateTitle: vi.fn().mockResolvedValue('Generated Title'),
      sendMessage: vi.fn(),
      streamMessage: vi.fn(),
      ...baseAPI.chat,
      ...overrides.chat,
    },
    // Add crash-specific methods
    sessions: {
      ...baseAPI.sessions,
      ...overrides.sessions,
      create: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'new-session-id', title: 'New Chat', status: 'active' },
      }),
      list: vi.fn().mockResolvedValue({
        success: true,
        data: { sessions: [], total: 0, hasMore: false },
      }),
      get: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'test-id', title: 'Test Title', status: 'active' },
      }),
      updateTitle: vi.fn().mockResolvedValue({ success: true }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    },
  };
}

/**
 * Creates mock session data for testing
 */
export function createMockSession(overrides = {}) {
  return {
    id: 'session-1',
    title: 'Test Chat',
    topic: null,
    status: 'active' as const,
    created_at: new Date('2024-01-01T10:00:00'),
    updated_at: new Date('2024-01-01T10:00:00'),
    ...overrides,
  };
}

/**
 * Creates mock messages for testing
 */
export function createMockMessages(overrides = []) {
  return [
    {
      id: 'msg-1',
      role: 'user' as const,
      content: [{ type: 'text' as const, text: 'How to learn JavaScript?' }],
      timestamp: new Date('2024-01-01T10:00:00'),
    },
    ...overrides,
  ];
}

/**
 * Sets up window.electronAPI mock for testing
 */
export function setupWindowMock(mockAPI: any) {
  Object.defineProperty(window, 'electronAPI', {
    value: mockAPI,
    writable: true,
  });
}

/**
 * Utility for waiting in async tests
 */
export async function waitForAsync(ms = 0): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gets current memory usage for memory leak testing
 */
export function getMemoryUsage(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed;
  }
  return 0;
}

/**
 * Creates a mock function that throws an error
 */
export function createThrowingMock(errorMessage: string) {
  return vi.fn(() => {
    throw new Error(errorMessage);
  });
}

/**
 * Wraps a function in error boundary for testing
 */
export function withErrorBoundary(fn: () => void, onError?: (error: Error) => void) {
  try {
    fn();
  } catch (error) {
    if (onError && error instanceof Error) {
      onError(error);
    }
  }
}
