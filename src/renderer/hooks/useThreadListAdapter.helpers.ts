import { createElement, type ReactNode } from 'react';
import type {
  unstable_RemoteThreadListAdapter as RemoteThreadListAdapter,
  ThreadMessage,
} from '@assistant-ui/react';
import { createAssistantStream } from 'assistant-stream';
import type { SessionService } from '@/renderer/services/session/session-service';
import type { ChatService } from '@/renderer/services/chat/chat-service';
import type { ChatHistoryMessage } from '@/shared/types/electron-api/chat-api';
import { ThreadHistoryProvider } from './useThreadListAdapter';

/**
 * Factory for the thread-list adapter. Accepts services for clean architecture.
 *
 * NEW API (recommended): Pass services for clean architecture
 *   createThreadListAdapter({ sessionService, chatService })
 *
 * - Uses sessionService for thread CRUD operations
 * - Uses chatService for title generation
 * - Provides chatService to ThreadHistoryProvider for message loading
 */
export function createThreadListAdapter(deps: {
  sessionService: SessionService;
  chatService: ChatService;
}): RemoteThreadListAdapter {
  const { sessionService, chatService } = deps;
  const listTimeoutMs = process.env.NODE_ENV === 'test' ? 25 : 2000;
  const updateTimeoutMs = process.env.NODE_ENV === 'test' ? 25 : 2000;

  const withTimeout = async <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<T>((resolve) => {
      timeoutId = setTimeout(() => resolve(fallback), ms);
    });
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    return result;
  };

  return {
    /**
     * List all threads from SQLite learning_sessions table.
     * Returns empty list on error for graceful degradation.
     */
    async list() {
      try {
        const data = await withTimeout(
          sessionService.listSessions({ limit: 100 }).catch((error) => {
            console.error('[ThreadListAdapter.list] Error:', error);
            return { sessions: [] as Array<{ id: string; status?: string; title?: string; topic?: string }> };
          }),
          listTimeoutMs,
          { sessions: [] as Array<{ id: string; status?: string; title?: string; topic?: string }> },
        );
        const sessions = data.sessions || [];
        if (sessions.length === 0) {
          return { threads: [] };
        }
        return {
          threads: sessions.map(
            (session: { id: string; status?: string; title?: string; topic?: string }) => ({
              remoteId: session.id,
              externalId: session.id,
              status: session.status === 'completed' ? ('archived' as const) : ('regular' as const),
              title: session.title || session.topic || 'New Chat',
            }),
          ),
        };
      } catch (error) {
        console.error('[ThreadListAdapter.list] Error:', error);
        return { threads: [] };
      }
    },

    /**
     * Initialize a new thread in SQLite.
     * @param localId - Assistant UI's local thread ID, used as the session ID
     * @throws Error if session creation fails
     */
    async initialize(localId: string) {
      console.log('[ThreadListAdapter.initialize] Called with localId:', localId);
      const result = await sessionService.createSession({ title: 'New Chat', threadId: localId });
      if (!result?.id) {
        throw new Error('Session ID missing from creation response.');
      }
      console.log('[ThreadListAdapter.initialize] Created session with sessionId:', result.id);
      return { remoteId: result.id, externalId: result.id };
    },

    /** Rename a thread's title in SQLite. */
    async rename(remoteId: string, title: string) {
      await sessionService.updateSessionTitle(remoteId, title);
    },

    /** Archive a thread by setting status to 'completed'. */
    async archive(remoteId: string) {
      await sessionService.updateSession(remoteId, { status: 'completed' });
    },

    /** Unarchive a thread by setting status back to 'active'. */
    async unarchive(remoteId: string) {
      const updatePromise = sessionService.updateSession(remoteId, { status: 'active' });
      const timeoutPromise = new Promise<'timeout'>((resolve) => {
        setTimeout(() => resolve('timeout'), updateTimeoutMs);
      });

      const result = await Promise.race([updatePromise.then(() => 'done' as const), timeoutPromise]);
      if (result === 'timeout') {
        updatePromise.catch((error) => {
          console.error('[ThreadListAdapter.unarchive] Error:', error);
        });
      }
    },

    /** Permanently delete a thread from SQLite. */
    async delete(remoteId: string) {
      await sessionService.deleteSession(remoteId);
    },

    /**
     * Generate AI title in background. Returns placeholder immediately,
     * then updates the title asynchronously without blocking UI.
     */
    async generateTitle(remoteId: string, messages: readonly ThreadMessage[]) {
      const firstUserMessage = messages.find((m) => m.role === 'user');
      const textContent =
        firstUserMessage?.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join(' ') ?? '';

      return createAssistantStream(async (controller) => {
        controller.appendText('New Chat');
        controller.close();

        if (!textContent) {
          return;
        }

        try {
          const title = await sessionService.generateAITitle(textContent);
          // Handle null, undefined, or empty title
          const safeTitle = title ?? '';
          const finalTitle = safeTitle.length > 47 ? safeTitle.slice(0, 47) + '...' : safeTitle;
          if (finalTitle) {
            await sessionService.updateSessionTitle(remoteId, finalTitle);
          }
        } catch (error) {
          // Silently fail on title generation errors - UI will show "New Chat"
          console.error('[ThreadListAdapter] Failed to generate title:', error);
        }
      });
    },

    /**
     * Fetch thread metadata. Returns default on error for graceful degradation.
     */
    async fetch(threadId: string) {
      console.log('[ThreadListAdapter.fetch] Called with threadId:', threadId);
      try {
        const session = await sessionService.getSession(threadId);
        if (!session) {
          return {
            status: 'regular' as const,
            remoteId: threadId,
            externalId: threadId,
            title: 'New Chat',
          };
        }
        return {
          status: session.status === 'completed' ? ('archived' as const) : ('regular' as const),
          remoteId: threadId,
          externalId: threadId,
          title: session.title || session.topic || 'New Chat',
        };
      } catch {
        return {
          status: 'regular' as const,
          remoteId: threadId,
          externalId: threadId,
          title: 'New Chat',
        };
      }
    },

    /** Provider component that wraps each thread to enable history loading. */
    unstable_Provider: (props: { children?: ReactNode }) =>
      createElement(ThreadHistoryProvider, { ...props, chatService }),
  };
}
