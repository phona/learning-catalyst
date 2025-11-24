import { describe, it, expect, vi } from 'vitest';
import { createServiceContainer, createMockServiceContainer } from '../service-container';

// Mocks for factory functions so we can assert wiring without hitting real IPC
const sessionStub = { tag: 'session-service' };
const chatStub = { tag: 'chat-service' };
const analyticsStub = { tag: 'analytics-service', getDashboard: vi.fn() };
const fileStub = { tag: 'file-service' };

vi.mock('../session/session-service', () => ({
  createSessionService: vi.fn(() => sessionStub),
}));
vi.mock('../chat/chat-service', () => ({
  createChatService: vi.fn(() => chatStub),
}));
vi.mock('../analytics/analytics-service', () => ({
  createAnalyticsService: vi.fn(() => analyticsStub),
}));
vi.mock('../file/file-service', () => ({
  createFileService: vi.fn(() => fileStub),
}));

import * as sessionModule from '../session/session-service';

describe('service-container', () => {
  const fakeAPI = { marker: 'electronAPI' } as any;

  it('creates services with provided electronAPI client', () => {
    const container = createServiceContainer(fakeAPI);

    expect(container.session).toBe(sessionStub);
    expect(container.chat).toBe(chatStub);
    expect(container.analytics).toBe(analyticsStub);
    expect(container.file).toBe(fileStub);
    expect(vi.mocked(sessionModule.createSessionService)).toHaveBeenCalledWith(fakeAPI);
  });

  it('mock container exposes usable fallbacks', async () => {
    const mock = createMockServiceContainer();

    expect(mock.session).toBeDefined();
    expect(mock.chat).toBeDefined();
    expect(mock.analytics).toBeDefined();
    expect(mock.file).toBeDefined();
  });

  it('createTestServiceContainer merges overrides', () => {
    const override = {
      getWorkspacePath: vi.fn().mockResolvedValue('/override'),
      analytics: { getDashboard: vi.fn().mockResolvedValue({ success: true, data: { ok: true } }) },
    };

    const container = createMockServiceContainer(override as any);

    expect(container.analytics).toBeDefined();
    expect((container as any).marker).toBeUndefined(); // container still returns services
    expect(container.file).toBeDefined();
  });

  it('mock container wired methods execute happy-path flows', async () => {
    // Use real implementations (not the factory spies) for this integration-style check
    vi.resetModules();
    vi.doUnmock('../session/session-service');
    vi.doUnmock('../chat/chat-service');
    vi.doUnmock('../analytics/analytics-service');
    vi.doUnmock('../file/file-service');

    const { createMockServiceContainer: realCreateMockServiceContainer } =
      await vi.importActual<typeof import('../service-container')>('../service-container');

    const container = realCreateMockServiceContainer();

    // Chat APIs (via chat-service wrapping mock electronAPI)
    await container.chat.sendMessage('Hello', { sessionId: 'mock' });
    await container.chat.sendMessageStream(
      'Hello',
      () => {
        /* noop */
      },
      { sessionId: 'mock' },
    );
    await container.chat.checkPracticeOpportunity({ conversationId: 'mock', userMessage: 'Hi' });

    // Session APIs
    await container.session.listSessions({ limit: 5 });
    await container.session.createSession({ topic: 't', goals: [], difficulty: 'beginner' } as any);
    await container.session.searchSessions('q');
    await container.session.getRecentSessions(1);
    await container.session.getGlobalStatistics();

    // Analytics APIs
    await container.analytics.getDashboard();
    await container.analytics.getProgressChart({
      timeRange: '7days',
      metric: 'sessions',
    });
    await container.analytics.getAchievements();
    await container.analytics.getLearningTrends({ period: 'weekly' } as any);
    await container.analytics.getStudyStreak();
    await container.analytics.getTimeStats();
    await container.analytics.getConceptProgress('c1');
    await container.analytics.getSessionHistory();
    await container.analytics.exportData({ format: 'json' } as any);
    await container.analytics.importData({ format: 'json', data: '{}' } as any);
    await container.analytics.trackSession();
    await container.analytics.updateConceptProgress('c1', { mastery: 0.2 } as any);

    // File service (smoke)
    expect(container.file).toBeTruthy();
  });

});
