import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createThreadListAdapter } from '../useThreadListAdapter';

/**
 * Mock electronAPI for testing
 */
const createMockElectronAPI = () => ({
  sessions: {
    list: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    updateTitle: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
});

type MockElectronAPI = ReturnType<typeof createMockElectronAPI>;
type GlobalWithWindow = typeof globalThis & { window: { electronAPI: MockElectronAPI } };

/**
 * Injects the mock Electron API into the global window so the adapter
 * uses the test double instead of real IPC.
 */
const setupWindowMock = (mockAPI: MockElectronAPI) => {
  (globalThis as GlobalWithWindow).window = {
    electronAPI: mockAPI,
  };
};

describe('ThreadListAdapter', () => {
  let mockElectronAPI: ReturnType<typeof createMockElectronAPI>;
  let adapter: ReturnType<typeof createThreadListAdapter>;

  beforeEach(() => {
    mockElectronAPI = createMockElectronAPI();
    setupWindowMock(mockElectronAPI);
    adapter = createThreadListAdapter();
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should create thread with localId as threadId', async () => {
      const localId = 'thread-local-123';
      mockElectronAPI.sessions.create.mockResolvedValueOnce({
        success: true,
        data: { sessionId: 'session-123' },
      });

      const result = await adapter.initialize(localId);

      expect(mockElectronAPI.sessions.create).toHaveBeenCalledWith({
        title: 'New Chat',
        threadId: localId,
      });
      expect(result).toEqual({
        remoteId: localId,
        externalId: localId,
      });
    });

    it('should throw error when session creation fails', async () => {
      const localId = 'thread-local-123';
      mockElectronAPI.sessions.create.mockResolvedValueOnce({
        success: false,
        error: 'Failed to create session',
      });

      await expect(adapter.initialize(localId)).rejects.toThrow('Failed to create session');
    });

    it('should handle missing response data', async () => {
      const localId = 'thread-local-123';
      mockElectronAPI.sessions.create.mockResolvedValueOnce({
        success: true,
      });

      await expect(adapter.initialize(localId)).rejects.toThrow();
    });
  });

  describe('list', () => {
    it('should fetch threads from sessions.list', async () => {
      const mockSessions = {
        success: true,
        data: {
          sessions: [
            {
              id: 'session-1',
              title: 'Thread 1',
              topic: 'Topic 1',
              status: 'active',
            },
            {
              id: 'session-2',
              title: 'Thread 2',
              topic: 'Topic 2',
              status: 'completed',
            },
          ],
          total: 2,
          hasMore: false,
        },
      };
      mockElectronAPI.sessions.list.mockResolvedValueOnce(mockSessions);

      const result = await adapter.list();

      expect(mockElectronAPI.sessions.list).toHaveBeenCalledWith({ limit: 100 });
      expect(result.threads).toHaveLength(2);
      expect(result.threads[0]).toEqual({
        remoteId: 'session-1',
        externalId: 'session-1',
        status: 'regular',
        title: 'Thread 1',
      });
      expect(result.threads[1]).toEqual({
        remoteId: 'session-2',
        externalId: 'session-2',
        status: 'archived',
        title: 'Thread 2',
      });
    });

    it('should return empty threads on API error', async () => {
      mockElectronAPI.sessions.list.mockResolvedValueOnce({
        success: false,
        error: 'API Error',
      });

      const result = await adapter.list();

      expect(result.threads).toEqual([]);
    });

    it('should return empty threads when no data', async () => {
      mockElectronAPI.sessions.list.mockResolvedValueOnce({
        success: true,
        data: null,
      });

      const result = await adapter.list();

      expect(result.threads).toEqual([]);
    });

    it('should return empty threads when sessions payload is missing', async () => {
      mockElectronAPI.sessions.list.mockResolvedValueOnce({
        success: true,
        data: {
          total: 0,
          hasMore: false,
        },
      });

      const result = await adapter.list();

      expect(result.threads).toEqual([]);
    });

    it('should use title from session.title', async () => {
      mockElectronAPI.sessions.list.mockResolvedValueOnce({
        success: true,
        data: {
          sessions: [
            {
              id: 'session-1',
              title: 'Custom Title',
              topic: 'Topic 1',
              status: 'active',
            },
          ],
          total: 1,
          hasMore: false,
        },
      });

      const result = await adapter.list();

      expect(result.threads[0].title).toBe('Custom Title');
    });

    it('should fallback to topic if title missing', async () => {
      mockElectronAPI.sessions.list.mockResolvedValueOnce({
        success: true,
        data: {
          sessions: [
            {
              id: 'session-1',
              title: null,
              topic: 'Topic from Topic',
              status: 'active',
            },
          ],
          total: 1,
          hasMore: false,
        },
      });

      const result = await adapter.list();

      expect(result.threads[0].title).toBe('Topic from Topic');
    });

    it('should use "New Chat" as default title', async () => {
      mockElectronAPI.sessions.list.mockResolvedValueOnce({
        success: true,
        data: {
          sessions: [
            {
              id: 'session-1',
              title: null,
              topic: null,
              status: 'active',
            },
          ],
          total: 1,
          hasMore: false,
        },
      });

      const result = await adapter.list();

      expect(result.threads[0].title).toBe('New Chat');
    });
  });

  describe('rename', () => {
    it('should call sessions.updateTitle with threadId and title', async () => {
      const threadId = 'session-123';
      const newTitle = 'New Thread Title';
      mockElectronAPI.sessions.updateTitle.mockResolvedValueOnce({
        success: true,
      });

      await adapter.rename(threadId, newTitle);

      expect(mockElectronAPI.sessions.updateTitle).toHaveBeenCalledWith(
        threadId,
        newTitle,
      );
    });

    it('should throw error when update fails', async () => {
      const threadId = 'session-123';
      const newTitle = 'New Thread Title';
      mockElectronAPI.sessions.updateTitle.mockResolvedValueOnce({
        success: false,
        error: 'Update failed',
      });

      await expect(adapter.rename(threadId, newTitle)).rejects.toThrow(
        'Failed to rename session',
      );
    });
  });

  describe('archive', () => {
    it('should call sessions.update with completed status', async () => {
      const threadId = 'session-123';
      mockElectronAPI.sessions.update.mockResolvedValueOnce({
        success: true,
      });

      await adapter.archive(threadId);

      expect(mockElectronAPI.sessions.update).toHaveBeenCalledWith(threadId, {
        status: 'completed',
      });
    });

    it('should throw error when archive fails', async () => {
      const threadId = 'session-123';
      mockElectronAPI.sessions.update.mockResolvedValueOnce({
        success: false,
        error: 'Archive failed',
      });

      await expect(adapter.archive(threadId)).rejects.toThrow(
        'Failed to archive session',
      );
    });
  });

  describe('unarchive', () => {
    it('should call sessions.update with active status', async () => {
      const threadId = 'session-123';
      mockElectronAPI.sessions.update.mockResolvedValueOnce({
        success: true,
      });

      await adapter.unarchive(threadId);

      expect(mockElectronAPI.sessions.update).toHaveBeenCalledWith(threadId, {
        status: 'active',
      });
    });

    it('should throw error when unarchive fails', async () => {
      const threadId = 'session-123';
      mockElectronAPI.sessions.update.mockResolvedValueOnce({
        success: false,
        error: 'Unarchive failed',
      });

      await expect(adapter.unarchive(threadId)).rejects.toThrow(
        'Failed to unarchive session',
      );
    });
  });

  describe('delete', () => {
    it('should call sessions.delete with threadId', async () => {
      const threadId = 'session-123';
      mockElectronAPI.sessions.delete.mockResolvedValueOnce({
        success: true,
      });

      await adapter.delete(threadId);

      expect(mockElectronAPI.sessions.delete).toHaveBeenCalledWith(threadId);
    });

    it('should throw error when delete fails', async () => {
      const threadId = 'session-123';
      mockElectronAPI.sessions.delete.mockResolvedValueOnce({
        success: false,
        error: 'Delete failed',
      });

      await expect(adapter.delete(threadId)).rejects.toThrow(
        'Failed to delete session',
      );
    });
  });

  describe('fetch', () => {
    it('should retrieve thread metadata', async () => {
      const threadId = 'session-123';
      const mockSession = {
        id: 'session-123',
        title: 'Fetched Thread',
        status: 'active',
      };
      mockElectronAPI.sessions.get.mockResolvedValueOnce({
        success: true,
        data: mockSession,
      });

      const result = await adapter.fetch(threadId);

      expect(mockElectronAPI.sessions.get).toHaveBeenCalledWith(threadId);
      expect(result).toEqual({
        status: 'regular',
        remoteId: threadId,
        externalId: threadId,
        title: 'Fetched Thread',
      });
    });

    it('should return default thread when session not found', async () => {
      const threadId = 'session-123';
      mockElectronAPI.sessions.get.mockResolvedValueOnce({
        success: false,
        error: 'Not found',
      });

      const result = await adapter.fetch(threadId);

      expect(result).toEqual({
        status: 'regular',
        remoteId: threadId,
        title: 'New Chat',
      });
    });

    it('should return default thread when no data', async () => {
      const threadId = 'session-123';
      mockElectronAPI.sessions.get.mockResolvedValueOnce({
        success: true,
        data: null,
      });

      const result = await adapter.fetch(threadId);

      expect(result).toEqual({
        status: 'regular',
        remoteId: threadId,
        title: 'New Chat',
      });
    });

    it('should map completed status to archived', async () => {
      const threadId = 'session-123';
      const mockSession = {
        id: 'session-123',
        title: 'Archived Thread',
        status: 'completed',
      };
      mockElectronAPI.sessions.get.mockResolvedValueOnce({
        success: true,
        data: mockSession,
      });

      const result = await adapter.fetch(threadId);

      expect(result.status).toBe('archived');
    });

    it('should use default title when title missing', async () => {
      const threadId = 'session-123';
      const mockSession = {
        id: 'session-123',
        title: null,
        status: 'active',
      };
      mockElectronAPI.sessions.get.mockResolvedValueOnce({
        success: true,
        data: mockSession,
      });

      const result = await adapter.fetch(threadId);

      expect(result.title).toBe('New Chat');
    });
  });

  describe('generateTitle', () => {
    it('should generate title from first user message', async () => {
      mockElectronAPI.sessions.updateTitle.mockResolvedValue({
        success: true,
      });

      const messages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'How do I learn JavaScript?' }],
        },
      ];

      const stream = await adapter.generateTitle('thread-1', messages);
      expect(stream).toBeDefined();
      expect(mockElectronAPI.sessions.updateTitle).toHaveBeenCalledWith(
        'thread-1',
        'How do I learn JavaScript?'
      );
    });

    it('should truncate long titles', async () => {
      mockElectronAPI.sessions.updateTitle.mockResolvedValue({
        success: true,
      });

      const longText = 'This is a very long message that should be truncated to fit within the title limit';
      const messages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: [{ type: 'text' as const, text: longText }],
        },
      ];

      await adapter.generateTitle('thread-1', messages);
      expect(mockElectronAPI.sessions.updateTitle).toHaveBeenCalledWith(
        'thread-1',
        'This is a very long message that should be truncat...'
      );
    });

    it('should use default title when no user messages', async () => {
      mockElectronAPI.sessions.updateTitle.mockResolvedValue({
        success: true,
      });

      const messages = [
        {
          id: 'msg-1',
          role: 'assistant' as const,
          content: [{ type: 'text' as const, text: 'Hello!' }],
        },
      ];

      await adapter.generateTitle('thread-1', messages);
      expect(mockElectronAPI.sessions.updateTitle).toHaveBeenCalledWith(
        'thread-1',
        'New Chat'
      );
    });
  });
});
