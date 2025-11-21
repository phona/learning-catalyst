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
      sendMessage: vi.fn().mockResolvedValue({ success: true, data: { assistantMessage: { content: 'ok' } } }),
      sendMessageStream: vi.fn(),
      startConversation: vi.fn().mockResolvedValue({ success: true, data: {} }),
      getConversationHistory: vi.fn().mockResolvedValue({ success: true, data: [] })
    },
    learning: {
      startLearningSession: vi.fn().mockResolvedValue({ success: true, data: {} }),
      getSessionProgress: vi.fn().mockResolvedValue({ success: true, data: {} }),
      getLearningPath: vi.fn().mockResolvedValue({ success: true, data: {} }),
      getRecentSessions: vi.fn().mockResolvedValue({ success: true, data: [] }),
      searchSessions: vi.fn().mockResolvedValue({ success: true, data: { sessions: [], totalResults: 0 } })
    },
    knowledge: {
      exploreConcept: vi.fn().mockResolvedValue({ success: true, data: {} }),
      parseConcepts: vi.fn().mockResolvedValue({ success: true, data: { concepts: [] } })
    },
    analytics: {
      getDashboard: vi.fn().mockResolvedValue({ success: true, data: {} }),
      getProgressChart: vi.fn().mockResolvedValue({ success: true, data: {} }),
      getAchievements: vi.fn().mockResolvedValue({ success: true, data: [] }),
      trackSession: vi.fn().mockResolvedValue({ success: true })
    },
    agents: {
      getAvailableAgents: vi.fn().mockResolvedValue({ success: true, data: [] }),
      getAgentCapabilities: vi.fn().mockResolvedValue({ success: true, data: { capabilities: [] } })
    },
    content: {
      exploreLocalProjects: vi.fn().mockResolvedValue({ success: true, data: [] }),
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
      listAgents: vi.fn().mockResolvedValue({ success: true, data: [] }),
      cancelAgent: vi.fn().mockResolvedValue({ success: true }),
      sendChat: vi.fn().mockResolvedValue({
        success: true,
        data: {
          messageId: 'test-message-id',
          response: 'Test response from CatalystService'
        }
      }),
      sendChatStream: vi.fn().mockImplementation(async (message, options, onChunk) => {
        // Simulate streaming response
        onChunk({ type: 'thinking', content: 'Thinking...', timestamp: Date.now() });
        onChunk({ type: 'content', content: 'Test streaming response', timestamp: Date.now() });
        onChunk({ type: 'complete', content: '', timestamp: Date.now() });
        return {
          success: true,
          data: { messageId: 'test-stream-id' }
        };
      }),
      getAvailableAgents: vi.fn().mockResolvedValue({
        success: true,
        data: [
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
        data: {
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
        data: { sessionId: 'test-new-session', session: { id: 'test-new-session', title: 'New Session' } }
      }),
      get: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'test-session', title: 'Test Session' }
      }),
      list: vi.fn().mockResolvedValue({
        success: true,
        data: {
          sessions: [
            { id: 'session-1', title: 'Session 1' },
            { id: 'session-2', title: 'Session 2' }
          ],
          total: 2,
          hasMore: false
        }
      }),
      update: vi.fn().mockResolvedValue({
        success: true
      }),
      delete: vi.fn().mockResolvedValue({
        success: true
      }),
      saveMessage: vi.fn().mockResolvedValue({ success: true }),
      saveSessionWithMessages: vi.fn().mockResolvedValue({ success: true, data: { sessionId: 'test-new-session' } }),
      updateTitle: vi.fn().mockResolvedValue({ success: true }),
      getRecentSessions: vi.fn().mockResolvedValue({ success: true, data: [] }),
      search: vi.fn().mockResolvedValue({ success: true, data: { sessions: [], total: 0, query: '', hasMore: false } }),
      getStatistics: vi.fn().mockResolvedValue({ success: true, data: { totalSessions: 0, totalMessages: 0, totalUserMessages: 0, totalAssistantMessages: 0, totalTokensUsed: 0, averageMessagesPerSession: 0 } }),
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
        success: true,
        data: {
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
        }
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
export async function waitForDOMUpdate(ms = 0): Promise<void> {
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

// ==================== ZUSTAND STORE MOCKS ====================

// Mock useAppStore (Zustand store)
vi.mock('@/renderer/stores/useAppStore', () => {
  const mockStore = {
    sidebar_open: true,
    settings_panel_open: false,
    theme: 'dark',
    current_view: 'chat',
    focus_mode: false,
    loading: false,
    error_message: undefined,
    success_message: undefined,
    setCurrentView: vi.fn(),
    setSidebarOpen: vi.fn(),
    setSettingsPanelOpen: vi.fn(),
    setTheme: vi.fn(),
    setFocusMode: vi.fn(),
    toggleFocusMode: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    setSuccess: vi.fn(),
    clearMessages: vi.fn(),
  };
  
  // Create a properly typed mock store with Zustand methods
  const mockStoreWithMethods = {
    ...mockStore,
    getState: vi.fn(() => mockStore),
    subscribe: vi.fn(),
    destroy: vi.fn(),
    setState: vi.fn(),
  };
  
  // Create mock hook function with Zustand methods
  const mockUseAppStore = vi.fn(() => mockStoreWithMethods);
  
  // Add Zustand store methods to hook function itself
  Object.assign(mockUseAppStore, {
    getState: vi.fn(() => mockStoreWithMethods),
    subscribe: vi.fn(),
    destroy: vi.fn(),
    setState: vi.fn(),
  });
  
  return {
    useAppStore: mockUseAppStore
  };
});

// Mock useConfigStore (Zustand store)
vi.mock('@/renderer/stores/useConfigStore', () => {
  const mockStore = {
    config: {
      ai: {
        providers: {},
        model_types: {
          chat: {
            provider: 'openai',
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
            max_tokens: 2048,
            top_p: 1,
            enable_thinking: false,
            stream: true,
          }
        }
      },
      ui: {
        theme: 'light',
        show_token_usage: false,
        display_format: 'detailed',
        session_duration: 25,
        font_size: 'medium',
        sidebar_width: 300,
        auto_save: true,
        auto_scroll: true,
        show_line_numbers: false,
        enable_markdown: true,
        enable_syntax_highlighting: true,
        compact_mode: false,
      },
      learning: {
        auto_save: true,
        session_timeout_minutes: 60,
        difficulty: 'intermediate',
        learning_style: 'visual',
        personalization_enabled: true,
        checkpoint_interval: 15,
        max_session_history: 100,
        enable_analytics: false,
        preferred_explanation_length: 'detailed',
      },
      privacy: {
        store_conversations: true,
        retention_days: 90,
        anonymous_analytics: false,
        crash_reporting: true,
        encrypt_local_storage: false,
        auto_cleanup: true,
        export_format: 'json',
      },
      performance: {
        cache_size_mb: 100,
        enable_caching: true,
        max_concurrent_requests: 5,
        request_timeout: 30,
        memory_limit_mb: 512,
        gpu_acceleration: false,
        background_processing: true,
        preload_models: false,
      },
    },
    loading: false,
    error: null,
    setConfig: vi.fn(),
    loadConfig: vi.fn(),
    saveConfig: vi.fn(),
    updateConfig: vi.fn(),
    resetConfig: vi.fn(),
    getProviderConfig: vi.fn(),
    setProviderConfig: vi.fn(),
    removeProviderConfig: vi.fn(),
    setDefaultProvider: vi.fn(),
  };
  
  // Create a properly typed mock store with Zustand methods
  const mockStoreWithMethods = {
    ...mockStore,
    getState: vi.fn(() => mockStore),
    subscribe: vi.fn(),
    destroy: vi.fn(),
    setState: vi.fn(),
  };
  
  // Create the mock hook function with Zustand methods
  const mockUseConfigStore = vi.fn(() => mockStoreWithMethods);
  
  // Add Zustand store methods to the hook function itself
  Object.assign(mockUseConfigStore, {
    getState: vi.fn(() => mockStoreWithMethods),
    subscribe: vi.fn(),
    destroy: vi.fn(),
    setState: vi.fn(),
  });
  
  return {
    useConfigStore: mockUseConfigStore,
    setConfigurationService: vi.fn(),
  };
});

// Mock service hooks
vi.mock('@/renderer/hooks/useAppServices', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // Make sure we export the components
    ServicesProvider: ({ children }: any) => children,
    ConfigServiceProvider: ({ children }: any) => children,
  };
});

vi.mock('@/renderer/hooks/useServices', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // Make sure we export the ServicesProvider component
    ServicesProvider: ({ children }: any) => children,
  };
});
