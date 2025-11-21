
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/strict-boolean-expressions */
import { useState, useCallback } from 'react';
import { PracticeOpportunity } from '@/shared/types/practice';
import type { PracticeOpportunityResult } from '@/shared/types/electron-api/chat-api';
import { useChatService } from '@/renderer/services/services-provider';

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

  const chatService = useChatService();

  const checkForPracticeOpportunity = useCallback(async (conversationId: string, userMessage: string, sessionId?: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const payload: PracticeOpportunityResult = await chatService.checkPracticeOpportunity({
        conversationId,
        userMessage,
        ...(sessionId ? { sessionId } : {})
      });

      if (payload.hasOpportunity && payload.opportunity) {
        setState(prev => ({
          ...prev,
          currentSuggestion: payload.opportunity,
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
      const message = error instanceof Error ? error.message : String(error);
      setState(prev => ({
        ...prev,
        error: `Failed to check for practice opportunity: ${message}`,
        isLoading: false
      }));
    }
  }, [chatService]);

  const acceptSuggestion = useCallback(() => {
    setState(prev => {
      if (!prev.currentSuggestion) {
        return prev;
      }
      return {
        ...prev,
        currentSuggestion: null,
        suggestionsHistory: [...prev.suggestionsHistory, prev.currentSuggestion]
      };
    });
  }, []);

  const declineSuggestion = useCallback(() => {
    setState(prev => {
      if (!prev.currentSuggestion) {
        return prev;
      }
      return {
        ...prev,
        currentSuggestion: null,
        suggestionsHistory: [...prev.suggestionsHistory, prev.currentSuggestion]
      };
    });
  }, []);

  const postponeSuggestion = useCallback(() => {
    setState(prev => {
      if (!prev.currentSuggestion) {
        return prev;
      }
      return {
        ...prev,
        currentSuggestion: null,
        suggestionsHistory: [...prev.suggestionsHistory, prev.currentSuggestion]
      };
    });
  }, []);

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
