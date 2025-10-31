import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChatArea } from './ChatArea';
import { ChatInput } from './ChatInput';
import { useChatStore } from '@/stores/useChatStore';
import { useConfigStore } from '@/stores/useConfigStore';
import { useService } from '@/hooks/useAppServices';

export const ChatInterface: React.FC = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const sessionService = useService('sessionService');

  const {
    currentSession,
    setCurrentSession,
    setAutoScroll,
    setSelectedProvider,
    setSelectedModel
  } = useChatStore();

  const { config } = useConfigStore();

  // Initialize chat settings from config
  useEffect(() => {
    if (config) {
      setAutoScroll(config.ui?.auto_scroll ?? true);
      setSelectedProvider(config.ai?.model_types?.chat?.default_provider ?? config.ai?.default_provider ?? 'openai');
      setSelectedModel(config.ai?.model_types?.chat?.default_model ?? config.ai?.default_model ?? 'gpt-3.5-turbo');

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
    console.log(`[ChatInterface] useEffect triggered with sessionId: ${sessionId}, sessionService available: ${!!sessionService}`);

    if (sessionId && sessionService) {
      console.log(`[ChatInterface] Loading session from URL: ${sessionId}`);

      const loadSession = async () => {
        try {
          console.log(`[ChatInterface] Calling sessionService.getSessionById(${sessionId})`);
          const session = await sessionService.getSessionById(sessionId);
          console.log(`[ChatInterface] getSessionById returned:`, {
            sessionFound: !!session,
            sessionId: session?.id,
            title: session?.title,
            messageCount: session?.messages?.length || 0
          });

          if (session) {
            console.log(`[ChatInterface] Found session: ${session.title} with ${session.messages.length} messages`);
            console.log(`[ChatInterface] Sample messages:`, session.messages.slice(0, 2).map(m => ({ id: m.id, role: m.role, content: m.content.substring(0, 30) + '...' })));
            console.log(`[ChatInterface] Calling setCurrentSession with session data`);
            setCurrentSession(session);

            // Verify the state after setting
            setTimeout(() => {
              const currentState = useChatStore.getState();
              console.log(`[ChatInterface] State after setCurrentSession:`, {
                currentSessionId: currentState.currentSession?.id,
                messagesInStore: currentState.messages.length,
                sampleMessages: currentState.messages.slice(0, 2).map(m => ({ id: m.id, role: m.role, content: m.content.substring(0, 30) + '...' }))
              });
            }, 100);
          } else {
            console.warn(`[ChatInterface] Session not found: ${sessionId}`);
          }
        } catch (error) {
          console.error(`[ChatInterface] Failed to load session ${sessionId}:`, error);
        }
      };

      loadSession();
    }
  }, [sessionId, sessionService, setCurrentSession]);

  return (
    <div className="h-full flex flex-col">
      {/* Chat area */}
      <ChatArea />

      {/* Chat input */}
      <ChatInput />
    </div>
  );
};