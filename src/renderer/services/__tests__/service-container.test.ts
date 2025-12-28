import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import type { ElectronAPI } from '@/shared/types/electron-api';
import type { ServiceContainer } from '../service-container';

const sessionStub = { name: 'session-stub' };
const chatStub = { name: 'chat-stub' };
const analyticsStub = { name: 'analytics-stub' };
const fileStub = { name: 'file-stub' };

const sessionSpy = vi.fn(() => sessionStub);
const chatSpy = vi.fn(() => chatStub);
const analyticsSpy = vi.fn(() => analyticsStub);
const fileSpy = vi.fn(() => fileStub);

vi.mock('../session/session-service', () => ({
  createSessionService: sessionSpy,
}));
vi.mock('../chat/chat-service', () => ({
  createChatService: chatSpy,
}));
vi.mock('../analytics/analytics-service', () => ({
  createAnalyticsService: analyticsSpy,
}));
vi.mock('../file/file-service', () => ({
  createFileService: fileSpy,
}));

let createServiceContainer: (electronAPI: ElectronAPI) => ServiceContainer;
let createTestServiceContainer: (mockElectronAPI: Partial<ElectronAPI>) => ServiceContainer;
let createMockServiceContainer: (overrides?: Partial<ElectronAPI>) => ServiceContainer;

beforeAll(async () => {
  const mod = await import('../service-container');
  createServiceContainer = mod.createServiceContainer;
  createTestServiceContainer = mod.createTestServiceContainer;
  createMockServiceContainer = mod.createMockServiceContainer;
});

