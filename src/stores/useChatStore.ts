import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Message, StreamChunk, ChatOptions } from '@/types/ai';
import type { Session, ConversationMessage } from '@/types/session';
import { chatService } from '@/services/ai/chatService';
import { useConfigStore } from './useConfigStore';

interface ChatStore {
  // Current session
  currentSession: Session | null;
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  thinkingContent: string;
  inputText: string;
  error: string | null;

  // Memory management
  maxMessages: number;

  // UI state
  autoScroll: boolean;
  selectedProvider: string;
  selectedModel: string;

  // Session service reference
  _sessionService: any; // Internal reference to session service

  // Actions
  setCurrentSession: (session: Session | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  deleteMessage: (id: string) => void;
  clearMessages: () => void;

  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  appendStreamChunk: (chunk: StreamChunk) => void;
  setThinkingContent: (content: string) => void;
  resetStreaming: () => void;

  setInputText: (text: string | ((prev: string) => string)) => void;
  setError: (error: string | null) => void;

  // UI actions
  setAutoScroll: (autoScroll: boolean) => void;
  setSelectedProvider: (provider: string) => void;
  setSelectedModel: (model: string) => void;

  // Chat actions
  sendMessage: (content: string, options?: ChatOptions) => Promise<void>;
  stopStreaming: () => void;
  retryLastMessage: () => void;
  createNewSession: () => Promise<string>;

  // Session service actions
  setSessionService: (sessionService: any) => void;
}

export const useChatStore = create<ChatStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentSession: null,
      messages: [],
      isLoading: false,
      isStreaming: false,
      streamingContent: '',
      thinkingContent: '',
      inputText: '',
      error: null,

      // Memory management
      maxMessages: 1000, // 限制最大消息数量

      // UI state
      autoScroll: true,
      selectedProvider: 'openai',
      selectedModel: 'gpt-3.5-turbo',

      // Session service reference
      _sessionService: null,

      // Actions
      setCurrentSession: (session) => {
        console.log('[ChatStore] setCurrentSession called with:', {
          sessionId: session?.id,
          sessionTitle: session?.title,
          messageCount: session?.messages?.length || 0,
          messages: session?.messages?.map((m: any) => ({ id: m.id, role: m.role, content: m.content.substring(0, 30) + '...' })) || [],
          sessionContext: session?.context
        });

        // Convert session messages to store message format and set them
        if (session && session.messages && session.messages.length > 0) {
          const convertedMessages = session.messages.map((convMessage: any) => ({
            id: convMessage.id,
            role: convMessage.role,
            content: convMessage.content,
            timestamp: convMessage.timestamp,
            provider: convMessage.provider,
            model: convMessage.model,
            thinking_content: convMessage.thinking_content,
            tool_calls: convMessage.tool_calls,
            showThinking: false, // Hide thinking by default for historical sessions
          }));
          console.log('[ChatStore] Setting messages in store:', convertedMessages.length, 'messages');

          // Set session only - provider/model come from global config
          set({
            currentSession: session,
            messages: convertedMessages,
          }, false, 'setCurrentSession');
        } else {
          console.log('[ChatStore] Setting empty messages array for session:', session?.id);

          // Set session only - provider/model come from global config
          set({
            currentSession: session,
            messages: [],
          }, false, 'setCurrentSession');
        }
      },

      setMessages: (messages) => set({ messages }, false, 'setMessages'),

      addMessage: (message) => {
        const state = get();

        // Set thinking visibility - hide by default, will be shown during streaming
        const messageWithThinkingState = {
          ...message,
          showThinking: false, // Default to hidden for completed messages
        };

        const newMessages = [...state.messages, messageWithThinkingState];

        // 限制消息数量，移除最旧的消息
        let finalMessages = newMessages;
        if (newMessages.length > state.maxMessages) {
          const removed = newMessages.length - state.maxMessages;
          console.warn(`[Chat Store] Limiting messages: removed ${removed} old messages to prevent memory leak`);
          finalMessages = newMessages.slice(-state.maxMessages);
        }

        // Update state
        set({ messages: finalMessages }, false, 'addMessage');

        // Persist to database if we have a session and session service
        if (state.currentSession && state._sessionService) {
          console.log('[ChatStore] Attempting to save message to session:', state.currentSession.id, message.role);
          // Convert Message to ConversationMessage format
          const conversationMessage: ConversationMessage = {
            id: message.id || Date.now().toString(),
            role: message.role,
            content: message.content,
            timestamp: message.timestamp || new Date(),
            provider: message.provider,
            model: undefined, // Message type doesn't have model field
            thinking_content: message.thinking_content,
            tokens_used: message.tokens_used ?
              (typeof message.tokens_used === 'number' ? message.tokens_used : message.tokens_used.total_tokens) :
              undefined,
          };

          // Save to database asynchronously (don't await to avoid blocking UI)
          state._sessionService.saveMessage(state.currentSession.id, conversationMessage)
            .then(() => console.log('[ChatStore] Message saved successfully'))
            .catch((error: any) => console.error('[ChatStore] Failed to save message:', error));
        } else {
          console.log('[ChatStore] Cannot save message - missing session or service:', {
            hasCurrentSession: !!state.currentSession,
            hasSessionService: !!state._sessionService,
            sessionId: state.currentSession?.id
          });
        }
      },

