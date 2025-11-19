
/**
 * Chat Store Hook with Pure Factory Pattern
 * Clean dependency injection without global state
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/strict-boolean-expressions */
import { useMemo } from 'react';
import { useSessionService, useElectronAPIClient } from '@/renderer/services/services-provider';
import { createChatStore } from '@/renderer/stores/chat/chatStore';

/**
 * Production hook - creates store with service dependencies
 * Pure function: same dependencies = same result
 */
export function useChatStore(): ReturnType<typeof createChatStore> {
  const sessionService = useSessionService();
  const electronAPIClient = useElectronAPIClient();

  return useMemo(() => {
    // Validate required dependencies
    if (!sessionService) {
      throw new Error('SessionService is required but not available. Make sure ServiceProvider includes SessionService.');
    }

    if (!electronAPIClient) {
      throw new Error('ElectronAPI client is required but not available. Make sure ServiceProvider includes ElectronAPI.');
    }

    return createChatStore({
      sessionService,
      electronAPI: electronAPIClient,
    });
  }, [sessionService, electronAPIClient]);
}
