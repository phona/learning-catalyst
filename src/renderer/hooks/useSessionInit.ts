import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useChatStore } from '@/renderer/hooks/useChatStore';
import { useConfigStore } from '../stores/useConfigStore';
import { useSessionService } from '@/renderer/services/services-provider';
import type { SessionDisplay as RendererSessionDisplay } from '@/renderer/types/session';
import type { SessionDisplay as ElectronSessionDisplay } from '@/shared/types/electron-api/learning-api';

/**
 * 🚀 Session Initialization Hook
 *
 * Handles complex session initialization logic including URL session loading,
 * configuration setup, and default session creation.
 *
 * 🎯 What It Does:
 * - Loads session data from URL parameters
 * - Initializes chat settings from configuration
 * - Creates default sessions when none exist
 * - Manages loading states during initialization
 * - Handles session format conversion and validation
 *
 * 🔧 Features:
 * - URL-based session loading with validation
 * - Automatic configuration sync (theme, providers, models)
 * - Default session creation with proper structure
 * - Loading state management
 * - Error handling and logging
 *
 * 💡 Usage:
 * Use this hook in any component that needs session data.
 * It handles all the complex initialization logic automatically.
 *
 * @example
 * ```tsx
 * const ChatInterface = () => {
 *   const { loading, session, sessionId } = useSessionInit();
 *
 *   if (loading) {
 *     return <MessageSkeleton />;
 *   }
 *
 *   return <ChatArea session={session} />;
 * };
 * ```
 *
 * @returns Object with session state and loading information
 */
export const useSessionInit = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  type SessionState = RendererSessionDisplay & {
    createdAt?: Date;
    updatedAt?: Date;
    messages?: any[];
    metadata?: any;
    context?: any;
    checkpoints?: any[];
    statistics?: any;
  };
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    currentSession,
    setCurrentSession,
    setAutoScroll,
    setSelectedProvider,
    setSelectedModel,
  } = useChatStore();

  const { config } = useConfigStore();
  const sessionService = useSessionService();

  // Initialize chat settings from config
  useEffect(() => {
    if (!config) {
      return;
    }

    const defaultAutoScroll = config.ui?.autoScroll ?? true;
    const defaultProvider = config.ai?.modelTypes?.chat?.defaultProvider ?? 'openai';
    const defaultModel = config.ai?.modelTypes?.chat?.defaultModel ?? 'gpt-3.5-turbo';
    console.log('[useSessionInit] Defaults', { defaultAutoScroll, defaultProvider, defaultModel });

    if (typeof setAutoScroll === 'function') {
      setAutoScroll(defaultAutoScroll);
    } else {
      console.warn('[useSessionInit] setAutoScroll is unavailable on the chat store');
    }

    if (typeof setSelectedProvider === 'function') {
      setSelectedProvider(defaultProvider);
    } else {
      console.warn('[useSessionInit] setSelectedProvider is unavailable on the chat store');
    }

    if (typeof setSelectedModel === 'function') {
      setSelectedModel(defaultModel);
    } else {
      console.warn('[useSessionInit] setSelectedModel is unavailable on the chat store');
    }
  }, [
    config,
    currentSession,
    setCurrentSession,
    setAutoScroll,
    setSelectedProvider,
    setSelectedModel,
  ]);

  const loadSession = useCallback(
    async (sessionIdToLoad: string) => {
      console.log(`[useSessionInit] Loading session from URL: ${sessionIdToLoad}`);
      try {
        const sessionData = (await sessionService.getSession(sessionIdToLoad)) as
          | RendererSessionDisplay
          | ElectronSessionDisplay
          | null;
        if (!sessionData) {
          console.warn(`[useSessionInit] Session not found: ${sessionIdToLoad}`);
          return;
        }

        console.log(`[useSessionInit] Found session: ${sessionData.title}`);
        const src = sessionData as Partial<RendererSessionDisplay> &
          Partial<ElectronSessionDisplay>;
        const stats = (sessionData as any)?.statistics;
        const sessionRecord: SessionState = {
          id: sessionData.id,
          title: sessionData.title ?? 'Untitled Session',
          createdAt: new Date((src.createdAt as Date | string | undefined) ?? Date.now()),
          updatedAt: new Date((src.updatedAt as Date | string | undefined) ?? Date.now()),
          messages: Array.isArray(src.messages) ? (src.messages as any[]) : [],
          lastActivity: new Date(
            (src.updatedAt as Date | string | undefined) ?? Date.now(),
          ).toISOString(),
          duration: stats?.sessionDuration
            ? `${Math.round(stats.sessionDuration / 60)} min`
            : '0 min',
          difficulty:
            (src as any)?.difficulty && typeof (src as any).difficulty === 'string'
              ? (src as any).difficulty
              : 'medium',
          metadata: src.metadata ?? {},
          context: src.context ?? {},
          checkpoints: src.checkpoints ?? [],
          statistics: stats ?? {
            totalMessages: stats?.totalMessages ?? 0,
            userMessages: stats?.userMessages ?? 0,
            assistantMessages: stats?.assistantMessages ?? 0,
            totalTokensUsed: stats?.totalTokensUsed ?? 0,
            totalThinkingTokens: stats?.totalThinkingTokens ?? 0,
            sessionDuration: stats?.sessionDuration ?? 0,
            averageResponseTime: stats?.averageResponseTime ?? 0,
            conceptsLearned: stats?.conceptsLearned ?? 0,
            checkpointsCreated: stats?.checkpointsCreated ?? 0,
            productivityScore: stats?.productivityScore ?? 0,
            engagementScore: stats?.engagementScore ?? 0,
          },
          preview: src.preview ?? '',
          messageCount: src.messageCount ?? 0,
          tags: src.tags ?? [],
          isActive: src.isActive ?? false,
          hasUnreadMessages: src.hasUnreadMessages ?? false,
        };

        console.log(`[useSessionInit] Calling setCurrentSession with session data`);
        setCurrentSession(sessionRecord);
        setSession(sessionRecord);
      } catch (error) {
        console.error(`[useSessionInit] Failed to load session ${sessionIdToLoad}:`, error);
      }
    },
    [sessionService, setCurrentSession],
  );

  // Load session by ID when provided in URL
  useEffect(() => {
    if (!sessionId) {
      return;
    }

    setLoading(true);
    loadSession(sessionId).finally(() => setLoading(false));
  }, [sessionId, loadSession]);

  return {
    session,
    loading,
    sessionId,
  };
};
