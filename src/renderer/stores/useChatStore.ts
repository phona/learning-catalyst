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

  setInputText: (text: string) => void;
  setError: (error: string | null) => void;

  // UI actions
  setShowThinking: (show: boolean) => void;
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

      // UI state
      showThinking: true,
      autoScroll: true,
      selectedProvider: 'openai',
      selectedModel: 'gpt-3.5-turbo',

      // Actions
      setCurrentSession: (session) => set({ currentSession: session }, false, 'setCurrentSession'),

      setMessages: (messages) => set({ messages }, false, 'setMessages'),

      addMessage: (message) => set(
        (state) => ({ messages: [...state.messages, message] }),
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

        if (chunk.reasoning_content) {
          set(
            { thinkingContent: state.thinkingContent + chunk.reasoning_content },
            false,
            'appendThinkingChunk'
          );
        }

        if (chunk.content) {
          set(
            { streamingContent: state.streamingContent + chunk.content },
            false,
            'appendContentChunk'
          );
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

      setInputText: (text) => set({ inputText: text }, false, 'setInputText'),

      setError: (error) => set({ error }, false, 'setError'),

      // UI actions
      setShowThinking: (show) => set({ showThinking: show }, false, 'setShowThinking'),

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
          // Get provider config
          const { config } = useConfigStore.getState();
          const providerConfig = config?.ai?.providers[selectedProvider];

          if (!providerConfig) {
            throw new Error(`No configuration found for provider: ${selectedProvider}`);
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

          // Handle streaming response
          if (response && typeof response[Symbol.asyncIterator] === 'function') {
            let assistantContent = '';
            let thinkingContent = '';

            // Process stream
            for await (const chunk of chatService.processStreamResponse(response)) {
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
            };
            addMessage(assistantMessage);
          } else {
            // Non-streaming response (fallback)
            const chatResponse = response as any;
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: chatResponse.content,
              reasoning_content: chatResponse.reasoning_content,
              timestamp: new Date(),
              provider: selectedProvider,
              tokens_used: chatResponse.usage?.total_tokens,
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
    }),
    { name: 'chat-store' }
  )
);