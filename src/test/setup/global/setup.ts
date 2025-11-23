/**
 * Global Test Setup
 *
 * Global setup file for all test environments. Provides common mocks
 * and utilities that are needed across all test types (main process,
 * renderer process, integration, etc.).
 */

import { beforeAll, afterAll, vi } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.VITEST = 'true';

// Mock Electron APIs globally
const mockElectronAPI = {
  app: {
    getPath: vi.fn((name: string) => {
      switch (name) {
        case 'userData':
          return './test-data';
        case 'documents':
          return './test-documents';
        default:
          return '.';
      }
    }),
    getVersion: vi.fn(() => '1.0.0-test'),
    getName: vi.fn(() => 'Learning Catalyst Test'),
  },

  ipcRenderer: {
    invoke: vi.fn(),
    send: vi.fn(),
    sendSync: vi.fn(() => ({})),
    on: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
    once: vi.fn(),
  },

  shell: {
    openExternal: vi.fn(),
  },

  dialog: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    showErrorBox: vi.fn(),
  },
};

// Mock browser APIs
const mockBrowserAPIs = {
  ResizeObserver: vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),

  IntersectionObserver: vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),

  matchMedia: vi.fn(() => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),

  localStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },

  sessionStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
};

/**
 * Global setup - runs once before all tests
 */
beforeAll(() => {
  // Set up global mocks for browser environment
  if (typeof window !== 'undefined') {
    // Mock Electron APIs
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
    });

    // Mock browser APIs
    Object.defineProperty(window, 'ResizeObserver', {
      value: mockBrowserAPIs.ResizeObserver,
      writable: true,
    });

    Object.defineProperty(window, 'IntersectionObserver', {
      value: mockBrowserAPIs.IntersectionObserver,
      writable: true,
    });

    Object.defineProperty(window, 'matchMedia', {
      value: mockBrowserAPIs.matchMedia,
      writable: true,
    });

    Object.defineProperty(window, 'localStorage', {
      value: mockBrowserAPIs.localStorage,
      writable: true,
    });

    Object.defineProperty(window, 'sessionStorage', {
      value: mockBrowserAPIs.sessionStorage,
      writable: true,
    });

    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue(''),
      },
      writable: true,
    });
  }

  console.log('🧪 Global test environment initialized');
});

/**
 * Global cleanup - runs once after all tests
 */
afterAll(() => {
  console.log('✅ Global test environment cleaned up');
});

// Mock console methods to reduce noise in tests
Object.defineProperty(console, 'log', {
  value: vi.fn(() => {}),
  writable: true,
});

Object.defineProperty(console, 'warn', {
  value: vi.fn(() => {}),
  writable: true,
});

Object.defineProperty(console, 'error', {
  value: vi.fn(() => {}),
  writable: true,
});

// Global cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});

export { mockElectronAPI, mockBrowserAPIs };
