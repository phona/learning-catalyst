/**
 * Integration Test Setup
 *
 * Setup file for integration tests that test cross-process communication,
 * service orchestration, and complete user workflows. This file combines
 * setup from both renderer and main process environments.
 */

import '@testing-library/jest-dom'
import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'

// Set test environment
process.env.NODE_ENV = 'test'
process.env.INTEGRATION_TEST = 'true'

// Mock Electron APIs for integration testing
const mockElectron = {
  app: {
    getPath: (name: string) => {
      switch (name) {
      case 'userData':
        return './test-data'
      default:
        return '.'
      }
    }
  },
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn()
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn()
  },
  MessageChannelMain: class MockMessageChannelMain {
    port1 = { postMessage: vi.fn(), close: vi.fn(), closed: false }
    port2 = { postMessage: vi.fn(), close: vi.fn(), closed: false }
  }
}

// Mock Electron Store
vi.mock('electron-store', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
  })),
}))

// Mock Electron APIs
vi.mock('electron', () => mockElectron)

// Mock window.electronAPI for renderer process
Object.defineProperty(window, 'electronAPI', {
  value: {
    // Catalyst service methods
    catalyst: {
      sendChatStream: vi.fn().mockResolvedValue({ success: true }),
      getSession: vi.fn().mockResolvedValue(null),
      saveSession: vi.fn().mockResolvedValue({ success: true }),
      generateAITitle: vi.fn().mockResolvedValue('Test Title'),
    },
    // Config service methods
    config: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue({ success: true }),
      getAll: vi.fn().mockResolvedValue({}),
    },
    // Analytics service methods
    analytics: {
      getUsageStats: vi.fn().mockResolvedValue({ success: true, data: {} }),
      getTokenUsage: vi.fn().mockResolvedValue({ success: true, data: {} }),
    },
    // File operations
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: true }),
    readFile: vi.fn().mockResolvedValue('mock file content'),
    writeFile: vi.fn().mockResolvedValue({ success: true }),
  },
  writable: true,
})

// Mock Node.js modules
const mockFs = {
  readFile: async () => 'mock file content',
  writeFile: async () => {},
  exists: async () => true
}

// Mock Kysely database
const createMockDatabase = () => ({
  selectFrom: vi.fn().mockReturnValue({
    selectAll: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        executeTakeFirst: vi.fn().mockResolvedValue(null),
        execute: vi.fn().mockResolvedValue([])
      })
    }),
    select: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        executeTakeFirst: vi.fn().mockResolvedValue(null),
        execute: vi.fn().mockResolvedValue([])
      })
    }),
    where: vi.fn().mockReturnValue({
      executeTakeFirst: vi.fn().mockResolvedValue(null),
      execute: vi.fn().mockResolvedValue([])
    })
  }),
  insertInto: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      execute: vi.fn().mockResolvedValue({ insertId: 1 }),
      executeTakeFirst: vi.fn().mockResolvedValue({ insertId: 1 })
    })
  }),
  updateTable: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue({ changes: 1 })
      })
    })
  }),
  deleteFrom: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      execute: vi.fn().mockResolvedValue({ changes: 1 })
    })
  }),
  transaction: vi.fn().mockImplementation((fn) => fn(createMockDatabase())),
  close: vi.fn().mockResolvedValue(undefined),
  connected: true
})

// Mock global objects
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

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
})

/**
 * Integration test environment setup
 */
beforeAll(async () => {
  // Set up test environment variables
  process.env.NODE_ENV = 'test'
  process.env.LC_LOG_LEVEL = 'debug'
  process.env.LC_DB_MAX_CONNECTIONS = '5'
  process.env.LC_AGENTS_MAX_CONCURRENT = '2'

  // Mock require for Node.js modules
  ;(global as any).require = (moduleName: string) => {
    switch (moduleName) {
    case 'electron':
      return mockElectron
    case 'fs/promises':
      return mockFs
    case 'kysely':
      return { Kysely: vi.fn().mockImplementation(() => createMockDatabase()) }
    default:
      return {}
    }
  }

  console.log('🧪 Integration test environment initialized')
})

/**
 * Global cleanup after all tests
 */
afterAll(async () => {
  console.log('✅ Integration test environment cleaned up')
})

/**
 * Mock console methods to reduce noise in tests
 */
Object.defineProperty(console, 'log', {
  value: vi.fn(() => {}),
  writable: true
})

Object.defineProperty(console, 'warn', {
  value: vi.fn(() => {}),
  writable: true
})

Object.defineProperty(console, 'error', {
  value: vi.fn(() => {}),
  writable: true
})

// Global cleanup after each test
afterEach(() => {
  vi.clearAllMocks()
})

// Export utilities for integration tests
export const createMockSession = (id = 'test-session') => ({
  id,
  title: 'Test Session',
  created_at: new Date(),
  updated_at: new Date(),
  messages: [],
  metadata: {
    title: 'Test Session',
    tags: [],
    topics_covered: [],
    archived: false,
    pinned: false,
  },
  context: {
    system_prompt: undefined,
    notes: undefined,
    learning_objectives: undefined,
  },
  checkpoints: [],
  statistics: {
    total_messages: 0,
    user_messages: 0,
    assistant_messages: 0,
    total_tokens_used: 0,
    total_thinking_tokens: 0,
    session_duration: 0,
    average_response_time: 0,
    concepts_learned: 0,
    checkpoints_created: 0,
    productivity_score: 0,
    engagement_score: 0,
  },
})

export const createMockConfig = () => ({
  ai: {
    model_types: {
      chat: {
        default_provider: 'openai',
        default_model: 'gpt-3.5-turbo',
      },
    },
  },
  ui: {
    auto_scroll: true,
    theme: 'light',
  },
})

export const waitFor = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))