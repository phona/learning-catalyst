/**
 * Renderer Thread Test Setup
 *
 * Test configuration for renderer thread components with proper DOM
 * mocking, React Testing Library setup, and Electron API mocking.
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import 'vitest-canvas-mock';

// Mock Electron APIs for renderer testing
const mockElectronAPI = {
  // File operations
  readFile: vi.fn(() => Promise.resolve('mock file content')),
  writeFile: vi.fn(() => Promise.resolve()),
  existsFile: vi.fn(() => Promise.resolve(true)),
  readDirectory: vi.fn(() => Promise.resolve([])),
  getFileInfo: vi.fn(() => Promise.resolve({ isFile: true, size: 100 })),

  // Dialog operations
  showOpenDialog: vi.fn(() => Promise.resolve({ canceled: false, filePaths: ['/test/path'] })),
  showSaveDialog: vi.fn(() => Promise.resolve({ canceled: false, filePath: '/test/save/path' })),

  // App operations
  getAppVersion: vi.fn(() => Promise.resolve('1.0.0')),
  getApp: vi.fn(() => Promise.resolve({ name: 'Learning Catalyst' })),
  quit: vi.fn(() => Promise.resolve()),

  // Configuration
  getConfig: vi.fn(() => Promise.resolve({})),
  setConfig: vi.fn(() => Promise.resolve()),
  resetConfig: vi.fn(() => Promise.resolve()),

  // Database operations
  dbSetPath: vi.fn(() => Promise.resolve()),
  dbExecuteQuery: vi.fn(() => Promise.resolve([])),
  dbFetchOne: vi.fn(() => Promise.resolve(null)),
  dbFetchMany: vi.fn(() => Promise.resolve([])),
  dbFetchAll: vi.fn(() => Promise.resolve([])),
  dbExecuteMany: vi.fn(() => Promise.resolve()),
  dbExecuteScript: vi.fn(() => Promise.resolve()),

  // Workspace operations
  getWorkspacePath: vi.fn(() => Promise.resolve('/test/workspace')),
  getDatabasePath: vi.fn(() => Promise.resolve('/test/database.sqlite')),
  resolveWorkspacePath: vi.fn((path: string) => `/test/workspace/${path}`),
  readWorkspaceFile: vi.fn(() => Promise.resolve('mock workspace file')),
  writeWorkspaceFile: vi.fn(() => Promise.resolve()),
  workspaceFileExists: vi.fn(() => Promise.resolve(true)),
  showWorkspaceDialog: vi.fn(() => Promise.resolve({ canceled: false })),

  // Session operations
  getUserDataPath: vi.fn(() => Promise.resolve('/test/user-data')),
  getDocumentsPath: vi.fn(() => Promise.resolve('/test/documents')),
  getAppPath: vi.fn(() => Promise.resolve('/test/app')),

  // Qdrant operations
  qdrantStart: vi.fn(() => Promise.resolve()),
  qdrantStop: vi.fn(() => Promise.resolve()),
  qdrantStatus: vi.fn(() => Promise.resolve({ running: true })),
  qdrantCollections: vi.fn(() => Promise.resolve([])),
  qdrantCreateCollection: vi.fn(() => Promise.resolve()),
  qdrantDeleteCollection: vi.fn(() => Promise.resolve()),

  // Knowledge operations
  knowledgeAdd: vi.fn(() => Promise.resolve()),
  knowledgeSearch: vi.fn(() => Promise.resolve([])),
  knowledgeGet: vi.fn(() => Promise.resolve(null)),
  knowledgeUpdate: vi.fn(() => Promise.resolve()),
  knowledgeDelete: vi.fn(() => Promise.resolve()),
  knowledgeStoreContext: vi.fn(() => Promise.resolve()),
  knowledgeGetContext: vi.fn(() => Promise.resolve([])),
  knowledgeStats: vi.fn(() => Promise.resolve({ totalItems: 0 })),
  knowledgeClear: vi.fn(() => Promise.resolve()),

  // Agent operations
  executeAgent: vi.fn(() => Promise.resolve({
    success: true,
    executionId: 'test-execution-id',
    data: { concepts: [], relationships: [] }
  })),
  executeAgentStream: vi.fn(() => Promise.resolve({
    executionId: 'test-stream-execution-id',
    port: { postMessage: vi.fn(), close: vi.fn() },
    start: vi.fn(() => Promise.resolve()),
    cancel: vi.fn(() => Promise.resolve({ success: true })),
    onChunk: vi.fn(() => () => {}),
    onComplete: vi.fn(() => () => {}),
    onError: vi.fn(() => () => {})
  })),
  getAgents: vi.fn(() => Promise.resolve([
    { agentId: 'test-agent', name: 'Test Agent', type: 'concept-parser', enabled: true, registered: true }
  ])),
  getAgent: vi.fn(() => Promise.resolve({
    agentId: 'test-agent', name: 'Test Agent', type: 'concept-parser', enabled: true, registered: true
  })),
  registerAgent: vi.fn(() => Promise.resolve({ success: true })),
  unregisterAgent: vi.fn(() => Promise.resolve({ success: true })),
  cancelExecution: vi.fn(() => Promise.resolve({ success: true })),
  getExecutionStatus: vi.fn(() => Promise.resolve({
    executionId: 'test-execution-id',
    agentId: 'test-agent',
    status: 'completed' as const,
    startTime: Date.now(),
    progress: { current: 1, total: 1, message: 'Complete' }
  })),
  getActiveExecutions: vi.fn(() => Promise.resolve([])),

  // Events
  onMenuAction: vi.fn(),
  removeAllListeners: vi.fn()
};

// Mock contextBridge
global.contextBridge = {
  exposeInMainWorld: vi.fn((apiKey: string, api: any) => {
    // Expose mock API to global scope
    (globalThis as any)[apiKey] = api;
  })
};

// Mock ipcRenderer
global.ipcRenderer = {
  invoke: vi.fn(() => Promise.resolve()),
  on: vi.fn(),
  once: vi.fn(),
  removeListener: vi.fn(),
  removeAllListeners: vi.fn(),
  send: vi.fn(),
  postMessage: vi.fn()
};

/**
 * Setup renderer thread test environment
 */
