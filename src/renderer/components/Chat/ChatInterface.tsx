import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChatArea } from './ChatArea';
import { ChatInput } from './ChatInput';
import { useChatStore } from '../../hooks/useChatStore';
import { useConfigStore } from '../../stores/useConfigStore';
import { catalystService } from '../../services/CatalystService';

export const ChatInterface: React.FC = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const chatStore = useChatStore();
  const {
    currentSession,
    setCurrentSession,
    setAutoScroll,
    setSelectedProvider,
    setSelectedModel
  } = chatStore();

  const { config } = useConfigStore();

  // Initialize chat settings from config
  useEffect(() => {
    if (config) {
      setAutoScroll(config.ui?.auto_scroll ?? true);
      setSelectedProvider(config.ai?.model_types?.chat?.default_provider ?? 'openai');
      setSelectedModel(config.ai?.model_types?.chat?.default_model ?? 'gpt-3.5-turbo');

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
    console.log(`[ChatInterface] useEffect triggered with sessionId: ${sessionId}`);

    if (sessionId) {
      console.log(`[ChatInterface] Loading session from URL: ${sessionId}`);
      setLoading(true);

      const loadSession = async () => {
        try {
          console.log(`[ChatInterface] Calling catalystService.getSession(${sessionId})`);
          const sessionData = await catalystService.getSession(sessionId);
          console.log(`[ChatInterface] getSession returned:`, {
            sessionFound: !!sessionData,
            sessionId: sessionData?.id,
            title: sessionData?.title,
            messageCount: sessionData?.message_count || 0
          });

          if (sessionData) {
            console.log(`[ChatInterface] Found session: ${sessionData.title} with ${sessionData.message_count} messages`);

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

            console.log(`[ChatInterface] Calling setCurrentSession with session data`);
            setCurrentSession(session);
            setSession(session);

            // Verify the state after setting
            setTimeout(() => {
              const currentState = chatStore();
              console.log(`[ChatInterface] State after setCurrentSession:`, {
                currentSessionId: currentState.currentSession?.id,
                messagesInStore: currentState.messages.length,
                sampleMessages: currentState.messages.slice(0, 2).map((m: any) => ({ id: m.id, role: m.role, content: m.content.substring(0, 30) + '...' }))
              });
            }, 100);
          } else {
            console.warn(`[ChatInterface] Session not found: ${sessionId}`);
          }
        } catch (error) {
          console.error(`[ChatInterface] Failed to load session ${sessionId}:`, error);
        } finally {
          setLoading(false);
        }
      };

      loadSession();
    }
  }, [sessionId, setCurrentSession]);

  // Show loading state while session is loading
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-500">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chat area */}
      <ChatArea />

      {/* Chat input */}
      <ChatInput />
    </div>
  );
};