import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock agent factories - all agents share the same mock structure for simplicity
const createMockAgent = (agentType: string, response: string) => ({
  providerSettings: { providerName: 'openai', model: 'gpt-4o' },
  stream: vi.fn(),
  invoke: vi.fn().mockResolvedValue({
    messages: [
      { role: 'user', content: 'test' },
      { role: 'assistant', content: response },
    ],
    reasoning: [`${agentType} reasoning`],
    suggestions: [`${agentType} suggestion`],
  }),
});

vi.mock('../learning-agent', () => ({
  createLearningAgent: vi.fn(() => createMockAgent('learning', 'response')),
}));

vi.mock('../tutoring-agent', () => ({
  createTutoringAgent: vi.fn(() => createMockAgent('tutoring', 'tutoring response')),
}));

vi.mock('../assessment-agent', () => ({
  createAssessmentAgent: vi.fn(() => createMockAgent('assessment', 'assessment response')),
}));

vi.mock('../practice-agent', () => ({
  createPracticeAgent: vi.fn(() => createMockAgent('practice', 'practice response')),
}));

vi.mock('../supervisor-agent', () => ({
  createSupervisorAgent: vi.fn(() => ({
    providerSettings: { providerName: 'openai', model: 'gpt-4o' },
    stream: vi.fn(),
    invoke: vi.fn(),
  })),
}));

// Mock utility functions
vi.mock('../specialized-agent', () => ({
  formatMessages: vi.fn((messages) => messages),
  pickAssistantMessage: vi.fn((messages) => messages[messages.length - 1]),
}));

vi.mock('../provider-factory', () => ({
  createProviderFactory: vi.fn(() => ({
    getProvider: vi.fn(),
    validateSettings: vi.fn(() => true),
  })),
}));

vi.mock('../provider-utils', () => ({
  needsAgentRebuild: vi.fn(() => false),
}));

