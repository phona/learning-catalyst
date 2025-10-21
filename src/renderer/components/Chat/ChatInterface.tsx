import React, { useEffect } from 'react';
import { ChatArea } from './ChatArea';
import { ChatInput } from './ChatInput';
import { useChatStore } from '@/stores/useChatStore';
import { useConfigStore } from '@/stores/useConfigStore';

export const ChatInterface: React.FC = () => {
  const {
    setCurrentSession,
    setShowThinking,
    setAutoScroll,
    setSelectedProvider,
    setSelectedModel
  } = useChatStore();

  const { config } = useConfigStore();

  // Initialize chat settings from config
  useEffect(() => {
    if (config) {
      setShowThinking(config.ai?.enable_thinking ?? true);
      setAutoScroll(config.ui?.auto_scroll ?? true);
      setSelectedProvider(config.ai?.default_provider ?? 'openai');
      setSelectedModel(config.ai?.default_model ?? 'gpt-3.5-turbo');

      // Create a default session if none exists
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
          current_provider: config.ai?.default_provider ?? 'openai',
          current_model: config.ai?.default_model ?? 'gpt-3.5-turbo',
          temperature: config.ai?.temperature ?? 0.7,
          max_tokens: config.ai?.max_tokens ?? 4096,
          enable_thinking: config.ai?.enable_thinking ?? true,
          conversation_style: 'educational',
          language: 'en',
          user_preferences: {
            learning_style: 'reading',
            detail_level: 'detailed',
            example_preference: 'all',
            response_length: 'medium',
            technical_level: 'intermediate',
          },
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
    setCurrentSession,
    setShowThinking,
    setAutoScroll,
    setSelectedProvider,
    setSelectedModel
  ]);

  return (
    <div className="h-full flex flex-col">
      {/* Chat area */}
      <ChatArea />

      {/* Chat input */}
      <ChatInput />
    </div>
  );
};