/**
 * Thread List Adapter for Assistant UI
 *
 * BRIDGE PATTERN:
 * This module connects Assistant UI's thread management to our SQLite database.
 * Think of it as a translation layer between two different systems:
 * - Assistant UI: In-memory thread state, React components, message rendering
 * - Our App: SQLite persistence, Electron IPC, session management
 *
 * KEY COMPONENTS (How they work together):
 *
 * 1. RemoteThreadListAdapter (createThreadListAdapter)
 *    - Implements Assistant UI's RemoteThreadListAdapter interface
 *    - Manages thread LIST operations (list, create, rename, archive, delete)
 *    - Uses SQLite via window.electronAPI IPC calls
 *    - Created ONCE in App.tsx and shared across the app
 *
 * 2. ThreadHistoryAdapter (useThreadHistoryAdapter)
 *    - Implements Assistant UI's ThreadHistoryAdapter interface
 *    - Manages MESSAGE history (load from SQLite, append new messages)
 *    - Called by ThreadHistoryProvider to fetch thread messages
 *    - Created FRESH for each thread (one per provider instance)
 *
 * 3. ThreadHistoryProvider (React component)
 *    - React provider that wraps each thread's content
 *    - Creates ThreadHistoryAdapter for the CURRENT thread
 *    - Provides adapters via <RuntimeAdapterProvider />
 *    - In the AI SDK runtime, assistant-ui loads history via `useExternalHistory()`,
 *      which calls `history.withFormat("ai-sdk/v5").load()` and then syncs both:
 *        - Assistant UI's internal repo (runtime.thread.import)
 *        - AI SDK's `useChat().messages` (chatHelpers.setMessages) so the UI renders
 *
 * UNSTABLE_PROVIDER PATTERN:
 * Assistant UI uses "unstable_Provider" to wrap each thread's content:
 * - App.tsx: Creates adapter and passes to useRemoteThreadListRuntime
 * - RemoteThreadListRuntime: Wraps each thread runtime hook instance with adapter.unstable_Provider
 * - Result: Each thread gets its own ThreadHistoryProvider instance
 *
 * LIFECYCLE (When user switches threads):
 * 1. User clicks thread in sidebar
 * 2. RemoteThreadListRuntime starts the runtime hook for that thread
 * 3. ThreadHistoryProvider provides the history adapter for that thread runtime
 * 4. AI SDK bridge calls `history.withFormat("ai-sdk/v5").load()` once per thread
 * 5. History is injected into the AI SDK message store and the Thread UI renders it
 *
 * DATA FLOW:
 * SQLite -> window.electronAPI.chat.getMessages()
 *   -> ThreadHistoryAdapter.withFormat("ai-sdk/v5").load()
 *   -> @assistant-ui/react-ai-sdk `useExternalHistory()` (sets AI SDK `useChat` messages)
 *   -> Assistant UI <Thread /> renders the messages
 *
 * WHY THIS PATTERN:
 * - Separation: Thread management (list/CRUD) vs Message history (load/append)
 * - Scoping: Each thread gets fresh adapter instance with its own context
 * - Lifecycle: Provider component gives us React hooks and mount timing
 * - Flexibility: Easy to swap SQLite for other storage (API, localStorage, etc.)
 */

import React, { useMemo, FC, PropsWithChildren } from 'react';
import {
  RuntimeAdapterProvider,
  useAssistantApi,
  type ThreadHistoryAdapter,
  type ExportedMessageRepository,
  type MessageFormatAdapter,
  type MessageFormatRepository,
  ThreadMessage,
} from '@assistant-ui/react';
import type { ChatHistoryMessage } from '@/shared/types/electron-api/chat-api';
import type { ChatService } from '@/renderer/services/chat/chat-service';
import { createChatService } from '@/renderer/services/chat/chat-service';
import type { ElectronAPI } from '@/shared/types';
import { useElectronAPI } from './useElectronAPI';
import { unwrapAPI } from './useElectronAPI.helpers';

/**
 * Creates a ThreadHistoryAdapter that loads messages from SQLite.
 *
 * MUST BE CALLED INSIDE ThreadHistoryProvider:
 * - useAssistantApi() hook is only available within AssistantRuntimeProvider context
 * - ThreadHistoryProvider wraps the Thread content, giving access to current thread state
 * - Each provider instance gets a fresh adapter for its specific thread
 *
 * ADAPTER PATTERN:
 * - Assistant UI calls adapter methods when it needs thread operations
 * - We implement the interface with our service layer for clean architecture
 * - Adapter is scoped to the CURRENT thread (via useAssistantApi in provider)
 *
 * TWO METHODS:
 * 1. load(): Fetches message history from SQLite via chatService -> ExportedMessageRepository
 *    - Used by runtimes that import ThreadMessage history directly
 *    - Note: when using the AI SDK runtime, history is loaded via withFormat("ai-sdk/v5") instead
 *    - Returns ExportedMessageRepository: { messages: [...] }
 *    - Each message needs: { message: ThreadMessage, parentId: string | null }
 *
 * 2. append(): No-op (LangGraph workflow handles message persistence)
 *    - Assistant UI calls this after each new message
 *    - We let the main process handle persistence via IPC
 *    - Returning without operations prevents double-writing
 *
 * THREAD CONTEXT:
 * - useAssistantApi().threadListItem().getState() gets current thread
 * - threadState.remoteId = SQLite session ID for fetching messages
 * - New threads have no remoteId (haven't been saved yet)
 */