beforeAll(() => {
  // Set up test environment variables
  process.env.NODE_ENV = 'test';

  // Expose mock Electron API
  (global.contextBridge as any).exposeInMainWorld('electronAPI', mockElectronAPI);

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }));

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }));

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });

  // Mock canvas
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Array(4) })),
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
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn()
  }));

  console.log('🧪 Renderer thread test environment initialized');
});

/**
 * Cleanup after all tests
 */
afterAll(() => {
  // Clean up global mocks
  delete (globalThis as any).electronAPI;
  vi.clearAllMocks();

  console.log('✅ Renderer thread test environment cleaned up');
});

/**
 * Cleanup after each test
 */
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
});

/**
 * Clean up React Testing Library after each test
 */
afterEach(() => {
  cleanup();
});

/**
 * Test utilities for renderer thread testing
 */
export const RendererTestUtils = {
  /**
   * Get mock Electron API
   */
  getMockElectronAPI() {
    return mockElectronAPI;
  },

  /**
   * Create mock agent execution response
   */
  createMockAgentResponse(data: any = {}) {
    return {
      success: true,
      executionId: 'test-execution-id',
      data: {
        concepts: [],
        relationships: [],
        ...data
      }
    };
  },

  /**
   * Create mock streaming agent execution
   */
  createMockStreamExecution(executionId: string = 'test-stream-id') {
    const chunks: any[] = [];

    return {
      executionId,
      port: { postMessage: vi.fn(), close: vi.fn() },
      start: vi.fn().mockImplementation(async () => {
        // Simulate streaming chunks
        chunks.push({ type: 'start', content: { agentId: 'test-agent' } });
        chunks.push({ type: 'progress', content: { phase: 'processing' } });
        chunks.push({ type: 'data', content: { message: 'Test response' } });
        chunks.push({ type: 'complete' });
      }),
      cancel: vi.fn(() => Promise.resolve({ success: true })),
      onChunk: vi.fn().mockImplementation((callback) => {
        chunks.forEach(chunk => callback(chunk));
        return () => {};
      }),
      onComplete: vi.fn(),
      onError: vi.fn()
    };
  },

  /**
   * Wait for component updates
   */
  async waitFor(ms: number = 0): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Create mock file system response
   */
  createMockFileResponse(path: string, content: string = 'mock content') {
    return {
      path,
      content,
      size: content.length,
      lastModified: Date.now()
    };
  },

  /**
   * Create mock database response
   */
  createMockDatabaseResponse(data: any[] = []) {
    return {
      rows: data,
      rowCount: data.length,
      lastInsertRowid: 1
    };
  },

  /**
   * Reset all mock functions
   */
  resetAllMocks() {
    vi.clearAllMocks();
    Object.values(mockElectronAPI).forEach(mock => {
      if (typeof mock === 'object' && mock !== null) {
        Object.values(mock).forEach(fn => {
          if (typeof fn === 'object' && fn !== null && 'mockClear' in fn) {
            (fn as any).mockClear();
          }
        });
      }
    });
  }
};

// Export mockElectronAPI for test files
export { mockElectronAPI };