      updateMessage: (id, updates) => set(
        (state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          ),
        }),
        false,
        'updateMessage'
      ),

      deleteMessage: (id) => set(
        (state) => ({
          messages: state.messages.filter((msg) => msg.id !== id),
        }),
        false,
        'deleteMessage'
      ),

      clearMessages: () => set({ messages: [] }, false, 'clearMessages'),

      setLoading: (loading) => set({ isLoading: loading }, false, 'setLoading'),

      setStreaming: (streaming) => set({ isStreaming: streaming }, false, 'setStreaming'),

      appendStreamChunk: (chunk) => {
        const state = get();

        // Prevent unlimited content accumulation (safety limit ~100KB)
        const MAX_CONTENT_LENGTH = 100000;

        if (chunk.reasoning_content) {
          const newThinkingContent = state.thinkingContent + chunk.reasoning_content;
          if (newThinkingContent.length > MAX_CONTENT_LENGTH) {
            // Truncate from the beginning if over limit
            const truncatedContent = newThinkingContent.slice(-MAX_CONTENT_LENGTH * 0.8);
            set(
              { thinkingContent: truncatedContent },
              false,
              'appendThinkingChunkTruncated'
            );
          } else {
            set(
              { thinkingContent: newThinkingContent },
              false,
              'appendThinkingChunk'
            );
          }
        }

        if (chunk.content) {
          const newStreamingContent = state.streamingContent + chunk.content;
          if (newStreamingContent.length > MAX_CONTENT_LENGTH) {
            // Truncate from the beginning if over limit
            const truncatedContent = newStreamingContent.slice(-MAX_CONTENT_LENGTH * 0.8);
            set(
              { streamingContent: truncatedContent },
              false,
              'appendContentChunkTruncated'
            );
          } else {
            set(
              { streamingContent: newStreamingContent },
              false,
              'appendContentChunk'
            );
          }
        }
      },

      setThinkingContent: (content) => set({ thinkingContent: content }, false, 'setThinkingContent'),

      resetStreaming: () => set(
        {
          streamingContent: '',
          thinkingContent: '',
          isStreaming: false,
        },
        false,
        'resetStreaming'
      ),

      setInputText: (text) => set(
        (state) => ({
          inputText: typeof text === 'function' ? text(state.inputText) : text
        }),
        false,
        'setInputText'
      ),

      setError: (error) => set({ error }, false, 'setError'),

      // UI actions

      setAutoScroll: (autoScroll) => set({ autoScroll }, false, 'setAutoScroll'),

      setSelectedProvider: (provider) => set({ selectedProvider: provider }, false, 'setSelectedProvider'),

      setSelectedModel: (model) => set({ selectedModel: model }, false, 'setSelectedModel'),

      // Chat actions
      sendMessage: async (content: string, options?: ChatOptions) => {
        const {
          addMessage,
          setLoading,
          setStreaming,
          resetStreaming,
          currentSession,
          selectedProvider,
          selectedModel,
          setError
        } = get();

        if (!currentSession) {
          setError('No active session');
          return;
        }

        // Add user message
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content,
          timestamp: new Date(),
        };
        addMessage(userMessage);

        
        setLoading(true);
        resetStreaming();

        try {
          // Get provider config from new model type configuration
          const { config } = useConfigStore.getState();
          const chatModelConfig = config?.ai?.model_types?.chat;

          // Get API key from the new model type configuration
          const apiKey = chatModelConfig?.api_keys?.[selectedProvider as keyof typeof chatModelConfig.api_keys];

          // Create provider config object compatible with chat service
          const providerConfig = apiKey ? {
            api_key: apiKey,
            base_url: chatModelConfig?.custom_provider_url || undefined,
            provider: selectedProvider
          } : null;

          if (!providerConfig || !apiKey) {
            throw new Error(`No configuration found for provider: ${selectedProvider}. Please configure the API key in Settings.`);
          }

          // Initialize provider if not already done
          if (!chatService.getProviderInfo() ||
              chatService.getProviderInfo()?.name !== selectedProvider) {
            await chatService.initializeProvider(selectedProvider, providerConfig);
          }

          // Set current session in chat service
          chatService.setCurrentSession(currentSession);

          // Send message to AI
          setStreaming(true);
          const response = await chatService.sendMessage(content, currentSession, {
            ...options,
            provider: selectedProvider,
            model: selectedModel,
            stream: true, // Always use streaming for better UX
          });

          // Check if response is an async generator
          const isAsyncGenerator = response && typeof (response as any)[Symbol.asyncIterator] === 'function';

          if (isAsyncGenerator) {
            let assistantContent = '';
            let thinkingContent = '';

            // Process stream
            for await (const chunk of chatService.processStreamResponse(response as AsyncGenerator<StreamChunk>)) {
              if (chunk.error) {
                setError(chunk.error);
                break;
              }

              if (chunk.content) {
                assistantContent += chunk.content;
                set((state) => ({
                  streamingContent: assistantContent,
                }));
              }

              if (chunk.thinkingContent) {
                thinkingContent += chunk.thinkingContent;
                set((state) => ({
                  thinkingContent: thinkingContent,
                }));
              }

              if (chunk.done) {
                break;
              }
            }

            // Add final assistant message
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: assistantContent,
              thinking_content: thinkingContent || undefined,
              timestamp: new Date(),
              provider: selectedProvider,
              tokens_used: undefined, // Will be populated by the actual implementation
            };
            addMessage(assistantMessage);

                      } else {
            // Non-streaming response (fallback)
            const chatResponse = response as any;
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: chatResponse.content,
              thinking_content: chatResponse.reasoning_content,
              timestamp: new Date(),
              provider: selectedProvider,
              tokens_used: chatResponse.usage ? {
                prompt_tokens: chatResponse.usage.prompt_tokens || 0,
                completion_tokens: chatResponse.usage.completion_tokens || 0,
                total_tokens: chatResponse.usage.total_tokens || 0,
              } : undefined,
            };
            addMessage(assistantMessage);

                      }
        } catch (error) {
          console.error('Failed to send message:', error);
          setError(error instanceof Error ? error.message : 'Failed to send message');
        } finally {
          setLoading(false);
          setStreaming(false);
          resetStreaming();
        }
      },

      stopStreaming: () => set({ isStreaming: false }, false, 'stopStreaming'),

      retryLastMessage: () => {
        const { messages, sendMessage } = get();
        const lastUserMessage = messages
          .filter(msg => msg.role === 'user')
          .pop();

        if (lastUserMessage) {
          // Remove the last assistant message if it exists
          const { addMessage, messages: currentMessages } = get();
          const lastAssistantMessage = currentMessages
            .filter(msg => msg.role === 'assistant')
            .pop();

          if (lastAssistantMessage) {
            set(
              (state) => ({
                messages: state.messages.filter(msg => msg.id !== lastAssistantMessage.id),
              }),
              false,
              'removeLastAssistantMessage'
            );
          }

          // Resend the user message
          sendMessage(lastUserMessage.content);
        }
      },

      createNewSession: async () => {
        // Retry logic for session service availability
        const maxRetries = 10;
        const retryDelay = 500; // 500ms

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          const { _sessionService } = get();

          if (_sessionService) {
            try {
              const sessionData = {
                title: `Chat Session ${new Date().toLocaleDateString()}`,
                metadata: {
                  title: `Chat Session ${new Date().toLocaleDateString()}`,
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
              };

              const session = await _sessionService.createSession(sessionData);
              console.log('[ChatStore] Created new session:', session.id);
              return session.id;
            } catch (error) {
              console.error('[ChatStore] Failed to create session:', error);
              if (attempt === maxRetries - 1) {
                throw error;
              }
            }
          } else {
            console.log(`[ChatStore] Session service not available, retrying... (${attempt + 1}/${maxRetries})`);
            if (attempt < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }
        }

        // Fallback: create a temporary session in memory if session service is still not available
        console.warn('[ChatStore] Session service not available after retries, creating temporary session');
        const tempSessionId = `temp_${Date.now()}`;

        // Set a temporary session in the store
        const tempSession: Session = {
          id: tempSessionId,
          title: `Temporary Chat ${new Date().toLocaleDateString()}`,
          created_at: new Date(),
          updated_at: new Date(),
          messages: [],
          metadata: {
            title: `Temporary Chat ${new Date().toLocaleDateString()}`,
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
        };

        // Set the temporary session directly
        get().setCurrentSession(tempSession);
        return tempSessionId;
      },

      // Session service actions
      setSessionService: (sessionService) => set({ _sessionService: sessionService }, false, 'setSessionService'),
    }),
    { name: 'chat-store' }
  )
);