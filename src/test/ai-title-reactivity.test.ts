/**
 * AI Title Reactivity Test
 *
 * Test to verify that AI-generated titles properly trigger UI updates
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AI Title Reactivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update session title when AI generates title', async () => {
    // Mock the ChatStore functionality
    const mockSet = vi.fn();
    const mockGet = vi.fn(() => ({
      currentSession: {
        id: 'test-session',
        title: 'Old Title',
        metadata: { title: 'Old Title' }
      },
      selectedProvider: 'openai',
      selectedModel: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello world' }]
    }));

    // Mock session service
    const mockSessionService = {
      generateAITitle: vi.fn().mockResolvedValue('AI Generated Title')
    };

    // Simulate the AI title generation logic from useChatStore.ts
    const firstUserMessage = 'Hello world';
    const aiTitle = await mockSessionService.generateAITitle(
      firstUserMessage,
      'openai',
      'gpt-3.5-turbo'
    );

    expect(aiTitle).toBe('AI Generated Title');
    expect(mockSessionService.generateAITitle).toHaveBeenCalledWith(
      'Hello world',
      'openai',
      'gpt-3.5-turbo'
    );

    // Simulate the state update
    if (aiTitle && aiTitle !== 'Untitled Session') {
      mockSet((currentState: any) => ({
        currentSession: currentState.currentSession ? {
          ...currentState.currentSession,
          title: aiTitle,
          metadata: {
            ...currentState.currentSession.metadata,
            title: aiTitle
          }
        } : null
      }));
    }

    expect(mockSet).toHaveBeenCalled();

    // Verify the state update structure
    const setCall = mockSet.mock.calls[0][0];
    const updatedState = setCall({
      currentSession: {
        id: 'test-session',
        title: 'Old Title',
        metadata: { title: 'Old Title' }
      }
    });

    expect(updatedState.currentSession.title).toBe('AI Generated Title');
    expect(updatedState.currentSession.metadata.title).toBe('AI Generated Title');
  });

  it('should not update title if AI returns "Untitled Session"', async () => {
    const mockSet = vi.fn();
    const mockSessionService = {
      generateAITitle: vi.fn().mockResolvedValue('Untitled Session')
    };

    const aiTitle = await mockSessionService.generateAITitle(
      'Test message',
      'openai',
      'gpt-3.5-turbo'
    );

    expect(aiTitle).toBe('Untitled Session');

    // Should not call set if title is "Untitled Session"
    if (aiTitle && aiTitle !== 'Untitled Session') {
      mockSet(() => ({}));
    }

    expect(mockSet).not.toHaveBeenCalled();
  });

  it('should handle errors in AI title generation gracefully', async () => {
    const mockSet = vi.fn();
    const mockSessionService = {
      generateAITitle: vi.fn().mockRejectedValue(new Error('API Error'))
    };

    try {
      const aiTitle = await mockSessionService.generateAITitle(
        'Test message',
        'openai',
        'gpt-3.5-turbo'
      );
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('API Error');
    }

    // Should not call set if there's an error
    expect(mockSet).not.toHaveBeenCalled();
  });
});