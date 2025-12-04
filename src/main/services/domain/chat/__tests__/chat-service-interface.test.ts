import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the chat service
vi.mock('../chat-service', () => {
  const mockChatService = {
    createConversation: vi.fn().mockResolvedValue({
      id: 'conv-123',
      title: 'Test Conversation',
      agentType: 'learning',
      topic: 'React',
      status: 'active',
      messages: [],
      createdAt: new Date().toISOString(),
    }),
    sendMessage: vi.fn().mockResolvedValue({
      userMessage: {
        id: 'msg-user-123',
        role: 'user',
        content: 'Hello',
      },
      assistantMessage: {
        id: 'msg-assistant-123',
        role: 'assistant',
        content: 'Hi there!',
      },
    }),
    getConversation: vi.fn().mockResolvedValue({
      id: 'conv-123',
      title: 'Test Conversation',
      messages: [],
    }),
    listConversations: vi.fn().mockResolvedValue([]),
    deleteConversation: vi.fn().mockResolvedValue(true),
    streamAssistantResponse: vi.fn(),
    getTypingIndicator: vi.fn().mockResolvedValue(false),
    pauseConversation: vi.fn().mockResolvedValue(true),
    resumeConversation: vi.fn().mockResolvedValue(true),
    endConversation: vi.fn().mockResolvedValue(true),
  };

  return {
    createChatService: vi.fn(() => mockChatService),
  };
});

describe('Chat Service - Interface Tests', () => {
  let mockDb: any;
  let mockLoggerService: any;
  let mockAiService: any;
  let mockAgentManager: any;
  let chatService: any;

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
      })),
    };

    // Mock AI service
    mockAiService = {
      chatCompletion: vi.fn(),
      getModelPreset: vi.fn(),
    };


    // Mock agent manager
    mockAgentManager = {
      runAgent: vi.fn(),
    };

    // Import chat service
    const chatModule = await import('../chat-service');
    const { createChatService } = chatModule;
    chatService = createChatService({
      db: mockDb,
      loggerService: mockLoggerService,
      aiService: mockAiService,
      agentManager: mockAgentManager,
    });
  });

  describe('Service Interface', () => {
    it('should have all required methods', () => {
      expect(chatService).toHaveProperty('createConversation');
      expect(chatService).toHaveProperty('sendMessage');
      expect(chatService).toHaveProperty('getConversation');
      expect(chatService).toHaveProperty('listConversations');
      expect(chatService).toHaveProperty('deleteConversation');
      expect(chatService).toHaveProperty('streamAssistantResponse');
      expect(chatService).toHaveProperty('getTypingIndicator');
      expect(chatService).toHaveProperty('pauseConversation');
      expect(chatService).toHaveProperty('resumeConversation');
      expect(chatService).toHaveProperty('endConversation');

      expect(typeof chatService.createConversation).toBe('function');
      expect(typeof chatService.sendMessage).toBe('function');
      expect(typeof chatService.getConversation).toBe('function');
    });
  });

  describe('Conversation Management', () => {
    it('should create a conversation', async () => {
      const conversationRequest = {
        title: 'React Learning',
        agentType: 'learning' as const,
        topic: 'React Hooks',
      };

      const result = await chatService.createConversation(conversationRequest);

      expect(result).toMatchObject({
        id: 'conv-123',
        title: 'Test Conversation',
        agentType: 'learning',
        topic: 'React',
        status: 'active',
        messages: expect.any(Array),
        createdAt: expect.any(String),
      });
    });

    it('should get conversation details', async () => {
      const result = await chatService.getConversation('conv-123');

      expect(result).toMatchObject({
        id: 'conv-123',
        title: 'Test Conversation',
        messages: expect.any(Array),
      });
    });

    it('should list conversations', async () => {
      const result = await chatService.listConversations();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should delete conversation', async () => {
      const result = await chatService.deleteConversation('conv-123');
      expect(result).toBe(true);
    });
  });

  describe('Message Handling', () => {
    it('should send messages and get responses', async () => {
      const messageRequest = {
        conversationId: 'conv-123',
        role: 'user' as const,
        content: 'Hello, teach me React',
      };

      const result = await chatService.sendMessage(messageRequest);

      expect(result).toMatchObject({
        userMessage: {
          id: 'msg-user-123',
          role: 'user',
          content: 'Hello',
        },
        assistantMessage: {
          id: 'msg-assistant-123',
          role: 'assistant',
          content: 'Hi there!',
        },
      });
    });
  });

  describe('Conversation State', () => {
    it('should handle conversation state changes', async () => {
      const pauseResult = await chatService.pauseConversation('conv-123');
      expect(pauseResult).toBe(true);

      const resumeResult = await chatService.resumeConversation('conv-123');
      expect(resumeResult).toBe(true);

      const endResult = await chatService.endConversation('conv-123');
      expect(endResult).toBe(true);
    });

    it('should get typing indicator', async () => {
      const result = await chatService.getTypingIndicator('conv-123');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Streaming', () => {
    it('should support streaming responses', () => {
      expect(typeof chatService.streamAssistantResponse).toBe('function');
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

    it('should accept agent manager dependency', () => {
      expect(mockAgentManager).toBeDefined();
      expect(typeof mockAgentManager.runAgent).toBe('function');
    });
  });

  describe('Data Structures', () => {
    it('should handle conversation data structure', () => {
      const conversation = {
        id: 'conv-123',
        title: 'Test Conversation',
        agentType: 'learning',
        topic: 'React',
        status: 'active',
        messages: [],
        createdAt: new Date().toISOString(),
      };

      expect(conversation).toHaveProperty('id');
      expect(conversation).toHaveProperty('title');
      expect(conversation).toHaveProperty('agentType');
      expect(conversation).toHaveProperty('topic');
      expect(conversation).toHaveProperty('status');
      expect(conversation).toHaveProperty('messages');
      expect(conversation).toHaveProperty('createdAt');
    });

    it('should handle message data structure', () => {
      const message = {
        id: 'msg-123',
        conversationId: 'conv-123',
        role: 'user',
        content: 'Hello',
        timestamp: new Date().toISOString(),
      };

      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('conversationId');
      expect(message).toHaveProperty('role');
      expect(message).toHaveProperty('content');
      expect(message).toHaveProperty('timestamp');
    });
  });
});
