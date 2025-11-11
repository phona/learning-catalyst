import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionService } from '../sessionService';
import type { ConversationMessage, MemorySession } from '@/shared/types/session';

const mockSessionsAPI = () => ({
  saveSessionWithMessages: vi.fn().mockResolvedValue({ success: true, sessionId: 'session_123' }),
  saveMessage: vi.fn().mockResolvedValue({ success: true }),
  updateTitle: vi.fn().mockResolvedValue({ success: true }),
  getRecentSessions: vi.fn().mockResolvedValue({ success: true, sessions: [] }),
  getStatistics: vi.fn().mockResolvedValue({
    success: true,
    statistics: {
      totalSessions: 2,
      totalMessages: 10,
      totalUserMessages: 5,
      totalAssistantMessages: 5,
      totalTokensUsed: 100,
      averageMessagesPerSession: 5
    }
  }),
  list: vi.fn().mockResolvedValue({ success: true, sessions: [], total: 0, hasMore: false })
});

describe('SessionService (renderer)', () => {
  let service: SessionService;
  let apiMock: ReturnType<typeof mockSessionsAPI>;

  beforeEach(() => {
    apiMock = mockSessionsAPI();
    (window as any).electronAPI = {
      sessions: apiMock
    } as any;
    service = new SessionService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves session with messages via IPC', async () => {
    const memorySession = {
      id: 'session_123',
      title: 'Test Session',
      metadata: {},
      context: {},
      checkpoints: []
    } as MemorySession;
    const messages = [
      {
        id: 'msg',
        role: 'user',
        content: 'hello',
        timestamp: new Date()
      } as ConversationMessage
    ];

    const sessionId = await service.saveSessionWithMessages(memorySession, messages);
    expect(apiMock.saveSessionWithMessages).toHaveBeenCalledWith(memorySession, messages);
    expect(sessionId).toBe('session_123');
  });

  it('saves individual messages', async () => {
    const message = {
      id: 'msg',
      role: 'assistant',
      content: 'hi',
      timestamp: new Date()
    } as ConversationMessage;

    await service.saveMessage('session_1', message);
    expect(apiMock.saveMessage).toHaveBeenCalledWith('session_1', message);
  });

  it('updates titles via IPC', async () => {
    await service.updateSessionTitle('session_1', 'New Title');
    expect(apiMock.updateTitle).toHaveBeenCalledWith('session_1', 'New Title');
  });

  it('returns recent sessions', async () => {
    apiMock.getRecentSessions.mockResolvedValueOnce({
      success: true,
      sessions: [{ id: 'session_1' }]
    });

    const sessions = await service.getRecentSessions(5);
    expect(apiMock.getRecentSessions).toHaveBeenCalledWith({ limit: 5 });
    expect(sessions).toHaveLength(1);
  });

  it('returns global statistics', async () => {
    const stats = await service.getGlobalStatistics();
    expect(apiMock.getStatistics).toHaveBeenCalled();
    expect(stats.totalSessions).toBe(2);
  });

  it('throws when IPC reports failure', async () => {
    apiMock.saveMessage.mockResolvedValueOnce({ success: false, error: 'boom' });
    await expect(
      service.saveMessage('session_1', {
        id: 'msg',
        role: 'user',
        content: 'hi',
        timestamp: new Date()
      } as ConversationMessage)
    ).rejects.toThrow('boom');
  });
});
