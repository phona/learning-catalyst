import { createContext, useContext } from 'react';
import type { createChatStore } from './chatStore';

type ChatStore = ReturnType<typeof createChatStore>;

export const ChatStoreContext = createContext<ChatStore | null>(null);

export const useChatStoreContext = (): ChatStore => {
  const context = useContext(ChatStoreContext);
  if (!context) {
    throw new Error('useChatStore must be used within ChatStoreProvider');
  }
  return context;
};

