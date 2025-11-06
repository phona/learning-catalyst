/**
 * Renderer Test Setup
 *
 * Setup configuration for renderer thread tests including
 * DOM environment, mocks, and global configurations.
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Import React for JSX/TSX tests
import { createElement } from 'react';

// Make React available globally for tests
global.React = { createElement };

// Mock React components for testing
global.jsx = (type: any, props: any, ...children: any[]) => {
  return { type, props, children };
};

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: {
    catalyst: {
      sendChat: vi.fn().mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
        response: 'Test response from CatalystService'
      }),
      sendChatStream: vi.fn().mockImplementation(async (message, options, onChunk) => {
        // Simulate streaming response
        onChunk({ type: 'thinking', content: 'Thinking...', timestamp: Date.now() });
        onChunk({ type: 'content', content: 'Test streaming response', timestamp: Date.now() });
        onChunk({ type: 'complete', content: '', timestamp: Date.now() });
        return {
          success: true,
          messageId: 'test-stream-id'
        };
      }),
      getAvailableAgents: vi.fn().mockResolvedValue({
        success: true,
        agents: [
          {
            id: 'test-agent-1',
            name: 'Test Agent 1',
            description: 'A test agent for unit testing',
            capabilities: ['chat', 'thinking']
          },
          {
            id: 'test-agent-2',
            name: 'Test Agent 2',
            description: 'Another test agent',
            capabilities: ['chat', 'tool-calling']
          }
        ]
      }),
      getSession: vi.fn().mockResolvedValue({
        success: true,
        session: {
          id: 'test-session-id',
          title: 'Test Session',
          messages: []
        }
      }),
      cancelExecution: vi.fn().mockResolvedValue({
        success: true
      }),
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