/**
 * Integration Test Setup
 *
 * Setup configuration for integration tests that require cross-process
 * communication between main and renderer threads.
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ElectronIpcInterceptor } from './utils/ipc-interceptor';
import { createMockDatabase } from './utils/database-mocks';

// Mock Electron APIs for integration testing
const mockElectronAPI = {
  // Chat domain
  chat: {
    sendMessage: vi.fn().mockResolvedValue({
      success: true,
      messageId: 'test-message-id',
      response: 'Test response',
    }),
    sendMessageStream: vi.fn().mockImplementation(async (message, onChunk) => {
      onChunk({ type: 'content', content: 'Streaming response', timestamp: Date.now() });
      onChunk({ type: 'complete', timestamp: Date.now() });
      return { success: true, messageId: 'test-stream-id' };
    }),
    getConversationHistory: vi.fn().mockResolvedValue({
      success: true,
      conversations: [],
    }),
  },

  // Learning domain
  learning: {
    createSession: vi.fn().mockResolvedValue({
      success: true,
      sessionId: 'test-session-id',
    }),
    getSession: vi.fn().mockResolvedValue({
      success: true,
      session: {
        id: 'test-session-id',
        title: 'Test Session',
        messages: [],
        createdAt: Date.now(),
      },
    }),
    updateSession: vi.fn().mockResolvedValue({
      success: true,
    }),
    deleteSession: vi.fn().mockResolvedValue({
      success: true,
    }),
    listSessions: vi.fn().mockResolvedValue({
      success: true,
      sessions: [],
    }),
    associateAgent: vi.fn().mockResolvedValue({
      success: true,
    }),
    removeAgent: vi.fn().mockResolvedValue({
      success: true,
    }),
    getAgents: vi.fn().mockResolvedValue({
      success: true,
      agents: [],
    }),
  },

  // Knowledge domain
  knowledge: {
    searchConcepts: vi.fn().mockResolvedValue({
      success: true,
      concepts: [],
    }),
    getKnowledgeGraph: vi.fn().mockResolvedValue({
      success: true,
      graph: { nodes: [], edges: [] },
    }),
    addConcept: vi.fn().mockResolvedValue({
      success: true,
      conceptId: 'test-concept-id',
    }),
    updateConcept: vi.fn().mockResolvedValue({
      success: true,
    }),
    deleteConcept: vi.fn().mockResolvedValue({
      success: true,
    }),
  },

  // Analytics domain
  analytics: {
    getLearningProgress: vi.fn().mockResolvedValue({
      success: true,
      progress: {
        totalSessions: 0,
        totalDuration: 0,
        averageSessionDuration: 0,
      },
    }),
    getStudyStreaks: vi.fn().mockResolvedValue({
      success: true,
      streaks: [],
    }),
    getAchievements: vi.fn().mockResolvedValue({
      success: true,
      achievements: [],
    }),
    trackEvent: vi.fn().mockResolvedValue({
      success: true,
    }),
  },

  // Agents domain
  agents: {
    getAvailableAgents: vi.fn().mockResolvedValue({
      success: true,
      agents: [
        {
          id: 'learning-agent',
          name: 'Learning Agent',
          type: 'learning',
          description: 'Helps with learning tasks',
          capabilities: ['concept-explanation', 'learning-path-generation'],
        },
      ],
    }),
    createAgent: vi.fn().mockResolvedValue({
      success: true,
      agentId: 'test-agent-id',
    }),
    updateAgent: vi.fn().mockResolvedValue({
      success: true,
    }),
    deleteAgent: vi.fn().mockResolvedValue({
      success: true,
    }),
    activateAgent: vi.fn().mockResolvedValue({
      success: true,
    }),
    deactivateAgent: vi.fn().mockResolvedValue({
      success: true,
    }),
  },

  // Content domain
  content: {
    importFile: vi.fn().mockResolvedValue({
      success: true,
      importId: 'test-import-id',
    }),
    exportData: vi.fn().mockResolvedValue({
      success: true,
      exportUrl: 'http://localhost:3000/export/test.zip',
    }),
    getImports: vi.fn().mockResolvedValue({
      success: true,
      imports: [],
    }),
    getExports: vi.fn().mockResolvedValue({
      success: true,
      exports: [],
    }),
  },

  // Settings domain
  settings: {
    getPreferences: vi.fn().mockResolvedValue({
      success: true,
      preferences: {
        interface: {
          theme: 'light',
          fontSize: 'medium',
          compactMode: false,
        },
        learning: {
          preferredDifficulty: 'intermediate',
          learningStyle: 'visual',
        },
        privacy: {
          saveConversationHistory: true,
          shareAnalytics: false,
        },
      },
    }),
    updatePreferences: vi.fn().mockResolvedValue({
      success: true,
    }),
    resetPreferences: vi.fn().mockResolvedValue({
      success: true,
    }),
    exportPreferences: vi.fn().mockResolvedValue({
      success: true,
      exportUrl: 'http://localhost:3000/export/preferences.json',
    }),
    importPreferences: vi.fn().mockResolvedValue({
      success: true,
    }),
  },
};

/**
 * Setup integration test environment
 */
