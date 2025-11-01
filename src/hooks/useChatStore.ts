import { useMemo } from 'react';
import { useAppServices } from './useAppServices';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Message, StreamChunk, ChatOptions } from '@/types/ai';
import type { Session, ConversationMessage, MemorySession, SessionSaveResult } from '@/types/session';
import { chatService } from '@/services/ai/chatService';
import { ChatMessageService } from '@/services/chat/chatMessageService';
import type { SessionService } from '@/services/sessionService';

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
  saveCurrentSession: () => Promise<SessionSaveResult>;
  updateCurrentSessionTitle: (title: string) => Promise<void>;
}

// Create a store factory function
function createChatStore(sessionService: SessionService) {
  return create<ChatStore>()(
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
        maxMessages: 1000,

        // UI state
        autoScroll: true,
        selectedProvider: 'openai',
        selectedModel: 'gpt-3.5-turbo',

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

          // Limit message count, remove oldest messages
          let finalMessages = newMessages;
          if (newMessages.length > state.maxMessages) {
            const removed = newMessages.length - state.maxMessages;
            console.warn(`[Chat Store] Limiting messages: removed ${removed} old messages to prevent memory leak`);
            finalMessages = newMessages.slice(-state.maxMessages);
          }

          // Update state
          set({ messages: finalMessages }, false, 'addMessage');

          // Check if this is the first assistant message in a new session
          const isFirstAssistantMessage = message.role === 'assistant' &&
            state.messages.filter(m => m.role === 'assistant').length === 0;

          // If this is the first assistant message, save the session and all messages
          if (isFirstAssistantMessage) {
            console.log('[ChatStore] First assistant message detected, generating AI title and saving session...');

            // Generate AI title based on the first user message
            const userMessages = state.messages.filter(m => m.role === 'user');
            if (userMessages.length > 0) {
              const firstUserMessage = userMessages[0].content;

              // Generate title asynchronously with a small delay to ensure chat service is ready
              setTimeout(async () => {
                try {
                  // Pass the current provider and model to the title generation
                  const aiTitle = await sessionService.generateAITitle(
                    firstUserMessage,
                    state.selectedProvider,
                    state.selectedModel
                  );
                  if (aiTitle && aiTitle !== 'Untitled Session') {
                    // Update session title with AI-generated title
                    set((currentState) => ({
                      currentSession: currentState.currentSession ? {
                        ...currentState.currentSession,
                        title: aiTitle,
                        metadata: {
                          ...currentState.currentSession.metadata,
                          title: aiTitle
                        }
                      } : null
                    }), false, 'updateSessionTitle');

                    // Also update the title in the database for recent sessions list
                    if (state.currentSession?.id) {
                      try {
                        await sessionService.updateSessionTitle(state.currentSession.id, aiTitle);
                        console.log('[ChatStore] Persisted AI-generated title to database:', aiTitle);

                        // Emit event to refresh recent sessions list
                        window.dispatchEvent(new CustomEvent('sessionTitleUpdated', {
                          detail: {
                            sessionId: state.currentSession.id,
                            oldTitle: state.currentSession.title,
                            newTitle: aiTitle
                          }
                        }));
                      } catch (dbError) {
                        console.warn('[ChatStore] Failed to persist AI title to database:', dbError);
                      }
                    }

                    console.log('[ChatStore] Updated session title with AI-generated title:', aiTitle);
                  }
                } catch (error) {
                  console.warn('[ChatStore] Failed to generate AI title:', error);
                }
              }, 500); // 500ms delay to ensure chat service is initialized
            }

            // Save session asynchronously (don't block UI)
            state.saveCurrentSession()
              .then((result) => {
                if (result.success) {
                  console.log('[ChatStore] Session saved with first message');

                  // Emit event for UI updates
                  window.dispatchEvent(new CustomEvent('sessionCreated', {
                    detail: {
                      sessionId: result.sessionId,
                      isNew: true,
                      hasFirstMessage: true
                    }
                  }));
                } else {
                  console.error('[ChatStore] Failed to save session with first message:', result.error);
                  // Show error to user (could add toast notification here)
                }
              })
              .catch((error) => {
                console.error('[ChatStore] Error during session save:', error);
              });
          }
          // For sessions with valid IDs, save individual messages to database
          else if (state.currentSession && state.currentSession.id) {
            console.log('[ChatStore] Saving message to session:', state.currentSession.id, message.role);
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
            sessionService.saveMessage(state.currentSession.id, conversationMessage)
              .then(() => console.log('[ChatStore] Message saved successfully'))
              .catch((error: any) => console.error('[ChatStore] Failed to save message:', error));
          } else {
            console.log('[ChatStore] Cannot save message - missing session:', {
              hasCurrentSession: !!state.currentSession,
              sessionId: state.currentSession?.id,
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

          // Validate provider configuration
          const configError = ChatMessageService.validateProviderConfig(selectedProvider);
          if (configError) {
            setError(configError);
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

          // Use the extracted service to handle message sending
          await ChatMessageService.sendMessage(
            content,
            currentSession,
            selectedProvider,
            selectedModel,
            options,
            {
              onStartStreaming: () => setStreaming(true),
              onStopStreaming: () => {
                setLoading(false);
                setStreaming(false);
                resetStreaming();
              },
              onStreamChunk: (chunk) => {
                if (chunk.content) {
                  set((_state) => ({
                    streamingContent: _state.streamingContent + chunk.content,
                  }));
                }

                if (chunk.thinkingContent) {
                  set((_state) => ({
                    thinkingContent: _state.thinkingContent + chunk.thinkingContent,
                  }));
                }
              },
              onError: (error) => setError(error),
              onMessageComplete: (message) => addMessage(message),
            }
          );
        },

        stopStreaming: () => set({ isStreaming: false }, false, 'stopStreaming'),

        retryLastMessage: () => {
          const { messages, sendMessage } = get();
          const lastUserMessage = messages
            .filter(msg => msg.role === 'user')
            .pop();

          if (lastUserMessage) {
            // Remove the last assistant message if it exists
            const { messages: currentMessages } = get();
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
          const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

          const memorySession: MemorySession = {
            id: sessionId,
            title: 'Untitled Session',
            created_at: new Date(),
            updated_at: new Date(),
            messages: [],
            metadata: {
              title: 'Untitled Session',
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

          // Set as current session without database call
          set({
            currentSession: memorySession as any, // Type assertion for compatibility
            messages: [],
          }, false, 'createNewSession');

          console.log('[ChatStore] Created session:', sessionId);
          return sessionId;
        },

        saveCurrentSession: async () => {
          const { currentSession, messages } = get();

          if (!currentSession) {
            return { success: false, error: 'No current session' };
          }

          try {
            // Convert messages to ConversationMessage format
            const conversationMessages = messages.map(msg => ({
              id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp || new Date(),
              provider: msg.provider,
              model: undefined, // Not available in Message type
              thinking_content: msg.thinking_content,
              tokens_used: msg.tokens_used?.total_tokens || 0,
              metadata: undefined,
            }));

            // Call session service for idempotent save (create or update)
            const sessionId = await sessionService.saveSessionWithMessages(
              currentSession as MemorySession,
              conversationMessages
            );

            // Update session with the returned ID (in case it was newly created)
            const updatedSession = {
              ...currentSession,
              id: sessionId,
            };

            set({
              currentSession: updatedSession as any,
            }, false, 'sessionSaved');

            console.log('[ChatStore] Session saved successfully:', sessionId);
            return {
              success: true,
              sessionId
            };

          } catch (error) {
            console.error('[ChatStore] Failed to save session:', error);

            // Session save failed - no state change needed since we don't track persistence

            return {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to save session'
            };
          }
        },

        updateCurrentSessionTitle: async (title: string) => {
          const { currentSession } = get();

          if (!currentSession) {
            console.warn('[ChatStore] Cannot update title: no current session');
            return;
          }

          if (!title || title.trim() === '') {
            console.warn('[ChatStore] Cannot update title: empty title provided');
            return;
          }

          const trimmedTitle = title.trim();

          try {
            // Update session title in local state immediately
            set((state) => ({
              currentSession: state.currentSession ? {
                ...state.currentSession,
                title: trimmedTitle,
                metadata: {
                  ...state.currentSession.metadata,
                  title: trimmedTitle
                }
              } : null
            }), false, 'updateCurrentSessionTitle');

            // If session has an ID, also update it in the database
            if (currentSession.id) {
              await sessionService.updateSessionTitle(currentSession.id, trimmedTitle);
              console.log('[ChatStore] Updated session title in database:', {
                sessionId: currentSession.id,
                oldTitle: currentSession.title,
                newTitle: trimmedTitle
              });

              // Emit event to refresh recent sessions list
              window.dispatchEvent(new CustomEvent('sessionTitleUpdated', {
                detail: {
                  sessionId: currentSession.id,
                  oldTitle: currentSession.title,
                  newTitle: trimmedTitle
                }
              }));
            } else {
              console.log('[ChatStore] Session title updated locally (no ID to persist to database)');
            }
          } catch (error) {
            console.error('[ChatStore] Failed to update session title:', error);
            // Optionally revert the local state change on error
            set((state) => ({
              currentSession: state.currentSession ? {
                ...state.currentSession,
                title: currentSession.title, // Revert to original title
                metadata: {
                  ...state.currentSession.metadata,
                  title: currentSession.title
                }
              } : null
            }), false, 'revertSessionTitle');
          }
        },
      }),
      { name: 'chat-store' }
    )
  );
}

// Global store cache to prevent recreating stores
let cachedStore: ReturnType<typeof createChatStore> | null = null;
let cachedSessionService: SessionService | null = null;

/**
 * Hook to get the chat store with proper dependency injection
 * This replaces the old useChatStoreWithServices hook
 */
export function useChatStore() {
  const { services } = useAppServices();

  if (!services?.sessionService) {
    throw new Error('SessionService is required but not available. Make sure ServiceProvider is properly configured.');
  }

  // Use useMemo to create store only when sessionService changes
  const store = useMemo(() => {
    // Return cached store if the same sessionService is being used
    if (cachedStore && cachedSessionService === services.sessionService) {
      return cachedStore;
    }

    // Create new store and cache it
    cachedStore = createChatStore(services.sessionService);
    cachedSessionService = services.sessionService;
    return cachedStore;
  }, [services.sessionService]);

  return store;
}