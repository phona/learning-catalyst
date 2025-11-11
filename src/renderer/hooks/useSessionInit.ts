import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useChatStore } from '@/renderer/hooks/useChatStore';
import { useConfigStore } from '../stores/useConfigStore';
import { getCatalystService } from '../services/ServiceContainer';

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
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const {
    currentSession,
    setCurrentSession,
    setAutoScroll,
    setSelectedProvider,
    setSelectedModel
  } = useChatStore();

  const { config } = useConfigStore();
  const catalystService = getCatalystService();

  // Initialize chat settings from config
  useEffect(() => {
    if (!config) {
      return;
    }

    const defaultAutoScroll = config.ui?.auto_scroll ?? true;
    const defaultProvider = config.ai?.model_types?.chat?.default_provider ?? 'openai';
    const defaultModel = config.ai?.model_types?.chat?.default_model ?? 'gpt-3.5-turbo';

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

    // Create a default session if none exists
    if (!currentSession) {
      setCurrentSession({
        id: Date.now().toString(),
        title: 'New Chat',
        created_at: new Date(),
        updated_at: new Date(),
        messages: [],
        metadata: {
          title: 'New Chat',
          tags: [],
          topics_covered: [],
          archived: false,
          pinned: false,
        },
        context: {
          // Only session-specific context, no config
          system_prompt: undefined,
          notes: undefined,
          learning_objectives: undefined,
        },
        checkpoints: [],
        statistics: {
          total_messages: 0,
          user_messages: 0,
          assistant_messages: 0,
          total_tokens_used: 0,
          total_thinking_tokens: 0,
          session_duration: 0,
          average_response_time: 0,
          concepts_learned: 0,
          checkpoints_created: 0,
          productivity_score: 0,
          engagement_score: 0,
        },
      });
    }
  }, [
    config,
    currentSession,
    setCurrentSession,
    setAutoScroll,
    setSelectedProvider,
    setSelectedModel
  ]);

  // Load session by ID when provided in URL
  useEffect(() => {
    console.log(`[useSessionInit] useEffect triggered with sessionId: ${sessionId}`);

    if (sessionId) {
      console.log(`[useSessionInit] Loading session from URL: ${sessionId}`);
      setLoading(true);

      const loadSession = async () => {
        try {
          console.log(`[useSessionInit] Calling catalystService.getSession(${sessionId})`);
          const sessionData = await catalystService.getSession(sessionId);
          console.log(`[useSessionInit] getSession returned:`, {
            sessionFound: !!sessionData,
            sessionId: sessionData?.id,
            title: sessionData?.title,
            messageCount: sessionData?.message_count || 0
          });

          if (sessionData) {
            console.log(`[useSessionInit] Found session: ${sessionData.title} with ${sessionData.message_count} messages`);

            // Convert session format to match store expectations
            const session = {
              id: sessionData.id,
              title: sessionData.title,
              created_at: new Date(sessionData.created_at),
              updated_at: new Date(sessionData.updated_at),
              messages: [], // Messages would be loaded separately
              metadata: sessionData.metadata || {},
              context: sessionData.context || {},
              checkpoints: sessionData.checkpoints || [],
              statistics: sessionData.statistics || {
                total_messages: sessionData.message_count || 0,
                user_messages: 0,
                assistant_messages: 0,
                total_tokens_used: 0,
                total_thinking_tokens: 0,
                session_duration: 0,
                average_response_time: 0,
                concepts_learned: 0,
                checkpoints_created: 0,
                productivity_score: 0,
                engagement_score: 0,
              },
            };

            console.log(`[useSessionInit] Calling setCurrentSession with session data`);
            setCurrentSession(session);
            setSession(session);
          } else {
            console.warn(`[useSessionInit] Session not found: ${sessionId}`);
          }
        } catch (error) {
          console.error(`[useSessionInit] Failed to load session ${sessionId}:`, error);
        } finally {
          setLoading(false);
        }
      };

      loadSession();
    }
  }, [sessionId, setCurrentSession]);

  return {
    session,
    loading,
    sessionId
  };
};
