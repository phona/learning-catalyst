
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/strict-boolean-expressions */
import { useState, useCallback } from 'react';
import { PracticeSuggestionResult, PracticeOpportunity } from '@/shared/types/practice';
import { useElectronAPIClient } from '@/renderer/services/services-provider';

export interface PracticeSuggestionState {
  currentSuggestion: PracticeOpportunity | null;
  suggestionsHistory: PracticeOpportunity[];
  isLoading: boolean;
  error: string | null;
}

export interface PracticeSuggestionActions {
  checkForPracticeOpportunity: (conversationId: string, userMessage: string, sessionId?: string) => Promise<void>;
  acceptSuggestion: () => void;
  declineSuggestion: () => void;
  postponeSuggestion: () => void;
  dismissSuggestion: () => void;
}

export const usePracticeSuggestions = (): [PracticeSuggestionState, PracticeSuggestionActions] => {
  const [state, setState] = useState<PracticeSuggestionState>({
    currentSuggestion: null,
    suggestionsHistory: [],
    isLoading: false,
    error: null
  });

  const electronAPIClient = useElectronAPIClient();

  const checkForPracticeOpportunity = useCallback(async (conversationId: string, userMessage: string, sessionId?: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Call through service client instead of direct window access
      const result: PracticeSuggestionResult = await electronAPIClient.chat.checkPracticeOpportunity({
        conversationId,
        userMessage,
        sessionId
      });
      
      if (result.success && result.practiceOpportunity) {
        setState(prev => ({
          ...prev,
          currentSuggestion: result.practiceOpportunity,
          isLoading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          currentSuggestion: null,
          isLoading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Failed to check for practice opportunity: ${error.message || error}`,
        isLoading: false
      }));
    }
  }, []);

  const acceptSuggestion = useCallback(() => {
    if (!state.currentSuggestion) return;

    // User accepted the practice suggestion
    
    // Add to history
    setState(prev => ({
      ...prev,
      currentSuggestion: null,
      suggestionsHistory: [...prev.suggestionsHistory, state.currentSuggestion]
    }));
  }, [state.currentSuggestion]);

  const declineSuggestion = useCallback(() => {
    if (!state.currentSuggestion) return;

    // User declined the practice suggestion
    
    setState(prev => ({
      ...prev,
      currentSuggestion: null,
      suggestionsHistory: [...prev.suggestionsHistory, {...state.currentSuggestion, rejected: true}]
    }));
  }, [state.currentSuggestion]);

  const postponeSuggestion = useCallback(() => {
    if (!state.currentSuggestion) return;

    // User postponed the practice suggestion
    
    setState(prev => ({
      ...prev,
      // For now, just remove it (in a real implementation, you might want to reschedule it)
      currentSuggestion: null,
      suggestionsHistory: [...prev.suggestionsHistory, {...state.currentSuggestion, postponed: true}]
    }));
  }, [state.currentSuggestion]);

  const dismissSuggestion = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentSuggestion: null
    }));
  }, []);

  const actions: PracticeSuggestionActions = {
    checkForPracticeOpportunity,
    acceptSuggestion,
    declineSuggestion,
    postponeSuggestion,
    dismissSuggestion
  };

  return [state, actions];
};