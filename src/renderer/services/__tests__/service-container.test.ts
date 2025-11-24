import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

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

let createServiceContainer: any;
let createTestServiceContainer: any;
let createMockServiceContainer: any;

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

  const baseElectronApi = { sessions: {}, chat: {}, analytics: {}, file: {} } as any;

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
    const container = createTestServiceContainer(overrides as any);

    // The merged API passed into service creators should contain the override
    const passedApi = sessionSpy.mock.calls.at(-1)?.[0];
    expect(passedApi.readFile).toBe(overrides.readFile);
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
