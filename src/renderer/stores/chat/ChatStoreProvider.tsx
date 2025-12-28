import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { createChatStore, type ChatStoreDependencies } from './chatStore';
import { ChatStoreContext } from './chat-store-context';
import { useElectronAPIClient } from '@/renderer/services/services-context';

interface ChatStoreProviderProps {
  children: ReactNode;
}

export const ChatStoreProvider = ({ children }: ChatStoreProviderProps) => {
  const electronAPIClient = useElectronAPIClient();

  const dependencies = useMemo<ChatStoreDependencies>(
    () => ({
      electronAPI: {
        sessions: electronAPIClient.sessions,
      },
    }),
    [electronAPIClient],
  );

  const store = useMemo(() => createChatStore(dependencies), [dependencies]);

  console.log('[ChatStoreProvider] init', {
    hasElectronAPI: !!electronAPIClient,
  });

  return <ChatStoreContext.Provider value={store}>{children}</ChatStoreContext.Provider>;
};