describe('service-container factories', () => {
  beforeEach(() => {
    sessionSpy.mockClear();
    chatSpy.mockClear();
    analyticsSpy.mockClear();
    fileSpy.mockClear();
  });

  const baseElectronApi = {
    sessions: {
      list: vi.fn().mockResolvedValue({ success: true, data: { sessions: [], total: 0, hasMore: false } }),
      create: vi.fn().mockResolvedValue({ success: true, data: { sessionId: 'test-id' } }),
      get: vi.fn().mockResolvedValue({ success: true, data: null }),
      delete: vi.fn().mockResolvedValue({ success: true, data: { deleted: true } }),
      update: vi.fn().mockResolvedValue({ success: true, data: null }),
      updateTitle: vi.fn().mockResolvedValue({ success: true }),
      getRecentSessions: vi.fn().mockResolvedValue({ success: true, data: [] }),
      search: vi.fn().mockResolvedValue({ success: true, data: { sessions: [], total: 0, hasMore: false } }),
      getStatistics: vi.fn().mockResolvedValue({ success: true, data: {
        totalSessions: 0,
        totalMessages: 0,
        totalUserMessages: 0,
        totalAssistantMessages: 0,
        totalTokensUsed: 0,
        averageMessagesPerSession: 0,
      }}),
    },
    chat: {
      startConversation: vi.fn().mockResolvedValue({ success: true, data: null }),
      sendMessage: vi.fn().mockResolvedValue({ success: true, data: null }),
      sendMessageStream: vi.fn().mockResolvedValue({ success: true, data: { started: true } }),
      getTypingIndicator: vi.fn().mockResolvedValue({ success: true, data: null }),
      getConversationHistory: vi.fn().mockResolvedValue({ success: true, data: null }),
      pauseConversation: vi.fn().mockResolvedValue({ success: true, data: { message: 'paused' } }),
      resumeConversation: vi.fn().mockResolvedValue({ success: true, data: null }),
      endConversation: vi.fn().mockResolvedValue({ success: true, data: null }),
      checkPracticeOpportunity: vi.fn().mockResolvedValue({ success: true, data: null }),
      getPracticeSuggestion: vi.fn().mockResolvedValue({ success: true, data: null }),
      searchPrompts: vi.fn().mockResolvedValue({ success: true, data: { prompts: [], pagination: { hasMore: false } } }),
      resumeWorkflow: vi.fn().mockResolvedValue({ success: true, data: { success: true, resumed: true } }),
    },
    analytics: {
      getDashboard: vi.fn().mockResolvedValue({ success: true, data: null }),
      getProgressChart: vi.fn().mockResolvedValue({ success: true, data: null }),
      getAchievements: vi.fn().mockResolvedValue({ success: true, data: [] }),
      unlockAchievement: vi.fn().mockResolvedValue({ success: true, data: null }),
      getUsageStats: vi.fn().mockResolvedValue({ success: true, data: null }),
      getTokenUsage: vi.fn().mockResolvedValue({ success: true, data: null }),
      updateConceptProgress: vi.fn().mockResolvedValue({ success: true }),
      getLearningTrends: vi.fn().mockResolvedValue({ success: true, data: null }),
      getStudyStreak: vi.fn().mockResolvedValue({ success: true, data: null }),
      getTimeStats: vi.fn().mockResolvedValue({ success: true, data: null }),
      getConceptProgress: vi.fn().mockResolvedValue({ success: true, data: null }),
      getSessionHistory: vi.fn().mockResolvedValue({ success: true, data: [] }),
      checkAchievements: vi.fn().mockResolvedValue({ success: true, data: [] }),
      exportData: vi.fn().mockResolvedValue({ success: true, data: '{}' }),
      importData: vi.fn().mockResolvedValue({ success: true, data: null }),
      trackSession: vi.fn().mockResolvedValue({ success: true, data: 'tracking-id' }),
    },
    aiSDK: {
      stream: vi.fn().mockReturnValue(() => {}),
    },
    knowledge: {
      searchKnowledge: vi.fn().mockResolvedValue({ success: true, data: null }),
      exploreConcept: vi.fn().mockResolvedValue({ success: true, data: null }),
      parseConcepts: vi.fn().mockResolvedValue({ success: true, data: null }),
      ingestConcepts: vi.fn().mockResolvedValue({ success: true, data: null }),
      getRelatedConcepts: vi.fn().mockResolvedValue({ success: true, data: null }),
      getKnowledgeMap: vi.fn().mockResolvedValue({ success: true, data: null }),
      clearParsingJobs: vi.fn().mockResolvedValue({ success: true, data: { removed: 0 } }),
    },
    learning: {
      getLearningPath: vi.fn().mockResolvedValue({ success: true, data: null }),
      startLearningSession: vi.fn().mockResolvedValue({ success: true, data: null }),
      getSessionProgress: vi.fn().mockResolvedValue({ success: true, data: null }),
      pauseSession: vi.fn().mockResolvedValue({ success: true, data: { resumeData: {} } }),
      resumeSession: vi.fn().mockResolvedValue({ success: true, data: null }),
      completeSession: vi.fn().mockResolvedValue({ success: true, data: null }),
      getRecentSessions: vi.fn().mockResolvedValue({ success: true, data: [] }),
      searchSessions: vi.fn().mockResolvedValue({ success: true, data: null }),
    },
    agents: {},
    content: {},
    settings: {},
    catalyst: {},
    getWorkspacePath: vi.fn().mockResolvedValue('/mock/workspace'),
    readDirectory: vi.fn().mockResolvedValue([]),
    readFile: vi.fn().mockResolvedValue(''),
    writeFile: vi.fn().mockResolvedValue(undefined as void),
    existsFile: vi.fn().mockResolvedValue(false),
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
    showSaveDialog: vi.fn().mockResolvedValue({ canceled: true, filePath: '' }),
    onMenuAction: vi.fn(),
    onIPCError: vi.fn().mockReturnValue(() => {}),
    handleError: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue({ status: 'healthy' as const, apis: {} }),
    getVersion: vi.fn().mockResolvedValue({ version: '1.0.0', build: 'mock', platform: 'mock' }),
    trackEvent: vi.fn().mockResolvedValue(undefined as void),
    getErrorBuffer: vi.fn().mockResolvedValue([]),
    clearErrorBuffer: vi.fn().mockResolvedValue({ cleared: true }),
    relaunchApp: vi.fn().mockResolvedValue({ relaunching: false }),
    awaitReady: vi.fn().mockResolvedValue({ status: 'ready' as const, ready: { ipcHandlersRegistered: true } }),
    awaitConfigChange: vi.fn().mockResolvedValue({ changedKeys: [], timestamp: Date.now() }),
  } as ElectronAPI;

  it('wires services with provided electronAPI', () => {
    const container = createServiceContainer(baseElectronApi);

    expect(sessionSpy).toHaveBeenCalledWith(baseElectronApi);
    expect(chatSpy).toHaveBeenCalledWith(baseElectronApi);
    expect(analyticsSpy).toHaveBeenCalledWith(baseElectronApi);
    expect(fileSpy).toHaveBeenCalledWith(baseElectronApi);

    expect(container.session).toBe(sessionStub);
    expect(container.chat).toBe(chatStub);
    expect(container.analytics).toBe(analyticsStub);
    expect(container.file).toBe(fileStub);
  });

  it('applies overrides when creating test container', () => {
    const overrides = { readFile: vi.fn().mockResolvedValue('override') };
    const container = createTestServiceContainer(overrides as Partial<ElectronAPI>);

    // The merged API passed into service creators should contain the override
    const sessionCalls = sessionSpy.mock.calls;
    expect(sessionCalls.length).toBeGreaterThan(0);
    const passedApi = sessionCalls[sessionCalls.length - 1]?.[0] as ElectronAPI | undefined;
    expect(passedApi?.readFile).toBe(overrides.readFile);
    expect(container.session).toBe(sessionStub);
  });

  it('creates mock service container without overrides', () => {
    const container = createMockServiceContainer();

    expect(container.session).toBe(sessionStub);
    expect(sessionSpy).toHaveBeenCalled();
    expect(chatSpy).toHaveBeenCalled();
    expect(analyticsSpy).toHaveBeenCalled();
    expect(fileSpy).toHaveBeenCalled();
  });
});
