import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { createChatStore, type ChatStoreDependencies } from './chatStore';
import { useElectronAPIClient } from '@/renderer/services/services-provider';

const ChatStoreContext = createContext<ReturnType<typeof createChatStore> | null>(null);

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

export const useChatStoreContext = () => {
  const context = useContext(ChatStoreContext);
  if (!context) {
    throw new Error('useChatStore must be used within ChatStoreProvider');
  }

  return context;
};
