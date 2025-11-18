/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */




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