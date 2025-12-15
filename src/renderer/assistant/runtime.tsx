/**
 * Assistant Runtime Provider
 *
 * Provides a single, persistent assistant runtime instance across all pages.
 * Uses useState to create runtime once per provider mount (avoids dev mode issues).
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AssistantRuntimeProvider as AssistantRuntimeProviderImpl } from '@assistant-ui/react';
import { useChatRuntime } from '@assistant-ui/react-ai-sdk';
import { createIpcFetch } from '@/renderer/services/chat/ipcFetch';

// Create context for runtime
const AssistantRuntimeContext = createContext<ReturnType<typeof useChatRuntime> | null>(null);

/**
 * Hook to access the assistant runtime from any component
 */
export const useAssistantRuntime = () => {
  const runtime = useContext(AssistantRuntimeContext);
  if (!runtime) {
    throw new Error('useAssistantRuntime must be used within AssistantRuntimeProvider');
  }
  return runtime;
};

/**
 * Assistant Runtime Provider Component
 *
 * Creates and provides a single assistant runtime instance that persists
 * across page navigation. Runtime is created once per provider mount using
 * useState(() => ...), which avoids React Strict Mode double-invocation
 * issues and HMR state retention problems.
 *
 * @param children - Child components that need access to the assistant runtime
 */
export const AssistantRuntimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Create runtime once per provider mount (not module-level singleton)
  const [runtime] = useState(() =>
    useChatRuntime({
      transport: new (require('@assistant-ui/react-ai-sdk').AssistantChatTransport)({
        fetch: createIpcFetch(),
      }),
      onMessage: (message) => console.log('[AssistantRuntime] Message received:', message),
      onThreadStart: (thread) => console.log('[AssistantRuntime] Thread started:', thread),
      onError: (error) => console.error('[AssistantRuntime] Chat runtime error:', error),
      onFinish: (message) => console.log('[AssistantRuntime] Message completed:', message),
    })
  );

  return (
    <AssistantRuntimeContext.Provider value={runtime}>
      {children}
    </AssistantRuntimeContext.Provider>
  );
};

export default AssistantRuntimeProvider;
