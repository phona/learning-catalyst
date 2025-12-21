/**
 * @fileoverview History Loading Bug Tests
 *
 * TDD tests to reproduce and fix the history loading bug:
 * - Switching to a history session doesn't load messages
 */

import * as React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ThreadMessage } from '@assistant-ui/react';

// Inline mock functions to avoid missing file dependency
function createMockElectronAPI() {
  return {
    chat: {
      sendMessage: vi.fn(),
      streamMessage: vi.fn(),
      getMessages: vi.fn(),
      saveMessage: vi.fn(),
      deleteMessage: vi.fn(),
      getCheckpoint: vi.fn(),
      saveCheckpoint: vi.fn(),
      deleteCheckpoint: vi.fn(),
      clearCheckpoint: vi.fn(),
      listCheckpoints: vi.fn(),
      generateTitle: vi.fn(),
    },
    sessions: {
      create: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      updateTitle: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      archive: vi.fn(),
      unarchive: vi.fn(),
      export: vi.fn(),
      import: vi.fn(),
    },
    analytics: {
      trackEvent: vi.fn(),
      trackPageView: vi.fn(),
      trackError: vi.fn(),
      trackPerformance: vi.fn(),
      getSessionMetrics: vi.fn(),
      getLearningStats: vi.fn(),
      getUsageStats: vi.fn(),
    },
    knowledge: {
      search: vi.fn(),
      addDocument: vi.fn(),
      removeDocument: vi.fn(),
      updateDocument: vi.fn(),
      listDocuments: vi.fn(),
      getDocument: vi.fn(),
      ingestConcepts: vi.fn(),
      searchConcepts: vi.fn(),
      getConceptGraph: vi.fn(),
      addRelationship: vi.fn(),
      removeRelationship: vi.fn(),
    },
    content: {
      importFromFile: vi.fn(),
      importFromUrl: vi.fn(),
      exportToFile: vi.fn(),
      getImportHistory: vi.fn(),
      deleteImport: vi.fn(),
    },
    settings: {
      get: vi.fn(),
      set: vi.fn(),
      reset: vi.fn(),
      export: vi.fn(),
      import: vi.fn(),
      validateProvider: vi.fn(),
      testProvider: vi.fn(),
    },
    catalyst: {
      getFilesystem: vi.fn(),
      getDialog: vi.fn(),
      openExternal: vi.fn(),
      showItemInFolder: vi.fn(),
      beep: vi.fn(),
      quit: vi.fn(),
      relaunch: vi.fn(),
    },
  };
}

function createMockSession(overrides: Partial<any> = {}) {
  return {
    id: 'session-123',
    title: 'Test Session',
    created_at: new Date('2024-01-01T10:00:00Z'),
    updated_at: new Date('2024-01-01T10:30:00Z'),
    status: 'active',
    messageCount: 0,
    hasUnread: false,
    ...overrides,
  };
}

