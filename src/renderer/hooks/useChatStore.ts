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
