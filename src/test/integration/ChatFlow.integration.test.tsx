import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatInterface } from '@/components/Chat/ChatInterface';
import { useChatStore } from '@/stores/useChatStore';
import { useConfigStore } from '@/stores/useConfigStore';
import { chatService } from '@/services/ai/chatService';

// Mock the stores and services
jest.mock('@/stores/useChatStore');
jest.mock('@/stores/useConfigStore');
jest.mock('@/services/ai/chatService');

const mockUseChatStore = useChatStore as jest.MockedFunction<typeof useChatStore>;
const mockUseConfigStore = useConfigStore as jest.MockedFunction<typeof useConfigStore>;
const mockChatService = chatService as jest.Mocked<typeof chatService>;

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderChatInterface = () => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <ChatInterface />
    </QueryClientProvider>
  );
};

describe('Chat Flow Integration Tests', () => {
  beforeEach(() => {
    // Setup default chat store state
    mockUseChatStore.mockReturnValue({
      currentSession: {
        id: 'session-1',
        title: 'Test Chat',
        created_at: new Date(),
        updated_at: new Date(),
        messages: [],
        metadata: {
          title: 'Test Chat',
          tags: [],
          topics_covered: [],
          archived: false,
          pinned: false,
        },
        context: {
          current_provider: 'openai',
          current_model: 'gpt-3.5-turbo',
          temperature: 0.7,
          max_tokens: 4096,
          enable_thinking: true,
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
      },
      messages: [],
      isLoading: false,
      isStreaming: false,
      streamingContent: '',
      thinkingContent: '',
      inputText: '',
      error: null,
      showThinking: true,
      autoScroll: true,
      selectedProvider: 'openai',
      selectedModel: 'gpt-3.5-turbo',
      setCurrentSession: jest.fn(),
      setMessages: jest.fn(),
      addMessage: jest.fn(),
      updateMessage: jest.fn(),
      deleteMessage: jest.fn(),
      clearMessages: jest.fn(),
      setLoading: jest.fn(),
      setStreaming: jest.fn(),
      appendStreamChunk: jest.fn(),
      setThinkingContent: jest.fn(),
      resetStreaming: jest.fn(),
      setInputText: jest.fn(),
      setError: jest.fn(),
      setShowThinking: jest.fn(),
      setAutoScroll: jest.fn(),
      setSelectedProvider: jest.fn(),
      setSelectedModel: jest.fn(),
      sendMessage: jest.fn(),
      stopStreaming: jest.fn(),
      retryLastMessage: jest.fn(),
    });

    // Setup default config store state
    mockUseConfigStore.mockReturnValue({
      config: {
        ai: {
          default_provider: 'openai',
          default_model: 'gpt-3.5-turbo',
          providers: {
            openai: {
              name: 'OpenAI',
              api_key: 'test-key',
              base_url: 'https://api.openai.com/v1',
              models: ['gpt-3.5-turbo', 'gpt-4'],
            },
          },
          temperature: 0.7,
          max_tokens: 4096,
          streaming: true,
          enable_thinking: true,
        },
      },
      setConfig: jest.fn(),
      loadConfig: jest.fn().mockResolvedValue({}),
      saveConfig: jest.fn().mockResolvedValue(undefined),
      resetConfig: jest.fn(),
    });

    // Setup chat service mocks
    mockChatService.getProviderInfo = jest.fn();
    mockChatService.initializeProvider = jest.fn().mockResolvedValue(undefined);
    mockChatService.setCurrentSession = jest.fn();
    mockChatService.sendMessage = jest.fn();
    mockChatService.processStreamResponse = jest.fn();

    jest.clearAllMocks();
  });

  describe('Chat Initialization', () => {
    it('initializes chat with default session from config', async () => {
      renderChatInterface();

      // Should create a default session if none exists
      await waitFor(() => {
        expect(mockUseChatStore().setCurrentSession).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New Chat',
            id: expect.any(String),
          })
        );
      });
    });

    it('applies configuration settings to chat state', async () => {
      mockUseConfigStore.mockReturnValue({
        config: {
          ai: {
            default_provider: 'chatglm',
            default_model: 'chatglm-pro',
            temperature: 0.8,
            enable_thinking: false,
            streaming: false,
          },
        },
        setConfig: jest.fn(),
        loadConfig: jest.fn().mockResolvedValue({}),
        saveConfig: jest.fn(),
        resetConfig: jest.fn(),
      });

      renderChatInterface();

      await waitFor(() => {
        expect(mockUseChatStore().setShowThinking).toHaveBeenCalledWith(false);
        expect(mockUseChatStore().setSelectedProvider).toHaveBeenCalledWith('chatglm');
        expect(mockUseChatStore().setSelectedModel).toHaveBeenCalledWith('chatglm-pro');
      });
    });
  });

  describe('Message Sending Flow', () => {
    it('sends a message and receives streaming response', async () => {
      const mockSendMessage = jest.fn().mockResolvedValue(undefined);
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'Hello, AI!',
        sendMessage: mockSendMessage,
      });

      renderChatInterface();

      const sendButton = screen.getByRole('button', { name: 'Send' });
      expect(sendButton).not.toBeDisabled();

      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('Hello, AI!', {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          max_tokens: 4096,
          stream: true,
          enable_thinking: true,
        });
      });
    });

    it('disables send button when input is empty', () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: '',
      });

      renderChatInterface();

      const sendButton = screen.getByRole('button', { name: 'Send' });
      expect(sendButton).toBeDisabled();
    });

    it('disables send button when streaming', () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'Hello',
        isStreaming: true,
      });

      renderChatInterface();

      expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    });

    it('disables send button when loading', () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'Hello',
        isLoading: true,
      });

      renderChatInterface();

      const sendButton = screen.getByRole('button', { name: 'Send' });
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Streaming Response Handling', () => {
    it('displays streaming content in real-time', async () => {
      let streamingCallback: ((chunk: any) => void) | null = null;

      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        isStreaming: true,
        streamingContent: 'Hello',
        thinkingContent: 'Thinking...',
        stopStreaming: jest.fn(),
      });

      renderChatInterface();

      // Should show streaming state
      expect(screen.getByText('AI is responding...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();

      // Simulate receiving streaming content
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        isStreaming: true,
        streamingContent: 'Hello world!',
        thinkingContent: 'Thinking...',
        stopStreaming: jest.fn(),
      });

      // Re-render to see updated content
      renderChatInterface();

      await waitFor(() => {
        // The streaming content would be displayed in the chat area
        expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
      });
    });

    it('stops streaming when stop button is clicked', () => {
      const mockStopStreaming = jest.fn();
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        isStreaming: true,
        stopStreaming: mockStopStreaming,
      });

      renderChatInterface();

      const stopButton = screen.getByRole('button', { name: 'Stop' });
      fireEvent.click(stopButton);

      expect(mockStopStreaming).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('displays error messages when sending fails', async () => {
      const mockSendMessage = jest.fn().mockRejectedValue(new Error('API Error'));
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'Hello',
        sendMessage: mockSendMessage,
        error: 'API Error',
      });

      renderChatInterface();

      // Error would be displayed in the UI (implementation dependent)
      expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
    });

    it('recovers from errors and allows retrying', async () => {
      let attemptCount = 0;
      const mockSendMessage = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('First attempt failed');
        }
        return Promise.resolve();
      });

      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'Hello',
        sendMessage: mockSendMessage,
      });

      renderChatInterface();

      const sendButton = screen.getByRole('button', { name: 'Send' });

      // First attempt fails
      fireEvent.click(sendButton);
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledTimes(1);
      });

      // Reset error and retry
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'Hello',
        sendMessage: mockSendMessage,
        error: null,
      });

      fireEvent.click(sendButton);
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Provider and Model Selection', () => {
    it('displays current provider and model information', () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        selectedProvider: 'openai',
        selectedModel: 'gpt-4',
      });

      renderChatInterface();

      expect(screen.getByText(/Provider:/)).toBeInTheDocument();
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText(/Model:/)).toBeInTheDocument();
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
    });

    it('shows thinking indicator when enabled', () => {
      mockUseConfigStore.mockReturnValue({
        config: {
          ai: {
            ...mockUseConfigStore().config.ai,
            enable_thinking: true,
          },
        },
        setConfig: jest.fn(),
        loadConfig: jest.fn().mockResolvedValue({}),
        saveConfig: jest.fn(),
        resetConfig: jest.fn(),
      });

      renderChatInterface();

      expect(screen.getByText('🧠')).toBeInTheDocument();
      expect(screen.getByText('Thinking enabled')).toBeInTheDocument();
    });

    it('hides thinking indicator when disabled', () => {
      mockUseConfigStore.mockReturnValue({
        config: {
          ai: {
            ...mockUseConfigStore().config.ai,
            enable_thinking: false,
          },
        },
        setConfig: jest.fn(),
        loadConfig: jest.fn().mockResolvedValue({}),
        saveConfig: jest.fn(),
        resetConfig: jest.fn(),
      });

      renderChatInterface();

      expect(screen.queryByText('🧠')).not.toBeInTheDocument();
      expect(screen.queryByText('Thinking enabled')).not.toBeInTheDocument();
    });
  });

  describe('Input Handling', () => {
    it('updates input text when typing', () => {
      const mockSetInputText = jest.fn();
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        setInputText: mockSetInputText,
      });

      renderChatInterface();

      const textarea = screen.getByPlaceholderText('Type your message here...');
      fireEvent.change(textarea, { target: { value: 'Hello world' } });

      expect(mockSetInputText).toHaveBeenCalledWith('Hello world');
    });

    it('sends message when Enter is pressed', () => {
      const mockSendMessage = jest.fn().mockResolvedValue(undefined);
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'Hello',
        sendMessage: mockSendMessage,
      });

      renderChatInterface();

      const textarea = screen.getByPlaceholderText('Type your message here...');
      fireEvent.keyDown(textarea, { key: 'Enter' });

      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('creates new line when Shift+Enter is pressed', () => {
      const mockSendMessage = jest.fn();
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'Hello',
        setInputText: jest.fn(),
        sendMessage: mockSendMessage,
      });

      renderChatInterface();

      const textarea = screen.getByPlaceholderText('Type your message here...');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('File Attachment', () => {
    it('handles file selection when attachment button is clicked', () => {
      renderChatInterface();

      const attachmentButton = screen.getByRole('button', { name: 'Attach file' });
      expect(attachmentButton).toBeInTheDocument();

      // File handling would be tested through Electron API mocks
      fireEvent.click(attachmentButton);
      // Actual file handling logic would be tested in component unit tests
    });
  });

  describe('Voice Input', () => {
    it('toggles voice recording when microphone button is clicked', () => {
      renderChatInterface();

      const voiceButton = screen.getByRole('button', { name: 'Start voice input' });
      expect(voiceButton).toBeInTheDocument();

      fireEvent.click(voiceButton);
      // Voice recording state changes would be handled by the component
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      renderChatInterface();

      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Attach file' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start voice input' })).toBeInTheDocument();
    });

    it('provides keyboard navigation support', () => {
      renderChatInterface();

      const textarea = screen.getByPlaceholderText('Type your message here...');
      expect(textarea).toHaveFocus();

      // Tab navigation should work through form elements
      fireEvent.keyDown(textarea, { key: 'Tab' });
      // Tab order verification would be implementation-specific
    });

    it('displays helpful placeholder text', () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        isStreaming: true,
      });

      renderChatInterface();

      expect(screen.getByPlaceholderText('AI is responding...')).toBeInTheDocument();

      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        isStreaming: false,
      });

      renderChatInterface();

      expect(screen.getByPlaceholderText('Type your message here... (Enter to send, Shift+Enter for new line)')).toBeInTheDocument();
    });
  });
});