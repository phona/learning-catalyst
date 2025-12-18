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
 *    - useEffect hook triggers history.load() on mount/switch
 *    - threadRuntime.import() populates Assistant UI with history
 *    - Must be rendered with key={threadId} to re-mount on switch
 *
 * UNSTABLE_PROVIDER PATTERN:
 * Assistant UI uses "unstable_Provider" to wrap each thread's content:
 * - App.tsx: Creates adapter and passes to useRemoteThreadListRuntime
 * - ChatInterface: Gets unstable_Provider from context
 * - Renders: <unstable_Provider key={threadId}>...</unstable_Provider>
 * - Result: Each thread gets its own ThreadHistoryProvider instance
 *
 * LIFECYCLE (When user switches threads):
 * 1. User clicks thread in sidebar
 * 2. ChatInterface passes new threadId as key prop
 * 3. React unmounts old ThreadHistoryProvider (cleanup old thread)
 * 4. React mounts new ThreadHistoryProvider (fresh for new thread)
 * 5. useEffect runs: history.load() fetches from SQLite
 * 6. threadRuntime.import() loads messages into Assistant UI
 * 7. User sees the historical conversation
 *
 * DATA FLOW:
 * SQLite → window.electronAPI.chat.getMessages() → ExportedMessageRepository
 * → ThreadHistoryAdapter.load() → useEffect → threadRuntime.import()
 * → Assistant UI Thread component displays messages
 *
 * WHY THIS PATTERN:
 * - Separation: Thread management (list/CRUD) vs Message history (load/append)
 * - Scoping: Each thread gets fresh adapter instance with its own context
 * - Lifecycle: Provider component gives us React hooks and mount timing
 * - Flexibility: Easy to swap SQLite for other storage (API, localStorage, etc.)
 */

