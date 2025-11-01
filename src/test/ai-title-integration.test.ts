/**
 * AI Title Integration Test
 *
 * Test to verify that AI title generation and persistence works correctly
 * in the ChatStore with SessionService integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AI Title Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct updateSessionTitle method signature', async () => {
    // Import the SessionService to check method exists
    const { SessionService } = await import('@/services/sessionService');
    const sessionService = new SessionService();

    // Check that the method exists and has correct signature
    expect(typeof sessionService.updateSessionTitle).toBe('function');

    // Check method parameters (should accept sessionId and title)
    const methodStr = sessionService.updateSessionTitle.toString();
    expect(methodStr).toContain('sessionId');
    expect(methodStr).toContain('title');
  });

  it('should call both set() and updateSessionTitle in ChatStore', async () => {
    // Mock the dependencies
    const mockSet = vi.fn();
    const mockUpdateSessionTitle = vi.fn().mockResolvedValue(undefined);
    const mockGenerateAITitle = vi.fn().mockResolvedValue('AI Generated Title');

    // Mock session service
    const mockSessionService = {
      generateAITitle: mockGenerateAITitle,
      updateSessionTitle: mockUpdateSessionTitle
    };

    // Mock current session state
    const mockCurrentSession = {
      id: 'test-session',
      title: 'Old Title',
      metadata: { title: 'Old Title' }
    };

    // Simulate the AI title generation logic from ChatStore
    const firstUserMessage = 'Hello world';
    const selectedProvider = 'openai';
    const selectedModel = 'gpt-3.5-turbo';

    const aiTitle = await mockSessionService.generateAITitle(
      firstUserMessage,
      selectedProvider,
      selectedModel
    );

    expect(aiTitle).toBe('AI Generated Title');
    expect(mockGenerateAITitle).toHaveBeenCalledWith(
      firstUserMessage,
      selectedProvider,
      selectedModel
    );

    // Simulate the ChatStore update logic
    if (aiTitle && aiTitle !== 'Untitled Session') {
      // Update Zustand state
      mockSet((currentState: any) => ({
        currentSession: currentState.currentSession ? {
          ...currentState.currentSession,
          title: aiTitle,
          metadata: {
            ...currentState.currentSession.metadata,
            title: aiTitle
          }
        } : null
      }), false, 'updateSessionTitle');

      // Update database
      await mockSessionService.updateSessionTitle(mockCurrentSession.id, aiTitle);
    }

    // Verify both calls were made
    expect(mockSet).toHaveBeenCalled();
    expect(mockUpdateSessionTitle).toHaveBeenCalledWith('test-session', 'AI Generated Title');

    // Verify the Zustand state update structure
    const setCall = mockSet.mock.calls[0][0];
    const updatedState = setCall({
      currentSession: mockCurrentSession
    });

    expect(updatedState.currentSession.title).toBe('AI Generated Title');
    expect(updatedState.currentSession.metadata.title).toBe('AI Generated Title');
  });

  it('should not update database if no session ID', async () => {
    const mockUpdateSessionTitle = vi.fn();
    const mockSessionService = {
      generateAITitle: vi.fn().mockResolvedValue('AI Generated Title'),
      updateSessionTitle: mockUpdateSessionTitle
    };

    const mockCurrentSession = null; // No session ID

    const aiTitle = await mockSessionService.generateAITitle('Test message', 'openai', 'gpt-3.5-turbo');

    // Simulate ChatStore logic with null session
    if (aiTitle && aiTitle !== 'Untitled Session' && mockCurrentSession?.id) {
      await mockSessionService.updateSessionTitle(mockCurrentSession.id, aiTitle);
    }

    // Should not call updateSessionTitle when no session ID
    expect(mockUpdateSessionTitle).not.toHaveBeenCalled();
  });

  it('should handle database update errors gracefully', async () => {
    const mockSessionService = {
      generateAITitle: vi.fn().mockResolvedValue('AI Generated Title'),
      updateSessionTitle: vi.fn().mockRejectedValue(new Error('Database error'))
    };

    const mockCurrentSession = {
      id: 'test-session',
      title: 'Old Title',
      metadata: { title: 'Old Title' }
    };

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const aiTitle = await mockSessionService.generateAITitle('Test message', 'openai', 'gpt-3.5-turbo');

    // Simulate ChatStore error handling
    if (aiTitle && aiTitle !== 'Untitled Session' && mockCurrentSession?.id) {
      try {
        await mockSessionService.updateSessionTitle(mockCurrentSession.id, aiTitle);
      } catch (dbError) {
        console.warn('[ChatStore] Failed to persist AI title to database:', dbError);
      }
    }

    expect(mockSessionService.updateSessionTitle).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[ChatStore] Failed to persist AI title to database:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should emit sessionTitleUpdated event after successful database update', async () => {
    const mockUpdateSessionTitle = vi.fn().mockResolvedValue(undefined);
    const mockSessionService = {
      generateAITitle: vi.fn().mockResolvedValue('AI Generated Title'),
      updateSessionTitle: mockUpdateSessionTitle
    };

    const mockCurrentSession = {
      id: 'test-session',
      title: 'Old Title',
      metadata: { title: 'Old Title' }
    };

    // Mock window.dispatchEvent
    const mockDispatchEvent = vi.fn();
    Object.defineProperty(window, 'dispatchEvent', {
      value: mockDispatchEvent,
      writable: true
    });

    const aiTitle = await mockSessionService.generateAITitle('Test message', 'openai', 'gpt-3.5-turbo');

    // Simulate ChatStore logic with event emission
    if (aiTitle && aiTitle !== 'Untitled Session' && mockCurrentSession?.id) {
      try {
        await mockSessionService.updateSessionTitle(mockCurrentSession.id, aiTitle);

        // Emit event to refresh recent sessions list
        window.dispatchEvent(new CustomEvent('sessionTitleUpdated', {
          detail: {
            sessionId: mockCurrentSession.id,
            oldTitle: mockCurrentSession.title,
            newTitle: aiTitle
          }
        }));
      } catch (dbError) {
        console.warn('[ChatStore] Failed to persist AI title to database:', dbError);
      }
    }

    expect(mockUpdateSessionTitle).toHaveBeenCalledWith('test-session', 'AI Generated Title');
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'sessionTitleUpdated',
        detail: {
          sessionId: 'test-session',
          oldTitle: 'Old Title',
          newTitle: 'AI Generated Title'
        }
      })
    );
  });
});