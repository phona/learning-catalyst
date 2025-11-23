import type { ChatState } from '@/renderer/stores/chat/chatStore';
import { useChatStoreContext } from '@/renderer/stores/chat/ChatStoreProvider';

type Selector<T> = (state: ChatState) => T;

export function useChatStore(): ChatState;
export function useChatStore<T>(selector: Selector<T>): T;
export function useChatStore<T>(selector?: Selector<T>): T | ChatState {
  const store = useChatStoreContext();
  return store(selector as Selector<T>);
}