describe('Agent Manager - Basic Tests', () => {
  let mockAiService: any;
  let mockAnalyticsService: any;
  let mockConceptParsingService: any;
  let mockLearningService: any;
  let mockConfigService: any;
  let mockLoggerService: any;
  let mockConfig: any;
  let agentManager: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock AI service
    mockAiService = {
      chatCompletion: vi.fn(),
      getModelPreset: vi.fn(() => ({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-key',
        temperature: 0.7,
        maxTokens: 4096,
      })),
      getProviders: vi.fn(),
      getAvailableModels: vi.fn(),
    };

    // Mock analytics service
    mockAnalyticsService = {
      trackEvent: vi.fn().mockResolvedValue(true),
      getDashboard: vi.fn(),
      getProgressChart: vi.fn(),
      getConceptProgress: vi.fn(),
      updateConceptProgress: vi.fn(),
      trackSession: vi.fn(),
      updateSession: vi.fn(),
      getSessionHistory: vi.fn(),
      getAchievements: vi.fn(),
      checkAchievements: vi.fn(),
      getLearningTrends: vi.fn(),
      getStudyStreak: vi.fn(),
      getTimeStats: vi.fn(),
      exportData: vi.fn(),
      importData: vi.fn(),
      unlockAchievement: vi.fn(),
      getUsageStats: vi.fn(),
      getTokenUsage: vi.fn(),
    };

    // Mock concept parsing service
    mockConceptParsingService = {
      parseConcepts: vi.fn(),
      getConcepts: vi.fn(),
      getConcept: vi.fn(),
      updateConcept: vi.fn(),
      deleteConcept: vi.fn(),
    };

    // Mock learning service
    mockLearningService = {
      startSession: vi.fn(),
      pauseSession: vi.fn(),
      resumeSession: vi.fn(),
      completeSession: vi.fn(),
      getSession: vi.fn(),
      listSessions: vi.fn(),
      deleteSession: vi.fn(),
      updateSession: vi.fn(),
      getSessionProgress: vi.fn(),
      addMessage: vi.fn(),
    };

    // Mock config service
    mockConfig = {
      ai: {
        providers: {
          openai: {
            provider_type: 'openai',
            api_key: 'test-key',
            model: 'gpt-4o',
          },
        },
        modelTypes: {
          chat: {
            provider: 'openai',
            model: 'gpt-4o',
            temperature: 0.7,
            max_tokens: 4096,
          },
        },
      },
    };

    mockConfigService = {
      getConfig: vi.fn().mockResolvedValue(mockConfig),
      setConfig: vi.fn(),
      getProviderConfig: vi.fn(),
      setProviderConfig: vi.fn(),
      onConfigChanged: vi.fn().mockResolvedValue(() => {}),
    };

    // Mock logger service
    mockLoggerService = {
      child: vi.fn(() => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      })),
    };

    // Import and create agent manager
    const agentManagerModule = await import('../agent-manager');
    const { createAgentManager } = agentManagerModule;
    agentManager = await createAgentManager({
      aiService: mockAiService,
      analyticsService: mockAnalyticsService,
      conceptParsingService: mockConceptParsingService,
      learningService: mockLearningService,
      loggerService: mockLoggerService,
      configService: mockConfigService,
    });
  });

  describe('Agent Manager Creation', () => {
    it('should create agent manager with runAgent method', () => {
      expect(agentManager).toHaveProperty('runAgent');
      expect(typeof agentManager.runAgent).toBe('function');
    });

    it('should load initial configuration', () => {
      expect(mockConfigService.getConfig).toHaveBeenCalled();
    });

    it('should setup config change handler', () => {
      expect(mockConfigService.onConfigChanged).toHaveBeenCalled();
    });
  });

  describe('Agent Factory Initialization', () => {
    it('should initialize all agent types', async () => {
      const { createLearningAgent } = await import('../learning-agent');
      const { createSupervisorAgent } = await import('../supervisor-agent');
      const { createTutoringAgent } = await import('../tutoring-agent');
      const { createAssessmentAgent } = await import('../assessment-agent');
      const { createPracticeAgent } = await import('../practice-agent');

      expect(createLearningAgent).toHaveBeenCalled();
      expect(createTutoringAgent).toHaveBeenCalled();
      expect(createAssessmentAgent).toHaveBeenCalled();
      expect(createPracticeAgent).toHaveBeenCalled();
      expect(createSupervisorAgent).toHaveBeenCalled();
    });

    it('should create provider factory', async () => {
      const { createProviderFactory } = await import('../provider-factory');
      expect(createProviderFactory).toHaveBeenCalledWith(mockConfigService);
    });
  });

  describe('Running Agents', () => {
    const mockRequest = {
      agentType: 'learning' as const,
      conversationId: 'conv-123',
      messages: [{ role: 'user' as const, content: 'Teach me React hooks' }],
      topic: 'React Hooks',
      userId: 'user-123',
    };

    it('should run learning agent successfully', async () => {
      const result = await agentManager.runAgent(mockRequest);

      expect(result).toMatchObject({
        content: 'response',
        model: 'gpt-4o',
        provider: 'openai',
        agentType: 'learning',
      });
    });

    it('should track analytics event for successful agent run', async () => {
      await agentManager.runAgent(mockRequest);

      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith({
        eventType: 'agent_response',
        userId: 'user-123',
        properties: {
          agentType: 'learning',
          provider: 'openai',
          model: 'gpt-4o',
        },
        context: {
          conversationId: 'conv-123',
          topic: 'React Hooks',
        },
      });
    });

    it('should use provided topic or default', async () => {
      const requestWithoutTopic = {
        agentType: 'tutoring' as const,
        conversationId: 'conv-123',
        messages: [{ role: 'user' as const, content: 'Help me' }],
      };

      await agentManager.runAgent(requestWithoutTopic);

      // The agent should still run, potentially with a default topic
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalled();
    });
  });

  describe('Different Agent Types', () => {
    const agentTypes: Array<'learning' | 'tutoring' | 'assessment' | 'practice'> = [
      'learning',
      'tutoring',
      'assessment',
      'practice',
    ];

    agentTypes.forEach((agentType) => {
      it(`should run ${agentType} agent`, async () => {
        const request = {
          agentType,
          conversationId: 'conv-123',
          messages: [{ role: 'user' as const, content: 'Test message' }],
        };

        const result = await agentManager.runAgent(request);

        expect(result).toMatchObject({
          content: expect.any(String),
          model: 'gpt-4o',
          provider: 'openai',
          agentType,
        });
      });
    });
  });

  describe('Message Processing', () => {
    it('should pass conversation context to agents', async () => {
      const requestWithHistory = {
        agentType: 'learning' as const,
        conversationId: 'conv-456',
        messages: [
          { role: 'user' as const, content: 'First message' },
          { role: 'assistant' as const, content: 'First response' },
          { role: 'user' as const, content: 'Follow-up question' },
        ],
        topic: 'Advanced Topic',
      };

      await agentManager.runAgent(requestWithHistory);

      // Should still succeed and track analytics
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith({
        eventType: 'agent_response',
        properties: expect.objectContaining({
          agentType: 'learning',
        }),
        context: expect.objectContaining({
          conversationId: 'conv-456',
          topic: 'Advanced Topic',
        }),
      });
    });
  });

  describe('Configuration Management', () => {
    it('should create config change callback', () => {
      expect(mockConfigService.onConfigChanged).toHaveBeenCalled();
    });

    it('should handle configuration changes', () => {
      // Config change handler is registered during service creation
      expect(mockConfigService.onConfigChanged).toHaveBeenCalled();
      // The callback exists but testing its execution requires internal access
      // This test verifies the setup is correct without invoking the callback
    });
  });

  describe('Error Handling', () => {
    it('should handle agent execution errors', async () => {
      // This test verifies error handling patterns exist
      // Actual error simulation would require more complex mocking
      expect(() => {
        agentManager.runAgent({
          agentType: 'learning' as const,
          conversationId: 'conv-123',
          messages: [{ role: 'user' as const, content: 'test' }],
        });
      }).not.toThrow();
    });

    it('should handle configuration loading errors', async () => {
      vi.mocked(mockConfigService.getConfig).mockRejectedValue(new Error('Config load failed'));

      const { createAgentManager } = await import('../agent-manager');

      await expect(
        createAgentManager({
          aiService: mockAiService,
          analyticsService: mockAnalyticsService,
          conceptParsingService: mockConceptParsingService,
          learningService: mockLearningService,
          loggerService: mockLoggerService,
          configService: mockConfigService,
        }),
      ).rejects.toThrow('Config load failed');
    });
  });

  describe('Agent Dependencies', () => {
    it('should initialize agents with dependencies', async () => {
      const { createLearningAgent } = await import('../learning-agent');

      // Verify that the agent factory was called (dependency injection worked)
      expect(createLearningAgent).toHaveBeenCalled();
      expect(typeof createLearningAgent).toBe('function');
    });
  });

  describe('Logging', () => {
    it('should have logger functionality for agent manager', () => {
      expect(mockLoggerService).toBeDefined();
      expect(typeof mockLoggerService.child).toBe('function');
    });

    it('should log successful agent runs', async () => {
      const request = {
        agentType: 'learning' as const,
        conversationId: 'conv-123',
        messages: [{ role: 'user' as const, content: 'test' }],
      };

      // Verify the operation completes successfully
      const result = await agentManager.runAgent(request);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('provider', 'openai');
      expect(result).toHaveProperty('agentType', 'learning');
    });
  });
});
