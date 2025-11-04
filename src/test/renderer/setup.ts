/**
 * Renderer Test Setup
 *
 * Setup configuration for renderer thread tests including
 * DOM environment, mocks, and global configurations.
 */

import { vi } from 'vitest';

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: {
    catalyst: {
      executeAgent: vi.fn(),
      executeAgentStream: vi.fn(),
      cancelAgent: vi.fn(),
      getAgentStatus: vi.fn(),
      listAgents: vi.fn(),
      getActiveExecutions: vi.fn(),
      registerAgent: vi.fn(),
      unregisterAgent: vi.fn(),
    },
    session: {
      create: vi.fn(),
      get: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      associateAgent: vi.fn(),
      removeAgent: vi.fn(),
      getAgents: vi.fn(),
    },
    filesystem: {
      selectFiles: vi.fn(),
      selectDirectory: vi.fn(),
      readFile: vi.fn(),
      listDirectory: vi.fn(),
    },
    onAgentEvent: vi.fn(),
  },
  writable: true,
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: vi.fn(() => ({
    getPropertyValue: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
});

// Mock console methods to reduce noise in tests
Object.defineProperty(console, 'log', {
  value: vi.fn(),
});
Object.defineProperty(console, 'warn', {
  value: vi.fn(),
});
Object.defineProperty(console, 'error', {
  value: vi.fn(),
});