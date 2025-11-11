/**
 * Consolidated Renderer Process Test Setup
 *
 * Centralized setup configuration for renderer thread tests including:
 * - DOM environment mocks
 * - Browser API mocks
 * - Electron preload API mocks
 * - React testing utilities
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Import React Testing Library
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Set test environment
process.env.NODE_ENV = 'test';

// ==================== ELECTRON API MOCKS ====================

// Mock window.electronAPI for IPC communication
Object.defineProperty(window, 'electronAPI', {
  value: {
    getConfig: vi.fn().mockResolvedValue({}),
    chat: {
      sendMessage: vi.fn().mockResolvedValue({ success: true }),
      sendMessageStream: vi.fn(),
      startConversation: vi.fn().mockResolvedValue({}),
      getConversationHistory: vi.fn().mockResolvedValue([])
    },
    learning: {
      startSession: vi.fn().mockResolvedValue({}),
      getProgress: vi.fn().mockResolvedValue({}),
      listSessions: vi.fn().mockResolvedValue([])
    },
    knowledge: {
      exploreConcept: vi.fn().mockResolvedValue({}),
      parseConcepts: vi.fn().mockResolvedValue({ concepts: [] })
    },
    analytics: {
      getDashboard: vi.fn().mockResolvedValue({}),
      getProgressChart: vi.fn().mockResolvedValue({}),
      getAchievements: vi.fn().mockResolvedValue([]),
      trackSession: vi.fn().mockResolvedValue({ success: true })
    },
    agents: {
      list: vi.fn().mockResolvedValue([]),
      getStatus: vi.fn().mockResolvedValue({ status: 'idle' })
    },
    content: {
      exploreLocalProjects: vi.fn().mockResolvedValue([]),
      importLearningContent: vi.fn().mockResolvedValue({ success: true })
    },
    getWorkspacePath: vi.fn().mockResolvedValue('/mock/workspace'),
    readDirectory: vi.fn().mockResolvedValue([]),
    readFile: vi.fn().mockResolvedValue('# mock file'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    existsFile: vi.fn().mockResolvedValue(true),
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
    showSaveDialog: vi.fn().mockResolvedValue({ canceled: true, filePath: '' }),
    getAppVersion: vi.fn().mockResolvedValue('0.0.0'),
    quit: vi.fn().mockResolvedValue(undefined),
    setConfig: vi.fn().mockResolvedValue(undefined),
    onMenuAction: vi.fn(),
    catalyst: {
      executeAgent: vi.fn().mockResolvedValue({ success: true }),
      executeAgentStream: vi.fn(),
      listAgents: vi.fn().mockResolvedValue({ agents: [] }),
      cancelAgent: vi.fn().mockResolvedValue({ success: true }),
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
    sessions: {
      create: vi.fn().mockResolvedValue({
        success: true,
        session: { id: 'test-new-session', title: 'New Session' }
      }),
      get: vi.fn().mockResolvedValue({
        success: true,
        session: { id: 'test-session', title: 'Test Session' }
      }),
      list: vi.fn().mockResolvedValue({
        success: true,
        sessions: [
          { id: 'session-1', title: 'Session 1' },
          { id: 'session-2', title: 'Session 2' }
        ]
      }),
      update: vi.fn().mockResolvedValue({
        success: true
      }),
      delete: vi.fn().mockResolvedValue({
        success: true
      }),
      associateAgent: vi.fn().mockResolvedValue({
        success: true
      }),
      removeAgent: vi.fn().mockResolvedValue({
        success: true
      }),
      getAgents: vi.fn().mockResolvedValue({
        success: true,
        agents: []
      }),
    },
    settings: {
      getUserPreferences: vi.fn().mockResolvedValue({
        interface: {
          theme: 'dark',
          fontSize: 'medium',
          compactMode: false,
          showProgressIndicators: true,
        },
        learning: {
          preferredDifficulty: 'intermediate',
          learningStyle: 'visual',
          preferredSessionDuration: '45',
          tracking: {
            enableAnalytics: true,
          },
        },
        privacy: {
          saveConversationHistory: true,
          shareAnalytics: false,
        },
      }),
      updatePreferences: vi.fn().mockResolvedValue({
        success: true,
      }),
    },
    onAgentEvent: vi.fn(),
  },
  writable: true,
});

// ==================== GLOBAL FETCH MOCK ====================

// Prevent real network calls in renderer tests; provide a default stub.
if (!(global as any).fetch) {
  (global as any).fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    // Minimal provider models endpoint simulation
    if (url.includes('/models')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      } as any;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
    } as any;
  });
}

// ==================== BROWSER API MOCKS ====================

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
    setProperty: vi.fn(),
  })),
});

// Mock window dimensions
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768,
});

// ==================== STORAGE API MOCKS ====================

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
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
  key: vi.fn(),
  length: 0,
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// ==================== NAVIGATION API MOCKS ====================

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
    write: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue([]),
  },
  writable: true,
  configurable: true,
});

// Mock user agent
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Test Environment) AppleWebKit/537.36',
  writable: true,
});

// Mock permissions
Object.defineProperty(navigator, 'permissions', {
  value: {
    query: vi.fn().mockResolvedValue({
      state: 'granted',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  },
  writable: true,
});

// ==================== NOTIFICATION API MOCKS ====================

// Mock Notification
global.Notification = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})) as any;

Object.defineProperty(Notification, 'permission', {
  value: 'granted',
  writable: true,
});

Object.defineProperty(Notification, 'requestPermission', {
  value: vi.fn().mockResolvedValue('granted'),
  writable: true,
});

// ==================== CANVAS API MOCKS ====================

// Mock Canvas API
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn().mockReturnValue({ data: new Array(4) }),
  putImageData: vi.fn(),
  createImageData: vi.fn().mockReturnValue({ data: new Array(4) }),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 0 }),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
});

// ==================== CONSOLE MOCKS ====================

// Mock console methods to reduce noise in tests
Object.defineProperty(console, 'log', {
  value: vi.fn(),
  writable: true,
});
Object.defineProperty(console, 'warn', {
  value: vi.fn(),
  writable: true,
});
Object.defineProperty(console, 'error', {
  value: vi.fn(),
  writable: true,
});

// ==================== RENDERER TEST UTILITIES ====================

/**
 * Create mock session data for testing
 */