function useThreadHistoryAdapter(chatService: ChatService): ThreadHistoryAdapter {
  const store = useAssistantApi();

  return useMemo(
    () => ({
      /**
       * Load message history for the current thread from SQLite.
       *
       * @returns ExportedMessageRepository with messages array for thread history import
       */
      async load(): Promise<ExportedMessageRepository> {
        // Get the current thread's state to extract the remoteId (SQLite session ID)
        const threadState = store.threadListItem().getState();
        const threadId = threadState.id;

        // New threads may not have a remoteId yet, but message checkpoints are keyed
        // by the Assistant UI thread localId (options.id). Always prefer threadId.
        if (!threadId) {
          return { messages: [] };
        }

        try {
          // Use chatService.getMessages() instead of direct API call
          const sessions = (await chatService.getMessages?.(threadId)) ?? [];

          // Handle empty responses gracefully
          if (!sessions || sessions.length === 0) {
            return { messages: [] };
          }

          // Convert SQLite message format to Assistant UI's ExportedMessageRepository format
          // Each message needs: message object, parentId for threading
          const messages = sessions.map(
            (msg: ChatHistoryMessage, idx: number, arr: ChatHistoryMessage[]) => ({
              message: {
                id: msg.id,
                role: msg.role as 'user' | 'assistant' | 'system',
                content: [{ type: 'text' as const, text: msg.content }],
                createdAt: new Date(msg.timestamp),
                status: { type: 'complete' as const, reason: 'stop' },
                metadata: { custom: {} },
                attachments: [] as const,
              } as ThreadMessage,
              // Link messages in sequence: first message has null parent, rest link to previous
              parentId: idx > 0 ? arr[idx - 1].id : null,
            }),
          );

          return { messages };
        } catch (error) {
          console.error('[ThreadHistoryAdapter.load] Error:', error);
          return { messages: [] };
        }
      },

      /**
       * Append is called after each message but we let the LangGraph workflow
       * handle persistence, so this is a no-op.
       */
      async append(): Promise<void> {
        return;
      },

      withFormat<TMessage, TStorageFormat>(
        formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
      ) {
        return {
          async load(): Promise<MessageFormatRepository<TMessage>> {
            const { id: threadId } = store.threadListItem().getState();
            console.log(
              '[ThreadHistoryAdapter.load] Called with format:',
              formatAdapter.format,
              threadId,
            );
            if (!threadId) return { messages: [] };

            // We only store plain text messages today, so we can only synthesize
            // the AI SDK v5 UIMessage storage format.
            if (formatAdapter.format !== 'ai-sdk/v5') {
              throw new Error(
                `Unsupported history format: ${formatAdapter.format}. Expected ai-sdk/v5.`,
              );
            }

            // Use chatService.getMessages() instead of direct API call
            const sessions = (await chatService.getMessages?.(threadId)) ?? [];
            console.log('[ThreadHistoryAdapter.load] sessions:', sessions);
            if (sessions.length === 0) return { messages: [] };

            const messages = sessions.map((msg, idx, arr) =>
              formatAdapter.decode({
                id: msg.id,
                parent_id: idx > 0 ? arr[idx - 1].id : null,
                format: formatAdapter.format,
                content: {
                  role: msg.role as 'user' | 'assistant' | 'system',
                  parts: [{ type: 'text', text: msg.content }],
                } as unknown as TStorageFormat,
              }),
            );

            const headId = sessions.length ? sessions[sessions.length - 1]!.id : null;
            console.log('[ThreadHistoryAdapter.load] headId:', headId, JSON.stringify(messages));
            return { headId, messages };
          },

          async append(): Promise<void> {
            return;
          },
        };
      },
    }),
    [store, chatService],
  );
}

/**
 * Provider component that enables history loading when switching threads.
 *
 * This provider is mounted by assistant-ui (RemoteThreadListRuntime) around each
 * per-thread runtime hook instance via the adapter's `unstable_Provider`.
 *
 * It only provides the history adapter. In the AI SDK runtime, assistant-ui's
 * `useExternalHistory()` hook will call `history.withFormat("ai-sdk/v5").load()`
 * and hydrate the AI SDK message store so the <Thread /> UI renders.
 */
export const ThreadHistoryProvider: FC<PropsWithChildren<{ chatService: ChatService }>> = ({
  children,
  chatService,
}) => {
  const history = useThreadHistoryAdapter(chatService);
  const adapters = useMemo(() => ({ history }), [history]);

  return <RuntimeAdapterProvider adapters={adapters}>{children}</RuntimeAdapterProvider>;
};

/**
 * Creates a RemoteThreadListAdapter that manages thread persistence in SQLite.
 *
 * ADAPTER PATTERN:
 * - Implements RemoteThreadListAdapter interface from @assistant-ui/react
 * - Connects Assistant UI's thread list management to our SQLite database
 * - All operations go through Electron IPC to main process
 *
 * CREATED IN App.tsx:
 * - Single adapter instance shared across the entire app
 * - Passed to useRemoteThreadListRuntime({ adapter })
 *
 * METHODS (CRUD Operations):
 * - list(): Fetch all threads from SQLite for sidebar display
 * - initialize(): Create new thread in SQLite when user starts chat
 * - rename(): Update thread title (manual or AI-generated)
 * - archive/unarchive: Change thread status (active ↔ completed)
 * - delete: Permanently remove thread from SQLite
 * - fetch: Get metadata for specific thread
 * - generateTitle: AI-powered title generation (async stream)
 *
 * UNSTABLE_PROVIDER PATTERN:
 * - Returns ThreadHistoryProvider component via unstable_Provider property
 * - Assistant UI calls this to wrap each thread's content
 * - Enables per-thread history loading context
 * - See ThreadHistoryProvider documentation for details
 */

