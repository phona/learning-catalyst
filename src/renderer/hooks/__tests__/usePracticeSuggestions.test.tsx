import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePracticeSuggestions } from '../usePracticeSuggestions';
import type { ChatService } from '@/renderer/services/chat/chat-service';
import type { PracticeOpportunity, PracticeOpportunityResult } from '@/shared/types/electron-api/chat-api';

// Mock the services provider
const mockChatService: Partial<ChatService> = {
  checkPracticeOpportunity: vi.fn(),
};

vi.mock('@/renderer/services/services-provider', () => ({
  useChatService: () => mockChatService as ChatService,
}));

describe('usePracticeSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes loading state and results', async () => {
    const mockOpportunity: PracticeOpportunity = {
      id: 'p1',
      type: 'understanding',
      confidence: 0.8,
      timing: 'immediate',
      concept: 'algebra',
      reasoning: 'User seems ready to practice',
      detectedFrom: ['conversation'],
      practiceReadiness: 0.9,
      suggestedTopics: ['equations', 'variables'],
      naturalPrompt: 'Would you like to try some algebra practice?',
      estimatedTime: 5,
      difficulty: 'medium',
    };

    const mockResult: PracticeOpportunityResult = {
      hasOpportunity: true,
      opportunity: mockOpportunity,
      shouldSuggest: true,
      reason: 'Good opportunity for practice',
      timing: 'immediate',
      confidence: 0.8,
    };

    (mockChatService.checkPracticeOpportunity as any).mockResolvedValue(mockResult);

    const { result } = renderHook(() => usePracticeSuggestions());

    await act(async () => {
      await result.current[1].checkForPracticeOpportunity('c1', 'hello');
    });

    expect(result.current[0].isLoading).toBe(false);
    expect(result.current[0].currentSuggestion?.id).toBe('p1');
    expect(result.current[0].currentSuggestion?.concept).toBe('algebra');
  });

  it('handles errors and can retry', async () => {
    let fail = true;
    (mockChatService.checkPracticeOpportunity as any).mockImplementation(async () => {
      if (fail) throw new Error('network');
      return {
        hasOpportunity: false,
        shouldSuggest: false,
        reason: 'No opportunity',
        timing: 'not-appropriate',
        confidence: 0.0,
      };
    });

    const { result } = renderHook(() => usePracticeSuggestions());

    await act(async () => {
      await result.current[1].checkForPracticeOpportunity('c1', 'hello');
    });

    expect(result.current[0].error).toMatch(/network/);

    fail = false;
    await act(async () => {
      await result.current[1].checkForPracticeOpportunity('c1', 'hello');
    });

    expect(result.current[0].error).toBeNull();
    expect(result.current[0].currentSuggestion).toBeNull();
  });

  it('accepts suggestion and moves to history', async () => {
    const mockOpportunity: PracticeOpportunity = {
      id: 'p1',
      type: 'understanding',
      confidence: 0.8,
      timing: 'immediate',
      concept: 'algebra',
      reasoning: 'User seems ready to practice',
      detectedFrom: ['conversation'],
      practiceReadiness: 0.9,
      suggestedTopics: ['equations', 'variables'],
    };

    const mockResult: PracticeOpportunityResult = {
      hasOpportunity: true,
      opportunity: mockOpportunity,
      shouldSuggest: true,
      reason: 'Good opportunity for practice',
      timing: 'immediate',
      confidence: 0.8,
    };

    (mockChatService.checkPracticeOpportunity as any).mockResolvedValue(mockResult);

    const { result } = renderHook(() => usePracticeSuggestions());

    await act(async () => {
      await result.current[1].checkForPracticeOpportunity('c1', 'hello');
    });

    expect(result.current[0].currentSuggestion).not.toBeNull();

    act(() => {
      result.current[1].acceptSuggestion();
    });

    expect(result.current[0].currentSuggestion).toBeNull();
    expect(result.current[0].suggestionsHistory).toHaveLength(1);
    expect(result.current[0].suggestionsHistory[0].id).toBe('p1');
  });

  it('declines suggestion and moves to history', async () => {
    const mockOpportunity: PracticeOpportunity = {
      id: 'p1',
      type: 'understanding',
      confidence: 0.8,
      timing: 'immediate',
      concept: 'algebra',
      reasoning: 'User seems ready to practice',
      detectedFrom: ['conversation'],
      practiceReadiness: 0.9,
      suggestedTopics: ['equations', 'variables'],
    };

    const mockResult: PracticeOpportunityResult = {
      hasOpportunity: true,
      opportunity: mockOpportunity,
      shouldSuggest: true,
      reason: 'Good opportunity for practice',
      timing: 'immediate',
      confidence: 0.8,
    };

    (mockChatService.checkPracticeOpportunity as any).mockResolvedValue(mockResult);

    const { result } = renderHook(() => usePracticeSuggestions());

    await act(async () => {
      await result.current[1].checkForPracticeOpportunity('c1', 'hello');
    });

    expect(result.current[0].currentSuggestion).not.toBeNull();

    act(() => {
      result.current[1].declineSuggestion();
    });

    expect(result.current[0].currentSuggestion).toBeNull();
    expect(result.current[0].suggestionsHistory).toHaveLength(1);
    expect(result.current[0].suggestionsHistory[0].id).toBe('p1');
  });

  it('dismisses suggestion without adding to history', async () => {
    const mockOpportunity: PracticeOpportunity = {
      id: 'p1',
      type: 'understanding',
      confidence: 0.8,
      timing: 'immediate',
      concept: 'algebra',
      reasoning: 'User seems ready to practice',
      detectedFrom: ['conversation'],
      practiceReadiness: 0.9,
      suggestedTopics: ['equations', 'variables'],
    };

    const mockResult: PracticeOpportunityResult = {
      hasOpportunity: true,
      opportunity: mockOpportunity,
      shouldSuggest: true,
      reason: 'Good opportunity for practice',
      timing: 'immediate',
      confidence: 0.8,
    };

    (mockChatService.checkPracticeOpportunity as any).mockResolvedValue(mockResult);

    const { result } = renderHook(() => usePracticeSuggestions());

    await act(async () => {
      await result.current[1].checkForPracticeOpportunity('c1', 'hello');
    });

    expect(result.current[0].currentSuggestion).not.toBeNull();

    act(() => {
      result.current[1].dismissSuggestion();
    });

    expect(result.current[0].currentSuggestion).toBeNull();
    expect(result.current[0].suggestionsHistory).toHaveLength(0);
  });
});
