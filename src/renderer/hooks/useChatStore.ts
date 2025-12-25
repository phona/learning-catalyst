import type { ChatState } from '@/renderer/stores/chat/chatStore';
import { useChatStoreContext } from '@/renderer/stores/chat/chat-store-context';

type Selector<T> = (state: ChatState) => T;

export function useChatStore(): ChatState;
export function useChatStore<T>(selector: Selector<T>): T;
export function useChatStore<T>(selector?: Selector<T>): T | ChatState {
  const store = useChatStoreContext();
  const select = (selector ?? ((s: ChatState) => s as unknown as T)) as Selector<T>;
  return store(select);
}