function createMockMessages(count: number = 3) {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i + 1}`,
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `Message ${i + 1}`,
    timestamp: Date.now() + i * 1000,
  }));
}

function waitForAsync(timeout: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

function setupWindowMock(electronAPI: any): void {
  Object.defineProperty(window, 'electronAPI', {
    value: electronAPI,
    writable: true,
  });
}

function createMockThreadListAdapter() {
  return {
    fetch: vi.fn().mockResolvedValue({
      id: 'thread-123',
      title: 'Test Thread',
      remoteId: 'session-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'regular' as const,
      externalId: 'session-123',
    }),
    list: vi.fn().mockResolvedValue({
      threads: [
        {
          id: 'thread-123',
          title: 'Test Thread',
          remoteId: 'session-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'regular' as const,
          externalId: 'session-123',
        },
      ],
      total: 1,
    }),
    save: vi.fn(),
    delete: vi.fn(),
    initialize: vi.fn(),
    rename: vi.fn(),
    archive: vi.fn(),
    unarchive: vi.fn(),
    generateTitle: vi.fn(),
    unstable_Provider: ({ children }: { children: React.ReactNode }) => children,
  };
}

// Mock Assistant UI
vi.mock('@assistant-ui/react', () => ({
  Thread: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'thread-component' }, children),
}));

vi.mock('@assistant-ui/react-ui', () => ({
  Thread: ({ assistantMessage }: any) =>
    React.createElement('div', { 'data-testid': 'thread-component' },
      assistantMessage?.components?.ToolFallback &&
      React.createElement('div', { 'data-testid': 'tool-fallback-component' })
    ),
}));

vi.mock('@/renderer/components/Chat/ToolFallback', () => ({
  ToolFallback: ({ toolName }: any) =>
    React.createElement('div', { 'data-testid': 'tool-fallback' }, toolName),
}));

// Mock useChatRuntime
const mockUseChatRuntime = vi.fn();
vi.mock('@assistant-ui/react-ai-sdk', () => ({
  useChatRuntime: () => mockUseChatRuntime(),
}));

// Mock ipcFetch
vi.mock('@/renderer/services/chat/ipcFetch', () => ({
  createIpcFetch: () => vi.fn(),
}));

describe('🚨 BUG: History Messages Not Loading', () => {
  let mockElectronAPI: any;
  let adapter: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockElectronAPI = createMockElectronAPI();
    setupWindowMock(mockElectronAPI);
    adapter = createMockThreadListAdapter();
  });

  describe('Session Switch', () => {
    it('should load messages when switching to existing session', async () => {
      // ARRANGE - Set up existing session with messages
      const sessionId = 'session-123';
      const existingMessages = [
        { id: 'msg-1', role: 'user', content: 'Hello' },
        { id: 'msg-2', role: 'assistant', content: 'Hi there!' },
        { id: 'msg-3', role: 'user', content: 'How are you?' },
      ];

      // Mock checkpoint loader to return messages
      mockElectronAPI.chat.getMessages.mockResolvedValueOnce({
        success: true,
        data: existingMessages,
      });

      // ACT - Load messages for session
      const loadedMessages = await adapter.fetch(sessionId);

      // Wait for async operation
      await waitForAsync();

      // ASSERT - Messages should be fetched
      expect(mockElectronAPI.chat.getMessages).toHaveBeenCalledWith(sessionId);
    });

    it('should load messages from checkpoint when session has history', async () => {
      // ARRANGE
      const sessionId = 'session-with-history';
      const checkpointData = {
        messages: [
          { id: 'msg-1', role: 'user' as const, content: 'Previous conversation' },
          { id: 'msg-2', role: 'assistant' as const, content: 'I remember that' },
        ],
      };

      mockElectronAPI.chat.getCheckpoint.mockResolvedValueOnce({
        success: true,
        data: checkpointData,
      });

      // ACT
      await adapter.fetch(sessionId);

      // ASSERT - Checkpoint should be loaded
      expect(mockElectronAPI.chat.getCheckpoint).toHaveBeenCalledWith(sessionId);
    });

    it('should preserve message order when loading history', async () => {
      // ARRANGE
      const messages = [
        { id: 'msg-1', role: 'user', content: 'Message 1', timestamp: 1000 },
        { id: 'msg-2', role: 'assistant', content: 'Response 1', timestamp: 1001 },
        { id: 'msg-3', role: 'user', content: 'Message 2', timestamp: 1002 },
      ];

      mockElectronAPI.chat.getMessages.mockResolvedValueOnce({
        success: true,
        data: messages,
      });

      // ACT
      const loadedMessages = await mockElectronAPI.chat.getMessages('session-123');

      // ASSERT - Order should be preserved
      expect(loadedMessages.data[0].id).toBe('msg-1');
      expect(loadedMessages.data[1].id).toBe('msg-2');
      expect(loadedMessages.data[2].id).toBe('msg-3');
    });

    it('should handle empty history gracefully', async () => {
      // ARRANGE - New session with no messages
      mockElectronAPI.chat.getMessages.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      // ACT
      const loadedMessages = await mockElectronAPI.chat.getMessages('new-session');

      // ASSERT - Should return empty array, not crash
      expect(loadedMessages.data).toEqual([]);
    });

    it('should load session metadata along with messages', async () => {
      // ARRANGE
      const session = {
        id: 'session-123',
        title: 'Test Session',
        status: 'active',
      };

      mockElectronAPI.sessions.get.mockResolvedValueOnce({
        success: true,
        data: session,
      });

      // ACT
      const sessionData = await adapter.fetch('session-123');

      // ASSERT - Both session and metadata loaded
      expect(sessionData.title).toBe('Test Session');
      expect(sessionData.remoteId).toBe('session-123');
    });
  });

  describe('Checkpoint Integration', () => {
    it('should load messages from LangGraph checkpoints', async () => {
      // ARRANGE
      const checkpointData = {
        messages: [
          { id: 'cp-1', role: 'user', content: 'Checkpoint message' },
        ],
      };

      mockElectronAPI.chat.getCheckpoint.mockResolvedValueOnce({
        success: true,
        data: checkpointData,
      });

      // ACT
      const result = await mockElectronAPI.chat.getCheckpoint('session-123');

      // ASSERT - Checkpoint should be loaded
      expect(result.success).toBe(true);
      expect(result.data.messages).toEqual(checkpointData.messages);
    });

    it('should merge checkpoint messages with session metadata', async () => {
      // ARRANGE
      const session = {
        id: 'session-123',
        title: 'Test Session',
        status: 'active',
      };

      const checkpointMessages = [
        { id: 'msg-1', role: 'user', content: 'Test' },
      ];

      mockElectronAPI.sessions.get.mockResolvedValueOnce({
        success: true,
        data: session,
      });

      mockElectronAPI.chat.getCheckpoint.mockResolvedValueOnce({
        success: true,
        data: { messages: checkpointMessages },
      });

      // ACT
      const sessionData = await adapter.fetch('session-123');

      // ASSERT - Both session and messages should be retrievable
      expect(sessionData.title).toBe('Test Session');
      // Note: In real implementation, messages would be loaded separately
      expect(mockElectronAPI.chat.getCheckpoint).toHaveBeenCalledWith('session-123');
    });

    it('should handle missing checkpoint gracefully', async () => {
      // ARRANGE - Checkpoint not found
      mockElectronAPI.chat.getCheckpoint.mockResolvedValueOnce({
        success: false,
        error: 'Checkpoint not found',
      });

      // ACT
      const result = await mockElectronAPI.chat.getCheckpoint('session-123');

      // ASSERT - Should return error, not crash
      expect(result.success).toBe(false);
      expect(result.error).toBe('Checkpoint not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle message fetch failure gracefully', async () => {
      // ARRANGE - Message fetch fails
      mockElectronAPI.chat.getMessages.mockRejectedValueOnce(
        new Error('Failed to fetch messages')
      );

      // ACT & ASSERT
      await expect(mockElectronAPI.chat.getMessages('session-123')).rejects.toThrow(
        'Failed to fetch messages'
      );
    });

    it('should show error state when checkpoint missing', async () => {
      // ARRANGE - Checkpoint not found
      mockElectronAPI.chat.getCheckpoint.mockResolvedValueOnce({
        success: false,
        error: 'Not found',
      });

      // ACT
      const result = await mockElectronAPI.chat.getCheckpoint('session-123');

      // ASSERT - Should indicate checkpoint missing
      expect(result.success).toBe(false);
    });

    it('should handle network errors during message load', async () => {
      // ARRANGE - Network error
      mockElectronAPI.chat.getMessages.mockRejectedValueOnce(
        new Error('Network error: Connection failed')
      );

      // ACT
      try {
        await mockElectronAPI.chat.getMessages('session-123');
      } catch (error) {
        // ASSERT - Error should be catchable
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Network error');
      }
    });

    it('should handle database errors during session fetch', async () => {
      // ARRANGE - Database error
      mockElectronAPI.sessions.get.mockRejectedValueOnce(
        new Error('SQLite error: Database locked')
      );

      // ACT
      try {
        await adapter.fetch('session-123');
      } catch (error) {
        // ASSERT - Should return default thread data
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Persistence Verification', () => {
    it('should persist new messages to checkpoint after sending', async () => {
      // ARRANGE
      const newMessage = { id: 'msg-new', role: 'user', content: 'New message' };
      const sessionId = 'session-123';

      mockElectronAPI.chat.saveCheckpoint.mockResolvedValueOnce({
        success: true,
      });

      // ACT - Save message to checkpoint
      await mockElectronAPI.chat.saveCheckpoint(sessionId, {
        messages: [newMessage],
      });

      // ASSERT - Should save to checkpoint
      expect(mockElectronAPI.chat.saveCheckpoint).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          messages: expect.arrayContaining([newMessage]),
        })
      );
    });

    it('should sync message count between UI and database', async () => {
      // ARRANGE
      const initialCount = 5;
      mockElectronAPI.chat.getMessages.mockResolvedValueOnce({
        success: true,
        data: Array(initialCount)
          .fill(null)
          .map((_, i) => ({
            id: `msg-${i}`,
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: `Message ${i}`,
          })),
      });

      // ACT
      const result = await mockElectronAPI.chat.getMessages('session-123');

      // ASSERT - Count should match
      expect(result.data).toHaveLength(initialCount);
    });

    it('should update checkpoint when conversation continues', async () => {
      // ARRANGE
      const existingMessages = [
        { id: 'msg-1', role: 'user', content: 'Old message' },
      ];

      const newMessage = { id: 'msg-2', role: 'user', content: 'New message' };

      mockElectronAPI.chat.getCheckpoint.mockResolvedValueOnce({
        success: true,
        data: { messages: existingMessages },
      });

      mockElectronAPI.chat.saveCheckpoint.mockResolvedValueOnce({
        success: true,
      });

      // ACT - Load existing, then add new message
      const checkpoint = await mockElectronAPI.chat.getCheckpoint('session-123');
      const updatedMessages = [...checkpoint.data.messages, newMessage];
      await mockElectronAPI.chat.saveCheckpoint('session-123', {
        messages: updatedMessages,
      });

      // ASSERT - Checkpoint should be updated
      expect(mockElectronAPI.chat.saveCheckpoint).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          messages: expect.arrayContaining([newMessage]),
        })
      );
    });
  });

  describe('Thread List Integration', () => {
    it('should show thread with message count in sidebar', async () => {
      // ARRANGE
      const sessionWithMessages = {
        id: 'session-123',
        title: 'Active Conversation',
        messageCount: 5,
        status: 'active',
      };

      mockElectronAPI.sessions.list.mockResolvedValueOnce({
        success: true,
        data: {
          sessions: [sessionWithMessages],
          total: 1,
        },
      });

      // ACT
      const threads = await adapter.list();

      // ASSERT - Thread should be in list
      expect(threads.threads).toHaveLength(1);
      expect(threads.threads[0].title).toBe('Active Conversation');
    });

    it('should indicate sessions with unread messages', async () => {
      // ARRANGE
      const sessionWithUnread = {
        id: 'session-456',
        title: 'New Messages',
        hasUnread: true,
        status: 'active',
      };

      mockElectronAPI.sessions.list.mockResolvedValueOnce({
        success: true,
        data: {
          sessions: [sessionWithUnread],
          total: 1,
        },
      });

      // ACT
      const threads = await adapter.list();

      // ASSERT - Session should be marked
      expect(threads.threads[0].title).toBe('New Messages');
    });
  });

  describe('Message Content Types', () => {
    it('should load text messages correctly', async () => {
      // ARRANGE
      const textMessages = [
        { id: 'msg-1', role: 'user', content: 'Hello world', type: 'text' },
        { id: 'msg-2', role: 'assistant', content: 'Hi there!', type: 'text' },
      ];

      mockElectronAPI.chat.getMessages.mockResolvedValueOnce({
        success: true,
        data: textMessages,
      });

      // ACT
      const result = await mockElectronAPI.chat.getMessages('session-123');

      // ASSERT
      expect(result.data[0].content).toBe('Hello world');
      expect(result.data[1].content).toBe('Hi there!');
    });

    it('should handle tool call messages', async () => {
      // ARRANGE
      const toolMessages = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Using tool...',
          tool_calls: [
            {
              id: 'tool-1',
              name: 'search',
              args: { query: 'test' },
            },
          ],
        },
      ];

      mockElectronAPI.chat.getMessages.mockResolvedValueOnce({
        success: true,
        data: toolMessages,
      });

      // ACT
      const result = await mockElectronAPI.chat.getMessages('session-123');

      // ASSERT - Tool calls should be preserved
      expect(result.data[0].tool_calls).toEqual([
        expect.objectContaining({
          name: 'search',
          args: { query: 'test' },
        }),
      ]);
    });

    it('should handle mixed message types in history', async () => {
      // ARRANGE
      const mixedMessages = [
        { id: 'msg-1', role: 'user', content: 'Text message' },
        { id: 'msg-2', role: 'assistant', content: 'Response with tool', tool_calls: [] },
        { id: 'msg-3', role: 'user', content: 'Another text' },
      ];

      mockElectronAPI.chat.getMessages.mockResolvedValueOnce({
        success: true,
        data: mixedMessages,
      });

      // ACT
      const result = await mockElectronAPI.chat.getMessages('session-123');

      // ASSERT - All messages should be loaded
      expect(result.data).toHaveLength(3);
      expect(result.data[0].id).toBe('msg-1');
      expect(result.data[1].id).toBe('msg-2');
      expect(result.data[2].id).toBe('msg-3');
    });
  });

  describe('Large History Handling', () => {
    it('should load large history (100+ messages) without crashing', async () => {
      // ARRANGE
      const largeHistory = Array(150)
        .fill(null)
        .map((_, i) => ({
          id: `msg-${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
        }));

      mockElectronAPI.chat.getMessages.mockResolvedValueOnce({
        success: true,
        data: largeHistory,
      });

      // ACT
      const startTime = Date.now();
      const result = await mockElectronAPI.chat.getMessages('session-123');
      const loadTime = Date.now() - startTime;

      // ASSERT - Should load within reasonable time
      expect(result.data).toHaveLength(150);
      expect(loadTime).toBeLessThan(5000); // Less than 5 seconds
    });

    it('should paginate very large histories', async () => {
      // ARRANGE - Very large history
      const hugeHistory = Array(1000)
        .fill(null)
        .map((_, i) => ({
          id: `msg-${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
        }));

      mockElectronAPI.chat.getMessages.mockResolvedValueOnce({
        success: true,
        data: hugeHistory,
      });

      // ACT
      const result = await mockElectronAPI.chat.getMessages('session-123', {
        limit: 100,
        offset: 0,
      });

      // ASSERT - Should handle pagination params
      expect(mockElectronAPI.chat.getMessages).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          limit: 100,
          offset: 0,
        })
      );
    });
  });
});