import React, { useMemo, useEffect, FC, PropsWithChildren } from 'react';
import {
  type unstable_RemoteThreadListAdapter as RemoteThreadListAdapter,
  type ThreadMessage,
  RuntimeAdapterProvider,
  useAssistantApi,
  useThreadRuntime,
  type ThreadHistoryAdapter,
  type ExportedMessageRepository,
} from '@assistant-ui/react';
import { createAssistantStream } from 'assistant-stream';
import type { ChatHistoryMessage } from '@/shared/types/electron-api/chat-api';
import { useElectronAPI, unwrapAPI } from './useElectronAPI';

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
 * - We implement the interface with our SQLite-backed persistence
 * - Adapter is scoped to the CURRENT thread (via useAssistantApi in provider)
 *
 * TWO METHODS:
 * 1. load(): Fetches message history from SQLite → Assistant UI format
 *    - Called by useEffect in ThreadHistoryProvider (on mount/switch)
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
function useThreadHistoryAdapter(): ThreadHistoryAdapter {
  const store = useAssistantApi();
  const api = useElectronAPI();

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
        const remoteId = threadState.remoteId;
        const localId = threadState.id; // Assistant UI's local ID

        // If no remoteId but we have a localId, this is an uninitialized thread
        // We need to initialize it to get a remoteId (SQLite session ID)
        if (!remoteId && localId) {
          console.log('[ThreadHistoryAdapter.load] Thread not initialized, creating SQLite session for localId:', localId);
          try {
            // Initialize the thread in SQLite
            const initResult = await unwrapAPI(api.sessions.create({ title: 'New Chat', threadId: localId }));
            const { sessionId } = initResult;
            console.log('[ThreadHistoryAdapter.load] Created SQLite session:', sessionId);

            // TODO: We need to update the thread state with the new remoteId
            // However, Assistant UI doesn't provide a way to update thread state from the adapter
            // For now, we'll use the sessionId directly as the remoteId
            const actualRemoteId = sessionId;

            // Now load messages using the actual remoteId
            const response = await unwrapAPI(api.chat.getMessages(actualRemoteId));

            if (!response || !response.sessions) {
              return { messages: [] };
            }

            const messages = response.sessions.map(
              (msg: ChatHistoryMessage, idx: number, arr: ChatHistoryMessage[]) =>
                ({
                  message: {
                    id: msg.id,
                    role: msg.role as 'user' | 'assistant' | 'system',
                    content: [{ type: 'text' as const, text: msg.content }],
                    createdAt: new Date(msg.timestamp),
                    status: { type: 'complete' as const, reason: 'stop' },
                    metadata: { custom: {} },
                    attachments: [] as const,
                  } as ThreadMessage,
                  parentId: idx > 0 ? arr[idx - 1].id : null,
                }),
            );

            return { messages };
          } catch (error) {
            console.error('[ThreadHistoryAdapter.load] Failed to initialize thread:', error);
            return { messages: [] };
          }
        }

        // New threads without remoteId haven't been persisted yet - return empty
        if (!remoteId) {
          return { messages: [] };
        }

        try {
          const response = await unwrapAPI(api.chat.getMessages(remoteId));

          // Handle empty responses gracefully
          if (!response || !response.sessions) {
            return { messages: [] };
          }

          // Convert SQLite message format to Assistant UI's ExportedMessageRepository format
          // Each message needs: message object, parentId for threading
          const messages = response.sessions.map(
            (msg: ChatHistoryMessage, idx: number, arr: ChatHistoryMessage[]) =>
              ({
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
    }),
    [store, api],
  );
}

/**
 * Provider component that enables history loading when switching threads.
 *
 * This component follows the assistant-ui pattern where:
 * 1. Each thread gets its own provider instance (via unstable_Provider pattern)
 * 2. The provider creates a ThreadHistoryAdapter for that specific thread
 * 3. useEffect explicitly triggers history loading (Framework doesn't auto-call load())
 *
 * CRITICAL: This provider MUST be rendered with a key={threadId} prop
 * (see ChatInterface.tsx). The key forces React to:
 * - Unmount the old provider (cleanup old thread state)
 * - Mount a new provider (loads new thread history)
 * - Run useEffect fresh for the new thread
 *
 * Without the key prop, the same provider instance would persist across
 * thread switches, and useEffect would only run once (first mount).
 *
 * LIFECYCLE FLOW:
 * 1. User clicks thread in sidebar
 * 2. ChatInterface passes new threadId as key prop
 * 3. React unmounts old ThreadHistoryProvider
 * 4. React mounts new ThreadHistoryProvider with fresh state
 * 5. useEffect runs (dependency array changed: new history, store, runtime)
 * 6. load() fetches messages from SQLite for the new threadId
 * 7. threadRuntime.import() populates Assistant UI with history
 * 8. User sees the loaded conversation
 *
 * WHY useEffect INSTEAD OF DIRECT CALL:
 * - useThreadRuntime() returns null during initial render
 * - useAssistantApi() provides stale thread state on direct call
 * - useEffect ensures hooks are called after component mount
 * - Thread runtime is guaranteed ready in useEffect callback
 */
export const ThreadHistoryProvider: FC<PropsWithChildren> = ({ children }) => {
  const history = useThreadHistoryAdapter();
  const threadRuntime = useThreadRuntime();
  const store = useAssistantApi();

  // Track which thread we've loaded to prevent duplicate calls
  const loadedThreadRef = React.useRef<string | null>(null);
  const messagesCacheRef = React.useRef<any>(null);

  // Get thread ID for dependency tracking
  const threadState = store.threadListItem().getState();
  const threadId = threadState.remoteId;

  /**
   * Load messages from SQLite and import them into Assistant UI
   */
  useEffect(() => {
    const loadMessages = async () => {
      // Skip if no remoteId (new thread, not persisted yet)
      if (!threadId) {
        return;
      }

      // Clear any cached state from previous thread
      console.log('[ThreadHistoryProvider] Thread changed, clearing cache for:', threadId);
      loadedThreadRef.current = null;
      messagesCacheRef.current = null;

      // Load messages from SQLite
      try {
        console.log('[ThreadHistoryProvider] Loading messages for thread:', threadId);
        const result = await history.load();
        console.log('[ThreadHistoryProvider] Loaded', result.messages.length, 'messages');

        // Mark this thread as loaded
        loadedThreadRef.current = threadId;

        // Import immediately if threadRuntime is available
        if (threadRuntime && result.messages.length > 0) {
          threadRuntime.import(result);
          messagesCacheRef.current = null; // Clear cache - already imported
          console.log('[ThreadHistoryProvider] Messages imported immediately');
        } else {
          // Cache the result for later import
          messagesCacheRef.current = result;
          console.log('[ThreadHistoryProvider] Messages cached for later import');
        }
      } catch (error) {
        console.error('[ThreadHistoryProvider] Failed to load messages:', error);
      }
    };

    // Execute immediately on mount
    loadMessages();
  }, [threadId]); // Re-run if threadId changes (removed threadRuntime to prevent loops)

  /**
   * Separate useEffect for importing cached messages when threadRuntime becomes available
   */
  useEffect(() => {
    // Try to import cached messages if we have them and runtime is available
    if (threadRuntime && messagesCacheRef.current?.messages?.length > 0 && loadedThreadRef.current === threadId) {
      console.log('[ThreadHistoryProvider] Importing cached messages now that runtime is available');
      threadRuntime.import(messagesCacheRef.current);
      messagesCacheRef.current = null; // Clear cache after import
      console.log('[ThreadHistoryProvider] Cached import complete');
    }
  }, [threadRuntime, threadId]); // Include threadId to ensure fresh check on thread switch

  /**
   * Cleanup when provider unmounts or threadId changes
   */
  useEffect(() => {
    return () => {
      console.log('[ThreadHistoryProvider] Cleaning up provider for thread:', threadId);
      loadedThreadRef.current = null;
      messagesCacheRef.current = null;
    };
  }, [threadId]); // Cleanup when threadId changes or component unmounts

  // Provide the history adapter to Assistant UI via RuntimeAdapterProvider
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
 * - Also provided to ThreadAdapterContext for access in components
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
export function createThreadListAdapter(api: ReturnType<typeof useElectronAPI>): RemoteThreadListAdapter {
  return {
    /**
     * List all threads from SQLite learning_sessions table.
     * Returns empty list on error for graceful degradation.
     */
    async list() {
      try {
        const data = await unwrapAPI(api.sessions.list({ limit: 100 }));
        console.log('[ThreadListAdapter.list] Sessions from SQLite:', data.sessions.length, data.sessions);
        return {
          threads: data.sessions.map((session: { id: string; status: string; title?: string; topic?: string }) => ({
            remoteId: session.id,
            externalId: session.id,
            status: session.status === 'completed' ? ('archived' as const) : ('regular' as const),
            title: session.title || session.topic || 'New Chat',
          })),
        };
      } catch (error) {
        console.error('[ThreadListAdapter.list] Error:', error);
        // Graceful degradation: show empty list rather than crash
        return { threads: [] };
      }
    },

    /**
     * Initialize a new thread in SQLite.
     * @param localId - Assistant UI's local thread ID, used as the session ID
     * @throws IPCError if session creation fails
     */
    async initialize(localId: string) {
      console.log('[ThreadListAdapter.initialize] Called with localId:', localId);
      try {
        const result = await unwrapAPI(api.sessions.create({ title: 'New Chat', threadId: localId }));
        const { sessionId } = result;
        console.log('[ThreadListAdapter.initialize] Created session with sessionId:', sessionId);
        return { remoteId: sessionId, externalId: sessionId };
      } catch (error) {
        console.error('[ThreadListAdapter.initialize] Failed to create session:', error);
        throw error;
      }
    },

    /** Rename a thread's title in SQLite. */
    async rename(remoteId: string, title: string) {
      await unwrapAPI(api.sessions.updateTitle(remoteId, title));
    },

    /** Archive a thread by setting status to 'completed'. */
    async archive(remoteId: string) {
      await unwrapAPI(api.sessions.update(remoteId, { status: 'completed' }));
    },

    /** Unarchive a thread by setting status back to 'active'. */
    async unarchive(remoteId: string) {
      await unwrapAPI(api.sessions.update(remoteId, { status: 'active' }));
    },

    /** Permanently delete a thread from SQLite. */
    async delete(remoteId: string) {
      await unwrapAPI(api.sessions.delete(remoteId));
    },

    /**
     * Generate AI title in background. Returns placeholder immediately,
     * then updates the title asynchronously without blocking UI.
     */
    async generateTitle(remoteId: string, messages: readonly ThreadMessage[]) {
      const firstUserMessage = messages.find((m) => m.role === 'user');
      const textContent = firstUserMessage?.content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map((c) => c.text)
        .join(' ') ?? '';

      return createAssistantStream(async (controller) => {
        controller.appendText('New Chat');
        controller.close();

        if (!textContent) return;

        // Background title generation - silent to avoid toast spam
        try {
          const title = await unwrapAPI(api.chat.generateTitle(textContent));
          const finalTitle = title.length > 47 ? title.slice(0, 47) + '...' : title;
          await unwrapAPI(api.sessions.updateTitle(remoteId, finalTitle));
        } catch {
          // Title generation is non-critical, fail silently
        }
      });
    },

    /**
     * Fetch thread metadata. Returns default on error for graceful degradation.
     */
    async fetch(threadId: string) {
      try {
        const data = await unwrapAPI(api.sessions.get(threadId));
        // Type assertion: unwrapAPI guarantees data exists on success
        const session = data!;
        return {
          status: session.status === 'completed' ? ('archived' as const) : ('regular' as const),
          remoteId: threadId,
          externalId: threadId,
          title: session.title || 'New Chat',
        };
      } catch {
        return { status: 'regular' as const, remoteId: threadId, title: 'New Chat' };
      }
    },

    /** Provider component that wraps each thread to enable history loading. */
    unstable_Provider: ThreadHistoryProvider,
  };
}