beforeAll(async () => {
  // Set up integration test environment variables
  process.env.NODE_ENV = 'test';
  process.env.INTEGRATION_TEST = 'true';

  // Mock window.electronAPI
  Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true,
  });

  // Initialize IPC interceptor for cross-process communication testing
  const ipcInterceptor = new ElectronIpcInterceptor();
  await ipcInterceptor.initialize();

  console.log('🧪 Integration test environment initialized');
});

/**
 * Cleanup after all integration tests
 */
afterAll(async () => {
  // Dispose of IPC interceptor
  const ipcInterceptor = new ElectronIpcInterceptor();
  await ipcInterceptor.dispose();

  console.log('✅ Integration test environment cleaned up');
});

/**
 * Setup before each integration test
 */
beforeEach(async () => {
  // Clear all mocks
  vi.clearAllMocks();

  // Reset mock implementations to defaults
  Object.values(mockElectronAPI).forEach((domain) => {
    if (domain && typeof domain === 'object') {
      Object.values(domain).forEach((method) => {
        if (typeof method === 'function' && 'mockReset' in method) {
          method.mockReset();
        }
      });
    }
  });

  // Set up default successful responses
  mockElectronAPI.chat.sendMessage.mockResolvedValue({
    success: true,
    messageId: 'test-message-id',
    response: 'Test response',
  });

  mockElectronAPI.learning.getSession.mockResolvedValue({
    success: true,
    session: {
      id: 'test-session-id',
      title: 'Test Session',
      messages: [],
      createdAt: Date.now(),
    },
  });
});

/**
 * Cleanup after each integration test
 */
afterEach(() => {
  // Clean up any side effects
  vi.restoreAllMocks();
});

/**
 * Integration test utilities
 */
export const IntegrationTestUtils = {
  /**
   * Create a mock session for testing
   */
  createMockSession(overrides = {}) {
    return {
      id: 'test-session-id',
      title: 'Test Session',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now() - 1000,
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: Date.now(),
        },
      ],
      createdAt: Date.now() - 5000,
      updatedAt: Date.now(),
      ...overrides,
    };
  },

  /**
   * Create a mock agent for testing
   */
  createMockAgent(overrides = {}) {
    return {
      id: 'test-agent-id',
      name: 'Test Agent',
      type: 'learning',
      description: 'A test agent',
      capabilities: ['concept-explanation', 'learning-path'],
      status: 'active',
      createdAt: Date.now(),
      ...overrides,
    };
  },

  /**
   * Create a mock concept for testing
   */
  createMockConcept(overrides = {}) {
    return {
      id: 'test-concept-id',
      name: 'Test Concept',
      description: 'A test concept',
      difficulty: 'intermediate',
      prerequisites: [],
      relatedConcepts: [],
      ...overrides,
    };
  },

  /**
   * Wait for async operations with timeout
   */
  async waitFor(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /**
   * Mock a streaming response
   */
  mockStreamingResponse(chunks: Array<{ type: string; content: string }>) {
    return vi.fn().mockImplementation(async (message, onChunk) => {
      for (const chunk of chunks) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        onChunk({ ...chunk, timestamp: Date.now() });
      }
      onChunk({ type: 'complete', timestamp: Date.now() });
      return { success: true, messageId: 'test-stream-id' };
    });
  },

  /**
   * Create mock database for integration tests
   */
  createMockDatabase() {
    return createMockDatabase();
  },

  /**
   * Get mock Electron API for direct access in tests
   */
  getMockElectronAPI() {
    return mockElectronAPI;
  },
};

// Export mock database creation utility
export { createMockDatabase };

// Export the mock electronAPI for direct test access
export { mockElectronAPI };
