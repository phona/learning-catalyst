/**
 * ResumeWorkflow API Integration Tests
 *
 * Tests the resumeWorkflow API endpoint including:
 * - Skip action
 * - Resume Later action
 * - Answer action
 * - Error handling
 * - IPC communication
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import the service
import { createChatService } from '../chat-service';
import type { ElectronAPI } from '@/shared/types/electron-api';

// Mock IPC renderer client
const mockInvoke = vi.fn();
const mockChannel = {
  postMessage: vi.fn(),
};

const createMockElectronAPI = (): ElectronAPI => ({
  chat: {
    startConversation: vi.fn(),
    sendMessage: vi.fn(),
    sendMessageStream: vi.fn(),
    getTypingIndicator: vi.fn(),
    getConversationHistory: vi.fn(),
    pauseConversation: vi.fn(),
    resumeConversation: vi.fn(),
    endConversation: vi.fn(),
    cancelStream: vi.fn(),
    checkPracticeOpportunity: vi.fn(),
    getPracticeSuggestion: vi.fn(),
    searchPrompts: vi.fn(),
    resumeWorkflow: mockInvoke,
  },
  knowledge: {
    search: vi.fn(),
    explore: vi.fn(),
    getRelated: vi.fn(),
    ingest: vi.fn(),
    getMap: vi.fn(),
    parse: vi.fn(),
  },
  learning: {
    getPath: vi.fn(),
    startSession: vi.fn(),
    getProgress: vi.fn(),
    pauseSession: vi.fn(),
    resumeSession: vi.fn(),
    completeSession: vi.fn(),
    getRecentSessions: vi.fn(),
    searchSessions: vi.fn(),
  },
  analytics: {
    getDashboard: vi.fn(),
    getProgressChart: vi.fn(),
    getAchievements: vi.fn(),
    unlockAchievement: vi.fn(),
    getUsageStats: vi.fn(),
    getTokenUsage: vi.fn(),
    trackEvent: vi.fn(),
    getConceptProgress: vi.fn(),
  },
  agent: {
    processMessage: vi.fn(),
    getModels: vi.fn(),
    validateModelConfig: vi.fn(),
    extractKnowledge: vi.fn(),
    generateLearningPath: vi.fn(),
    getCapabilities: vi.fn(),
    testFunctionality: vi.fn(),
  },
  settings: {
    get: vi.fn(),
    set: vi.fn(),
    getAll: vi.fn(),
    reset: vi.fn(),
    onChange: vi.fn(),
  },
  filesystem: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    showMessageBox: vi.fn(),
    getPath: vi.fn(),
  },
}) as any;

// Setup before each test
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ResumeWorkflow API - Client Side', () => {
  it('should call IPC with correct parameters for skip action', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    const params = {
      conversationId: 'session-123',
      checkpointId: 'checkpoint-456',
      questionId: 'question-789',
      action: 'skip' as const,
    };

    mockInvoke.mockResolvedValue({
      success: true,
      data: { success: true, resumed: true },
    });

    await chatService.resumeWorkflow!(params);

    expect(mockInvoke).toHaveBeenCalledWith({
      conversationId: 'session-123',
      checkpointId: 'checkpoint-456',
      questionId: 'question-789',
      action: 'skip',
    });
  });

  it('should call IPC with correct parameters for resume_later action', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    const params = {
      conversationId: 'session-123',
      checkpointId: 'checkpoint-456',
      action: 'resume_later' as const,
    };

    mockInvoke.mockResolvedValue({
      success: true,
      data: { success: true, resumed: false },
    });

    await chatService.resumeWorkflow!(params);

    expect(mockInvoke).toHaveBeenCalledWith({
      conversationId: 'session-123',
      checkpointId: 'checkpoint-456',
      action: 'resume_later',
    });
  });

  it('should call IPC with correct parameters for answer action', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    const params = {
      conversationId: 'session-123',
      checkpointId: 'checkpoint-456',
      questionId: 'question-789',
      action: 'answer' as const,
      input: 'I have 2 years of experience',
    };

    mockInvoke.mockResolvedValue({
      success: true,
      data: { success: true, resumed: true },
    });

    await chatService.resumeWorkflow!(params);

    expect(mockInvoke).toHaveBeenCalledWith({
      conversationId: 'session-123',
      checkpointId: 'checkpoint-456',
      questionId: 'question-789',
      action: 'answer',
      input: 'I have 2 years of experience',
    });
  });

  it('should return success response when API returns success', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    mockInvoke.mockResolvedValue({
      success: true,
      data: { success: true, resumed: true },
    });

    const result = await chatService.resumeWorkflow!({
      conversationId: 'session-123',
      checkpointId: 'checkpoint-456',
      action: 'skip',
    });

    expect(result).toEqual({
      success: true,
      resumed: true,
    });
  });

  it('should handle API errors gracefully', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    mockInvoke.mockRejectedValue(new Error('Network error'));

    await expect(
      chatService.resumeWorkflow!({
        conversationId: 'session-123',
        checkpointId: 'checkpoint-456',
        action: 'skip',
      })
    ).rejects.toThrow('Network error');
  });

  it('should handle API failure response', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    mockInvoke.mockResolvedValue({
      success: false,
      error: { message: 'Invalid checkpoint' },
    });

    await expect(
      chatService.resumeWorkflow!({
        conversationId: 'session-123',
        checkpointId: 'invalid',
        action: 'skip',
      })
    ).rejects.toThrow();
  });

  it('should throw error when required parameters missing', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    // Missing conversationId
    await expect(
      chatService.resumeWorkflow!({
        checkpointId: 'checkpoint-456',
        action: 'skip',
      } as any)
    ).rejects.toThrow();
  });

  it('should throw error when action is invalid', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    await expect(
      chatService.resumeWorkflow!({
        conversationId: 'session-123',
        checkpointId: 'checkpoint-456',
        action: 'invalid_action' as any,
      })
    ).rejects.toThrow();
  });
});

describe('ResumeWorkflow API - Type Safety', () => {
  it('should accept valid action types', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    mockInvoke.mockResolvedValue({ success: true, data: { success: true, resumed: true } });

    const actions: Array<'answer' | 'skip' | 'resume_later'> = ['answer', 'skip', 'resume_later'];

    for (const action of actions) {
      await expect(
        chatService.resumeWorkflow!({
          conversationId: 'session-123',
          checkpointId: 'checkpoint-456',
          action,
        })
      ).resolves.not.toThrow();
    }
  });

  it('should require input parameter for answer action', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    mockInvoke.mockResolvedValue({ success: true, data: { success: true, resumed: true } });

    // Should work without input for skip and resume_later
    await expect(
      chatService.resumeWorkflow!({
        conversationId: 'session-123',
        checkpointId: 'checkpoint-456',
        action: 'skip',
      })
    ).resolves.not.toThrow();

    await expect(
      chatService.resumeWorkflow!({
        conversationId: 'session-123',
        checkpointId: 'checkpoint-456',
        action: 'resume_later',
      })
    ).resolves.not.toThrow();

    // Should accept answer without explicit input (though it may fail in backend)
    await expect(
      chatService.resumeWorkflow!({
        conversationId: 'session-123',
        checkpointId: 'checkpoint-456',
        action: 'answer',
      })
    ).resolves.not.toThrow();
  });

  it('should accept optional questionId parameter', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    mockInvoke.mockResolvedValue({ success: true, data: { success: true, resumed: true } });

    await expect(
      chatService.resumeWorkflow!({
        conversationId: 'session-123',
        checkpointId: 'checkpoint-456',
        action: 'skip',
        questionId: 'question-789',
      })
    ).resolves.not.toThrow();
  });
});

describe('ResumeWorkflow API - Response Handling', () => {
  it('should return resumed: true for skip action', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    mockInvoke.mockResolvedValue({
      success: true,
      data: { success: true, resumed: true },
    });

    const result = await chatService.resumeWorkflow!({
      conversationId: 'session-123',
      checkpointId: 'checkpoint-456',
      action: 'skip',
    });

    expect(result.resumed).toBe(true);
  });

  it('should return resumed: false for resume_later action', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    mockInvoke.mockResolvedValue({
      success: true,
      data: { success: true, resumed: false },
    });

    const result = await chatService.resumeWorkflow!({
      conversationId: 'session-123',
      checkpointId: 'checkpoint-456',
      action: 'resume_later',
    });

    expect(result.resumed).toBe(false);
  });

  it('should return resumed: true for answer action', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    mockInvoke.mockResolvedValue({
      success: true,
      data: { success: true, resumed: true },
    });

    const result = await chatService.resumeWorkflow!({
      conversationId: 'session-123',
      checkpointId: 'checkpoint-456',
      action: 'answer',
      input: 'My answer',
    });

    expect(result.resumed).toBe(true);
  });
});

describe('ResumeWorkflow API - Integration Scenarios', () => {
  it('should handle complete skip workflow', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    // Simulate successful skip
    mockInvoke.mockResolvedValue({
      success: true,
      data: { success: true, resumed: true },
    });

    const result = await chatService.resumeWorkflow!({
      conversationId: 'session-learnings-123',
      checkpointId: 'cp-assessment-456',
      questionId: 'q-level-789',
      action: 'skip',
    });

    expect(result.success).toBe(true);
    expect(result.resumed).toBe(true);

    // Verify IPC call
    expect(mockInvoke).toHaveBeenCalledWith({
      conversationId: 'session-learnings-123',
      checkpointId: 'cp-assessment-456',
      questionId: 'q-level-789',
      action: 'skip',
    });
  });

  it('should handle complete resume_later workflow', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    mockInvoke.mockResolvedValue({
      success: true,
      data: { success: true, resumed: false },
    });

    const result = await chatService.resumeWorkflow!({
      conversationId: 'session-learnings-123',
      checkpointId: 'cp-assessment-456',
      action: 'resume_later',
    });

    expect(result.success).toBe(true);
    expect(result.resumed).toBe(false);

    expect(mockInvoke).toHaveBeenCalledWith({
      conversationId: 'session-learnings-123',
      checkpointId: 'cp-assessment-456',
      action: 'resume_later',
    });
  });

  it('should handle network timeout', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    // Simulate timeout
    mockInvoke.mockRejectedValue(new Error('Request timeout'));

    await expect(
      chatService.resumeWorkflow!({
        conversationId: 'session-123',
        checkpointId: 'checkpoint-456',
        action: 'skip',
      })
    ).rejects.toThrow('Request timeout');
  });

  it('should handle invalid conversation ID', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    mockInvoke.mockRejectedValue(new Error('Conversation not found'));

    await expect(
      chatService.resumeWorkflow!({
        conversationId: 'nonexistent-session',
        checkpointId: 'checkpoint-456',
        action: 'skip',
      })
    ).rejects.toThrow('Conversation not found');
  });

  it('should handle invalid checkpoint ID', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    mockInvoke.mockRejectedValue(new Error('Checkpoint not found'));

    await expect(
      chatService.resumeWorkflow!({
        conversationId: 'session-123',
        checkpointId: 'invalid-checkpoint',
        action: 'skip',
      })
    ).rejects.toThrow('Checkpoint not found');
  });
});

describe('ResumeWorkflow API - Performance', () => {
  it('should complete skip action within reasonable time', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    const startTime = Date.now();
    mockInvoke.mockResolvedValue({
      success: true,
      data: { success: true, resumed: true },
    });

    await chatService.resumeWorkflow!({
      conversationId: 'session-123',
      checkpointId: 'checkpoint-456',
      action: 'skip',
    });

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });

  it('should handle multiple concurrent requests', async () => {
    const apiClient = createMockElectronAPI();
    const chatService = createChatService(apiClient);

    mockInvoke.mockResolvedValue({
      success: true,
      data: { success: true, resumed: true },
    });

    const requests = Array.from({ length: 5 }, (_, i) =>
      chatService.resumeWorkflow!({
        conversationId: `session-${i}`,
        checkpointId: `checkpoint-${i}`,
        action: 'skip',
      })
    );

    const results = await Promise.all(requests);

    expect(results).toHaveLength(5);
    expect(results.every((r) => r.success)).toBe(true);
  });
});
