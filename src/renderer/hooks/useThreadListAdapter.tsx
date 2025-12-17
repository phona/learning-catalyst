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
import { showError } from '@/renderer/utils/toast';

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

        // New threads without remoteId haven't been persisted yet - return empty
        if (!remoteId) {
          return { messages: [] };
        }

        const response = await window.electronAPI.chat.getMessages(remoteId);
        console.log('[ThreadHistoryAdapter] load - raw response:', remoteId, response);

        // Handle empty or failed responses gracefully
        if (!response.data || !response.data.sessions) {
          return { messages: [] };
        }

        // Convert SQLite message format to Assistant UI's ExportedMessageRepository format
        // Each message needs: message object, parentId for threading
        const messages = response.data.sessions.map((msg, idx, arr) => ({
          message: {
            id: msg.id,
            role: msg.role as 'user' | 'assistant' | 'system',
            content: [{ type: 'text' as const, text: msg.content }],
            createdAt: new Date(msg.timestamp),
            status: { type: 'complete' as const, reason: 'stop' },
            metadata: { custom: {} },
          },
          // Link messages in sequence: first message has null parent, rest link to previous
          parentId: idx > 0 ? arr[idx - 1].id : null,
        }));

        return { messages };
      },

      /**
       * Append is called after each message but we let the LangGraph workflow
       * handle persistence, so this is a no-op.
       */
      async append(): Promise<void> {
        return;
      },
    }),
    [store],
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

  // Get thread ID for dependency tracking
  const threadId = store.threadListItem().getState().remoteId;

  /**
   * Explicitly trigger history loading on provider mount.
   *
   * PREVENTING DUPLICATE CALLS:
   * We use BOTH:
   * 1. A ref to track which remoteId we've already loaded
   * 2. An empty dependency array [] (runs only once on mount)
   *
   * WHY THIS WORKS:
   * - Each ThreadHistoryProvider instance is created fresh for a thread (via key={threadId})
   * - Empty dependency array means useEffect runs once when provider mounts
   * - Ref check prevents accidental duplicate calls
   * - When thread switches, old provider unmounts and new one mounts (fresh ref)
   */
  useEffect(() => {
    const loadMessages = async () => {
      // Skip if no remoteId (new thread, not persisted yet)
      if (!threadId) {
        return;
      }

      // Skip if we already loaded for this thread (prevent duplicates)
      if (loadedThreadRef.current === threadId) {
        return;
      }

      try {
        // Fetch messages from SQLite via Electron IPC
        const { messages } = await history.load();

        // Import into Assistant UI's thread runtime
        if (messages.length > 0 && threadRuntime) {
          threadRuntime.import(messages);
        }

        // Mark this thread as loaded
        loadedThreadRef.current = threadId;
      } catch (error) {
        console.error('[ThreadHistoryProvider] Failed to load messages:', error);
      }
    };

    // Execute immediately on mount
    // Empty dependency array: runs once when component mounts
    loadMessages();
  }, []); // <-- EMPTY: Only runs once per provider instance

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
export function createThreadListAdapter(): RemoteThreadListAdapter {
  const api = window.electronAPI;

  return {
    /**
     * List all threads from SQLite learning_sessions table.
     * Maps session status to Assistant UI's thread status format.
     */
    async list() {
      const response = await api.sessions.list({ limit: 100 });
      if (!response.success || !response.data) {
        console.error('[ThreadListAdapter] Failed to list sessions:', response.error);
        return { threads: [] };
      }

      const threads = response.data.sessions.map((session) => ({
        remoteId: session.id,
        externalId: session.id,
        status: session.status === 'completed' ? ('archived' as const) : ('regular' as const),
        title: session.title || session.topic || 'New Chat',
      }));

      return { threads };
    },

    /**
     * Initialize a new thread in SQLite.
     * Called when user creates a new chat - creates the session record.
     *
     * @param localId - Assistant UI's local thread ID, used as the session ID
     */
    async initialize(localId: string) {
      console.log('[ThreadListAdapter] Initializing thread with localId:', localId);

      const response = await api.sessions.create({
        title: 'New Chat',
        threadId: localId, // Use the localId as the session ID
      });

      if (!response.success || !response.data) {
        console.error('[ThreadListAdapter] Failed to create session:', response.error);
        throw new Error('Failed to create session');
      }

      console.log('[ThreadListAdapter] Session created with ID:', response.data.sessionId);

      return {
        remoteId: localId, // Return the localId as remoteId
        externalId: localId,
      };
    },

    /**
     * Rename a thread's title in SQLite.
     */
    async rename(remoteId: string, title: string) {
      const response = await api.sessions.updateTitle(remoteId, title);
      if (!response.success) {
        console.error('[ThreadListAdapter] Failed to rename session:', response.error);
        throw new Error('Failed to rename session');
      }
    },

    /**
     * Archive a thread by setting its status to 'completed'.
     */
    async archive(remoteId: string) {
      const response = await api.sessions.update(remoteId, { status: 'completed' });
      if (!response.success) {
        console.error('[ThreadListAdapter] Failed to archive session:', response.error);
        throw new Error('Failed to archive session');
      }
    },

    /**
     * Unarchive a thread by setting its status back to 'active'.
     */
    async unarchive(remoteId: string) {
      const response = await api.sessions.update(remoteId, { status: 'active' });
      if (!response.success) {
        console.error('[ThreadListAdapter] Failed to unarchive session:', response.error);
        throw new Error('Failed to unarchive session');
      }
    },

    /**
     * Permanently delete a thread from SQLite.
     */
    async delete(remoteId: string) {
      const response = await api.sessions.delete(remoteId);
      if (!response.success) {
        console.error('[ThreadListAdapter] Failed to delete session:', response.error);
        throw new Error('Failed to delete session');
      }
    },

    /**
     * Generate an AI-powered title for a thread based on the first user message.
     *
     * Returns a stream that immediately provides "New Chat" as placeholder,
     * then asynchronously generates and saves the real title in the background.
     */
    async generateTitle(remoteId: string, messages: readonly ThreadMessage[]) {
      const firstUserMessage = messages.find((m) => m.role === 'user');

      // Extract text content from the first user message
      let textContent = '';
      if (firstUserMessage) {
        textContent = firstUserMessage.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join(' ');
      }

      return createAssistantStream(async (controller) => {
        // Immediately return placeholder title
        controller.appendText('New Chat');
        controller.close();

        // Generate AI title in background (doesn't block the UI)
        if (firstUserMessage && textContent) {
          try {
            const generatedTitle = await api.chat.generateTitle(textContent);
            let finalTitle = 'New Chat';

            if (generatedTitle.success && generatedTitle.data) {
              finalTitle = generatedTitle.data.trim();
              // Truncate long titles with ellipsis
              if (finalTitle.length > 47) {
                finalTitle = finalTitle.slice(0, 47) + '...';
              }
            }

            await api.sessions.updateTitle(remoteId, finalTitle);
          } catch (error) {
            console.error('[ThreadListAdapter] Title generation failed:', error);
            showError('Failed to generate title');
          }
        }
      });
    },

    /**
     * Fetch metadata for a specific thread from SQLite.
     * Used by Assistant UI to get thread info when needed.
     */
    async fetch(threadId: string) {
      const response = await api.sessions.get(threadId);

      if (!response.success || !response.data) {
        return {
          status: 'regular' as const,
          remoteId: threadId,
          title: 'New Chat',
        };
      }

      return {
        status: response.data.status === 'completed' ? ('archived' as const) : ('regular' as const),
        remoteId: threadId,
        externalId: threadId,
        title: response.data.title || 'New Chat',
      };
    },

    /**
     * Provider component that wraps each thread to enable history loading.
     * Assistant UI calls this provider when rendering thread content.
     */
    unstable_Provider: ThreadHistoryProvider,
  };
}
