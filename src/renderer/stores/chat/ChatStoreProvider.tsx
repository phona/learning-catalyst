import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { createChatStore, type ChatStoreDependencies } from './chatStore';
import { useElectronAPIClient, useSessionService, useChatService } from '@/renderer/services/services-provider';

const ChatStoreContext = createContext<ReturnType<typeof createChatStore> | null>(null);

interface ChatStoreProviderProps {
  children: ReactNode;
}

export const ChatStoreProvider = ({ children }: ChatStoreProviderProps) => {
  const sessionService = useSessionService();
  const electronAPIClient = useElectronAPIClient();
  const chatService = useChatService();

  const dependencies = useMemo<ChatStoreDependencies>(
    () => ({
      sessionService,
      chatService,
      electronAPI: {
        chat: electronAPIClient.chat,
        sessions: electronAPIClient.sessions,
      },
    }),
    [sessionService, chatService, electronAPIClient],
  );

  const store = useMemo(() => createChatStore(dependencies), [dependencies]);

  return <ChatStoreContext.Provider value={store}>{children}</ChatStoreContext.Provider>;
};

export const useChatStoreContext = () => {
  const context = useContext(ChatStoreContext);
  if (!context) {
    throw new Error('useChatStore must be used within ChatStoreProvider');
  }

  return context;
};
