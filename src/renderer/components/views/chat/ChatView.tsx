/**
 * Chat View - Full-page chat interface
 * Clean architecture component focused purely on presentation
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChatInterface } from '../../features/chat/ChatInterface';
import { AgentSelector } from '../../features/agents/AgentSelector';
import { useChatStore } from '../../../stores/chat/chatStore';
import { useSessionStore } from '../../../stores/sessions/sessionStore';
import { LoadingScreen } from '../../UI/LoadingScreen';
import { Container } from '../../UI/Container';
import type { SessionDisplay, MessageDisplay } from '../../../types';

interface ChatViewProps {
  sessionId?: string;
}

export const ChatView: React.FC<ChatViewProps> = ({ sessionId: propSessionId }) => {
  const { sessionId: urlSessionId } = useParams<{ sessionId?: string }>();
  const sessionId = propSessionId || urlSessionId;

  const {
    currentSessionId,
    messages,
    currentAgent,
    isTyping,
    setCurrentSession,
    setLoading
  } = useChatStore();

  const {
    sessions,
    loading: sessionsLoading,
    getCurrentSession,
    createNewSession
  } = useSessionStore();

  const [sessionDisplay, setSessionDisplay] = useState<SessionDisplay | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load session data when component mounts or sessionId changes
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    } else {
      // Create new session if no sessionId provided
      createNewSession();
    }
  }, [sessionId]);

  const loadSession = async (id: string) => {
    try {
      setLoading(true);
      setInitialLoading(true);

      // Get session data from store
      const session = sessions.find(s => s.id === id) || await getCurrentSession(id);

      if (session) {
        setSessionDisplay(session);
        setCurrentSession(id);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const createNewSession = async () => {
    try {
      setLoading(true);
      const newSession = await createNewSession({
        title: 'New Learning Session',
        agentType: 'learning'
      });

      setSessionDisplay(newSession);
      setCurrentSession(newSession.id);
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  // Show loading screen while initializing
  if (initialLoading) {
    return (
      <Container className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto animate-pulse"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto animate-pulse"></div>
          </div>
        </div>
      </Container>
    );
  }

  // Show session not found
  if (sessionId && !sessionDisplay) {
    return (
      <Container className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-4">Session not found</div>
          <button
            onClick={createNewSession}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Start New Session
          </button>
        </div>
      </Container>
    );
  }

  return (
    <Container className="h-full flex flex-col">
      {/* Header with agent selection */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">
              {sessionDisplay?.title || 'Learning Session'}
            </h1>
            {sessionDisplay && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className="px-2 py-1 bg-gray-100 rounded">
                  {sessionDisplay.messageCount} messages
                </span>
                <span>{sessionDisplay.lastActivity}</span>
              </div>
            )}
          </div>

          <AgentSelector
            sessionId={sessionId || currentSessionId || ''}
            currentAgent={currentAgent}
            onAgentChange={(agent) => {
              // Agent selection is handled by the AgentSelector component
              // This maintains clean separation between view and business logic
            }}
          />
        </div>
      </div>

      {/* Chat interface */}
      <div className="flex-1 flex flex-col min-h-0">
        <ChatInterface
          sessionId={sessionId || currentSessionId || ''}
          sessionDisplay={sessionDisplay}
        />
      </div>
    </Container>
  );
};

export default ChatView;