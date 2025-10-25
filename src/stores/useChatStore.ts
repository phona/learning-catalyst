import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Message, StreamChunk, ChatOptions } from '@/types/ai';
import type { Session } from '@/types/session';
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
  showThinking: boolean;
  autoScroll: boolean;
  selectedProvider: string;
  selectedModel: string;

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
  setShowThinking: (show: boolean) => void;
  toggleThinking: () => void;
  setAutoScroll: (autoScroll: boolean) => void;
  setSelectedProvider: (provider: string) => void;
  setSelectedModel: (model: string) => void;

  // Chat actions
  sendMessage: (content: string, options?: ChatOptions) => Promise<void>;
  stopStreaming: () => void;
  retryLastMessage: () => void;
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
      showThinking: true,
      autoScroll: true,
      selectedProvider: 'openai',
      selectedModel: 'gpt-3.5-turbo',

      // Actions
      setCurrentSession: (session) => set({ currentSession: session }, false, 'setCurrentSession'),

      setMessages: (messages) => set({ messages }, false, 'setMessages'),

      addMessage: (message) => set(
        (state) => {
          const newMessages = [...state.messages, message];
          // 限制消息数量，移除最旧的消息
          if (newMessages.length > state.maxMessages) {
            const removed = newMessages.length - state.maxMessages;
            console.warn(`[Chat Store] Limiting messages: removed ${removed} old messages to prevent memory leak`);
            return { messages: newMessages.slice(-state.maxMessages) };
          }
          return { messages: newMessages };
        },
        false,
        'addMessage'
      ),

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
      setShowThinking: (show) => set({ showThinking: show }, false, 'setShowThinking'),

      toggleThinking: () => {
      console.log('toggleThinking called, current state:', get().showThinking);
      set((state) => {
        const newState = !state.showThinking;
        console.log('toggleThinking setting to:', newState);
        return { showThinking: newState };
      }, false, 'toggleThinking');
    },

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

        // Re-enable thinking for new message if provider supports it
        const { config } = useConfigStore.getState();
        const chatModelConfig = config?.ai?.model_types?.chat;
        const apiKey = chatModelConfig?.api_keys?.[selectedProvider as keyof typeof chatModelConfig.api_keys];
        const shouldShowThinking = config?.ai?.enable_thinking &&
                                 (selectedProvider === 'chatglm' || apiKey);

        if (shouldShowThinking) {
          set({ showThinking: true }, false, 'enableThinkingForNewMessage');
        }

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

            // Auto-hide thinking process when response is complete
            const state = get();
            if (state.showThinking && thinkingContent) {
              // Only auto-hide if thinking content was actually shown
              set({ showThinking: false }, false, 'autoHideThinking');
            }
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

            // Auto-hide thinking process when response is complete (non-streaming)
            const state = get();
            if (state.showThinking && chatResponse.reasoning_content) {
              // Only auto-hide if thinking content was actually present
              set({ showThinking: false }, false, 'autoHideThinkingNonStreaming');
            }
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
    }),
    { name: 'chat-store' }
  )
);