export function createMockSession(overrides: any = {}) {
  return {
    id: 'test-session-id',
    title: 'Test Session',
    messages: [
      {
        id: 'msg-1',
        type: 'user',
        content: 'Test message',
        timestamp: Date.now(),
        metadata: {}
      },
      {
        id: 'msg-2',
        type: 'assistant',
        content: 'Test response',
        timestamp: Date.now(),
        metadata: {}
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    agentId: 'test-agent-1',
    ...overrides
  };
}

/**
 * Create mock agent data for testing
 */
export function createMockAgent(overrides: any = {}) {
  return {
    id: 'test-agent-1',
    name: 'Test Agent',
    description: 'A test agent for unit testing',
    type: 'learning',
    capabilities: ['chat', 'thinking'],
    modelConfig: {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      temperature: 0.7
    },
    status: 'inactive',
    ...overrides
  };
}

/**
 * Create mock chat message for testing
 */
export function createMockMessage(overrides: any = {}) {
  return {
    id: 'test-message-id',
    type: 'user',
    content: 'Test message content',
    timestamp: Date.now(),
    metadata: {},
    ...overrides
  };
}

/**
 * Wait for DOM updates in React tests
 */
export async function waitForDOMUpdate(ms: number = 0): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simulate keyboard event
 */
export function simulateKeyboardEvent(
  element: HTMLElement,
  eventType: string,
  key: string,
  options: KeyboardEventInit = {}
): void {
  const event = new KeyboardEvent(eventType, {
    key,
    bubbles: true,
    cancelable: true,
    ...options
  });
  element.dispatchEvent(event);
}

/**
 * Simulate mouse event
 */
export function simulateMouseEvent(
  element: HTMLElement,
  eventType: string,
  options: MouseEventInit = {}
): void {
  const event = new MouseEvent(eventType, {
    bubbles: true,
    cancelable: true,
    ...options
  });
  element.dispatchEvent(event);
}

// ==================== CONSOLIDATED EXPORTS ====================

export const RendererTestUtils = {
  createMockSession,
  createMockAgent,
  createMockMessage,
  waitForDOMUpdate,
  simulateKeyboardEvent,
  simulateMouseEvent
};

// Export mock implementations
export { localStorageMock, sessionStorageMock };

// Export type aliases
export type MockSessionType = ReturnType<typeof createMockSession>;
export type MockAgentType = ReturnType<typeof createMockAgent>;
export type MockMessageType = ReturnType<typeof createMockMessage>;
