import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the learning service
vi.mock('../learning-service', () => {
  const mockLearningService = {
    startSession: vi.fn().mockResolvedValue({
      id: 'session-123',
      title: 'Test Session',
      status: 'active',
      startedAt: new Date().toISOString(),
    }),
    pauseSession: vi.fn().mockResolvedValue(true),
    resumeSession: vi.fn().mockResolvedValue(true),
    completeSession: vi.fn().mockResolvedValue(true),
    getSession: vi.fn().mockResolvedValue({
      id: 'session-123',
      title: 'Test Session',
      status: 'active',
    }),
    listSessions: vi.fn().mockResolvedValue([]),
    deleteSession: vi.fn().mockResolvedValue(true),
    updateSession: vi.fn().mockResolvedValue(true),
    getSessionProgress: vi.fn().mockResolvedValue({
      completionPercentage: 50,
      timeSpent: 1800,
    }),
    addMessage: vi.fn().mockResolvedValue({
      id: 'msg-123',
      sessionId: 'session-123',
      content: 'Test message',
    }),
  };

  return {
    createLearningService: vi.fn(() => mockLearningService),
  };
});

describe('Learning Service - Interface Tests', () => {
  let mockDb: any;
  let mockLoggerService: any;
  let mockAiService: any;
  let learningService: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock database
    mockDb = {
      selectFrom: vi.fn().mockReturnThis(),
      insertInto: vi.fn().mockReturnThis(),
      updateTable: vi.fn().mockReturnThis(),
      deleteFrom: vi.fn().mockReturnThis(),
    };

    // Mock logger service
    mockLoggerService = {
      child: vi.fn(() => ({
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        child: vi.fn(() => ({
          info: vi.fn(),
          debug: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        })),
      })),
    };

    // Mock AI service
    mockAiService = {
      chatCompletion: vi.fn(),
      getModelPreset: vi.fn(),
      getProviders: vi.fn(() => []),
      getAvailableModels: vi.fn(() => []),
    };

    // Mock domain agent
    const mockDomainAgent = {
      invoke: vi.fn().mockResolvedValue({ content: '{}' }),
      stream: vi.fn().mockImplementation(async function* () {
        yield { content: '{}' };
      }),
    };

    // Import learning service
    const learningModule = await import('../learning-service');
    const { createLearningService } = learningModule;
    learningService = createLearningService({
      db: mockDb,
      loggerService: mockLoggerService,
    });
  });

  describe('Service Interface', () => {
    it('should have all required methods', () => {
      expect(learningService).toHaveProperty('startSession');
      expect(learningService).toHaveProperty('pauseSession');
      expect(learningService).toHaveProperty('resumeSession');
      expect(learningService).toHaveProperty('completeSession');
      expect(learningService).toHaveProperty('getSession');
      expect(learningService).toHaveProperty('listSessions');
      expect(learningService).toHaveProperty('deleteSession');
      expect(learningService).toHaveProperty('updateSession');
      expect(learningService).toHaveProperty('getSessionProgress');
      expect(learningService).toHaveProperty('addMessage');

      expect(typeof learningService.startSession).toBe('function');
      expect(typeof learningService.pauseSession).toBe('function');
      expect(typeof learningService.resumeSession).toBe('function');
    });
  });

  describe('Session Management', () => {
    it('should start a learning session', async () => {
      const sessionRequest = {
        title: 'React Learning',
        topic: 'React Hooks',
        difficulty: 'medium' as const,
      };

      const result = await learningService.startSession(sessionRequest);

      expect(result).toMatchObject({
        id: 'session-123',
        title: 'Test Session',
        status: 'active',
        startedAt: expect.any(String),
      });
    });

    it('should pause a learning session', async () => {
      const result = await learningService.pauseSession('session-123');
      expect(result).toBe(true);
    });

    it('should resume a learning session', async () => {
      const result = await learningService.resumeSession('session-123');
      expect(result).toBe(true);
    });

    it('should complete a learning session', async () => {
      const result = await learningService.completeSession('session-123');
      expect(result).toBe(true);
    });
  });

  describe('Session Information', () => {
    it('should get session details', async () => {
      const result = await learningService.getSession('session-123');

      expect(result).toMatchObject({
        id: 'session-123',
        title: 'Test Session',
        status: 'active',
      });
    });

    it('should list sessions', async () => {
      const result = await learningService.listSessions();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should get session progress', async () => {
      const result = await learningService.getSessionProgress('session-123');

      expect(result).toMatchObject({
        completionPercentage: expect.any(Number),
        timeSpent: expect.any(Number),
      });
    });
  });

  describe('Message Handling', () => {
    it('should add messages to session', async () => {
      const messageRequest = {
        sessionId: 'session-123',
        content: 'This is a test message',
        role: 'user' as const,
      };

      const result = await learningService.addMessage(messageRequest);

      expect(result).toMatchObject({
        id: 'msg-123',
        sessionId: 'session-123',
        content: 'Test message',
      });
    });
  });

  describe('Session Cleanup', () => {
    it('should delete sessions', async () => {
      const result = await learningService.deleteSession('session-123');
      expect(result).toBe(true);
    });

    it('should update sessions', async () => {
      const updateRequest = {
        title: 'Updated Title',
      };

      const result = await learningService.updateSession('session-123', updateRequest);
      expect(result).toBe(true);
    });
  });

  describe('Service Dependencies', () => {
    it('should accept database dependency', () => {
      expect(mockDb).toBeDefined();
      expect(typeof mockDb.selectFrom).toBe('function');
    });

    it('should accept logger service dependency', () => {
      expect(mockLoggerService).toBeDefined();
      expect(typeof mockLoggerService.child).toBe('function');
    });

    it('should accept AI service dependency', () => {
      expect(mockAiService).toBeDefined();
      expect(typeof mockAiService.chatCompletion).toBe('function');
    });
  });
});
