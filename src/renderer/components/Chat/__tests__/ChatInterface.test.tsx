/**
 * ChatInterface Component Tests
 *
 * Comprehensive tests for the ChatInterface component focusing on:
 * - Real user chat workflows
 * - Streaming response handling
 * - Error recovery scenarios
 * - Session management integration
 * - Thinking process visibility
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '../ChatInterface';

// Mock the hooks used by the component
vi.mock('../../../hooks/useSessionInit', () => ({
  useSessionInit: vi.fn(),
}));

vi.mock('../../../hooks/useChatStore', () => ({
  useChatStore: vi.fn(() => ({
    messages: [],
    isStreaming: false,
    streamingContent: '',
    thinkingContent: '',
    inputText: '',
    error: null,
    currentSession: null,
    addMessage: vi.fn(),
    updateMessage: vi.fn(),
    setLoading: vi.fn(),
    setStreaming: vi.fn(),
    appendStreamChunk: vi.fn(),
    setThinkingContent: vi.fn(),
    resetStreaming: vi.fn(),
    setInputText: vi.fn(),
    setError: vi.fn(),
    sendMessage: vi.fn(),
    stopStreaming: vi.fn(),
    setCurrentSession: vi.fn(),
    setMessages: vi.fn(),
  })),
}));

vi.mock('../../../stores/useAppStore', () => ({
  useAppStore: vi.fn(() => ({
    sidebar_open: true,
    settings_panel_open: false,
    theme: 'dark',
    current_view: 'chat',
    focus_mode: false,
    loading: false,
    error_message: undefined,
    success_message: undefined,
    setCurrentView: vi.fn(),
    setSidebarOpen: vi.fn(),
    setSettingsPanelOpen: vi.fn(),
    setTheme: vi.fn(),
    setFocusMode: vi.fn(),
    toggleFocusMode: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    setSuccess: vi.fn(),
    clearMessages: vi.fn(),
  })),
}));

vi.mock('../../../stores/useConfigStore', () => ({
  useConfigStore: vi.fn(() => ({
    config: {
      ai: {
        model_types: {
          chat: {
            default_provider: 'openai',
            default_model: 'gpt-3.5-turbo',
            capabilities: {
              streaming: true,
              thinking: true,
            }
          }
        }
      },
      ui: {
        theme: 'dark',
        show_token_usage: true,
      }
    },
    setConfig: vi.fn(),
    updateConfig: vi.fn(),
    loadConfig: vi.fn().mockResolvedValue({
      ai: {
        model_types: {
          chat: {
            default_provider: 'openai',
            default_model: 'gpt-3.5-turbo',
            capabilities: {
              streaming: true,
              thinking: true,
            }
          }
        }
      }
    }),
  })),
}));

// Mock electronAPI
const mockElectronAPI = {
  catalyst: {
    sendChatStream: vi.fn(),
  },
  sessions: {
    get: vi.fn(),
    update: vi.fn(),
    list: vi.fn(),
  },
  getConfig: vi.fn(),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

describe('ChatInterface - Real User Workflows', () => {
  const mockUseSessionInit = vi.mocked(require('../../../hooks/useSessionInit').useSessionInit);
  const mockUseChatStore = vi.mocked(require('../../../hooks/useChatStore').useChatStore);

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock returns for initialization
    mockUseSessionInit.mockReturnValue({
      loading: false,
      error: null,
    });

    mockUseChatStore.mockReturnValue({
      messages: [],
      isStreaming: false,
      streamingContent: '',
      thinkingContent: '',
      inputText: '',
      error: null,
      currentSession: null,
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      setLoading: vi.fn(),
      setStreaming: vi.fn(),
      appendStreamChunk: vi.fn(),
      setThinkingContent: vi.fn(),
      resetStreaming: vi.fn(),
      setInputText: vi.fn(),
      setError: vi.fn(),
      sendMessage: vi.fn().mockResolvedValue(undefined),
      stopStreaming: vi.fn(),
      setCurrentSession: vi.fn(),
      setMessages: vi.fn(),
    });
  });

  describe('Basic Chat Workflow', () => {
    it('should render chat interface with empty state', async () => {
      render(<ChatInterface />);
      
      // Verify chat interface loads
      expect(screen.getByText('Welcome to Learning Catalyst')).toBeInTheDocument();
      
      // Verify input area is available
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      
      // Verify suggested prompts are shown
      expect(screen.getByText('Ask Questions')).toBeInTheDocument();
      expect(screen.getByText('Learn Concepts')).toBeInTheDocument();
    });

    it('should handle message sending and receiving', async () => {
      const user = userEvent.setup();
      
      const mockChatStore = {
        messages: [],
        isStreaming: false,
        streamingContent: '',
        thinkingContent: '',
        inputText: '',
        error: null,
        currentSession: { id: 'session-1', title: 'Test Session' },
        addMessage: vi.fn(),
        updateMessage: vi.fn(),
        setLoading: vi.fn(),
        setStreaming: vi.fn(),
        appendStreamChunk: vi.fn(),
        setThinkingContent: vi.fn(),
        resetStreaming: vi.fn(),
        setInputText: vi.fn(),
        setError: vi.fn(),
        sendMessage: vi.fn().mockResolvedValue(undefined),
        stopStreaming: vi.fn(),
        setCurrentSession: vi.fn(),
        setMessages: vi.fn(),
      };
      
      mockUseChatStore.mockReturnValue(mockChatStore);
      
      render(<ChatInterface />);
      
      // User types a message
      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello, I want to learn about React hooks');
      
      // User sends the message
      const sendButton = screen.getByText('Send');
      await user.click(sendButton);
      
      // Verify message was sent
      await waitFor(() => {
        expect(mockChatStore.sendMessage).toHaveBeenCalledWith('Hello, I want to learn about React hooks');
      });
      
      // Verify input is cleared after sending
      expect(input).toHaveValue('');
    });
  });

  describe('Streaming Response Handling', () => {
    it('should handle streaming responses with proper visual feedback', async () => {
      const user = userEvent.setup();
      
      // Mock streaming simulation
      const mockChatStore = {
        messages: [],
        isStreaming: true,
        streamingContent: '',
        thinkingContent: '',
        inputText: '',
        error: null,
        currentSession: { id: 'session-1', title: 'Test Session' },
        addMessage: vi.fn(),
        updateMessage: vi.fn(),
        setLoading: vi.fn(),
        setStreaming: vi.fn(),
        appendStreamChunk: vi.fn(),
        setThinkingContent: vi.fn(),
        resetStreaming: vi.fn(),
        setInputText: vi.fn(),
        setError: vi.fn(),
        sendMessage: vi.fn().mockImplementation(async () => {
          // Simulate streaming by updating store directly
          mockChatStore.streamingContent = 'React hooks';
          mockChatStore.isStreaming = true;
        }),
        stopStreaming: vi.fn(),
        setCurrentSession: vi.fn(),
        setMessages: vi.fn(),
      };
      
      mockUseChatStore.mockReturnValue(mockChatStore);
      
      render(<ChatInterface />);
      
      // Send a message
      await user.type(screen.getByRole('textbox'), 'Explain React hooks');
      await user.click(screen.getByText('Send'));
      
      // Verify streaming state is shown
      await waitFor(() => {
        expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
      });
      
      // Simulate streaming progress
      act(() => {
        mockChatStore.streamingContent = 'React hooks allow functional components to use state and lifecycle features.';
        mockChatStore.isStreaming = true;
      });
      
      // Verify streaming content appears
      expect(screen.getByText(/React hooks allow/)).toBeInTheDocument();
    });

    it('should handle streaming cancellation', async () => {
      const user = userEvent.setup();
      
      const mockChatStore = {
        messages: [],
        isStreaming: true,
        streamingContent: 'Partial response...',
        thinkingContent: 'Thinking about React hooks...',
        inputText: '',
        error: null,
        currentSession: { id: 'session-1', title: 'Test Session' },
        addMessage: vi.fn(),
        updateMessage: vi.fn(),
        setLoading: vi.fn(),
        setStreaming: vi.fn(),
        appendStreamChunk: vi.fn(),
        setThinkingContent: vi.fn(),
        resetStreaming: vi.fn(),
        setInputText: vi.fn(),
        setError: vi.fn(),
        sendMessage: vi.fn(),
        stopStreaming: vi.fn(),
        setCurrentSession: vi.fn(),
        setMessages: vi.fn(),
      };
      
      mockUseChatStore.mockReturnValue(mockChatStore);
      
      render(<ChatInterface />);
      
      // Simulate active streaming
      act(() => {
        mockChatStore.isStreaming = true;
      });
      
      // Verify stop button appears during streaming
      await waitFor(() => {
        const stopButton = screen.getByText('Stop');
        expect(stopButton).toBeInTheDocument();
        expect(stopButton).toBeEnabled();
      });
      
      // User stops streaming
      const stopButton = screen.getByText('Stop');
      await user.click(stopButton);
      
      // Verify stop function was called
      expect(mockChatStore.stopStreaming).toHaveBeenCalled();
    });
  });

  describe('Thinking Process Integration', () => {
    it('should display and toggle AI thinking process', async () => {
      const user = userEvent.setup();
      
      // Mock messages with thinking content
      const mockMessages = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'React hooks are functions that let you use state and other React features.',
          thinking_content: 'User asked about React hooks, need to explain useState, useEffect, etc.',
          timestamp: new Date(),
          showThinking: false,
        }
      ];
      
      const mockChatStore = {
        messages: mockMessages,
        isStreaming: false,
        streamingContent: '',
        thinkingContent: '',
        inputText: '',
        error: null,
        currentSession: { id: 'session-1', title: 'Test Session' },
        addMessage: vi.fn(),
        updateMessage: vi.fn().mockImplementation((id, updates) => {
          // Update the local message to simulate state change
          const msg = mockMessages.find(m => m.id === id);
          if (msg) {
            Object.assign(msg, updates);
          }
        }),
        setLoading: vi.fn(),
        setStreaming: vi.fn(),
        appendStreamChunk: vi.fn(),
        setThinkingContent: vi.fn(),
        resetStreaming: vi.fn(),
        setInputText: vi.fn(),
        setError: vi.fn(),
        sendMessage: vi.fn(),
        stopStreaming: vi.fn(),
        setCurrentSession: vi.fn(),
        setMessages: vi.fn(),
      };
      
      mockUseChatStore.mockReturnValue(mockChatStore);
      
      render(<ChatInterface />);
      
      // Verify thinking toggle button is available
      await waitFor(() => {
        expect(screen.getByText('Show')).toBeInTheDocument();
      });
      
      // User clicks to show thinking
      const showButton = screen.getByText('Show');
      await user.click(showButton);
      
      // Verify thinking content is displayed
      expect(screen.getByText('Thinking Process')).toBeInTheDocument();
      expect(screen.getByText('User asked about React hooks')).toBeInTheDocument();
    });

    it('should handle streaming thinking content', async () => {
      const user = userEvent.setup();
      
      const mockChatStore = {
        messages: [],
        isStreaming: true,
        streamingContent: '',
        thinkingContent: 'Analyzing user question about React hooks...',
        inputText: '',
        error: null,
        currentSession: { id: 'session-1', title: 'Test Session' },
        addMessage: vi.fn(),
        updateMessage: vi.fn(),
        setLoading: vi.fn(),
        setStreaming: vi.fn(),
        appendStreamChunk: vi.fn(),
        setThinkingContent: vi.fn(),
        resetStreaming: vi.fn(),
        setInputText: vi.fn(),
        setError: vi.fn(),
        sendMessage: vi.fn(),
        stopStreaming: vi.fn(),
        setCurrentSession: vi.fn(),
        setMessages: vi.fn(),
      };
      
      mockUseChatStore.mockReturnValue(mockChatStore);
      
      render(<ChatInterface />);
      
      // Simulate streaming with thinking content
      act(() => {
        mockChatStore.thinkingContent = 'User wants to learn React hooks... Identifying key concepts...';
        mockChatStore.isStreaming = true;
      });
      
      // Verify thinking content appears during streaming
      expect(screen.getByText('AI Thinking Process (Live)')).toBeInTheDocument();
      expect(screen.getByText(/Identifying key concepts/)).toBeInTheDocument();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle message sending errors gracefully', async () => {
      const user = userEvent.setup();
      
      const mockChatStore = {
        messages: [],
        isStreaming: false,
        streamingContent: '',
        thinkingContent: '',
        inputText: 'Test message',
        error: 'Network error occurred',
        currentSession: { id: 'session-1', title: 'Test Session' },
        addMessage: vi.fn(),
        updateMessage: vi.fn(),
        setLoading: vi.fn(),
        setStreaming: vi.fn(),
        appendStreamChunk: vi.fn(),
        setThinkingContent: vi.fn(),
        resetStreaming: vi.fn(),
        setInputText: vi.fn(),
        setError: vi.fn(),
        sendMessage: vi.fn().mockRejectedValue(new Error('Network error')),
        stopStreaming: vi.fn(),
        setCurrentSession: vi.fn(),
        setMessages: vi.fn(),
      };
      
      mockUseChatStore.mockReturnValue(mockChatStore);
      
      render(<ChatInterface />);
      
      // User tries to send a message that fails
      await user.type(screen.getByRole('textbox'), 'This will fail');
      await user.click(screen.getByText('Send'));
      
      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText('Network error occurred')).toBeInTheDocument();
      });
      
      // Input should retain the failed message
      expect(screen.getByRole('textbox')).toHaveValue('This will fail');
    });

    it('should recover from streaming errors', async () => {
      const user = userEvent.setup();
      
      let streamingError = false;
      const mockChatStore = {
        messages: [],
        isStreaming: false,
        streamingContent: '',
        thinkingContent: '',
        inputText: '',
        error: null,
        currentSession: { id: 'session-1', title: 'Test Session' },
        addMessage: vi.fn(),
        updateMessage: vi.fn(),
        setLoading: vi.fn(),
        setStreaming: vi.fn(),
        appendStreamChunk: vi.fn().mockImplementation(() => {
          if (streamingError) {
            throw new Error('Streaming error');
          }
        }),
        setThinkingContent: vi.fn(),
        resetStreaming: vi.fn(),
        setInputText: vi.fn(),
        setError: vi.fn(),
        sendMessage: vi.fn().mockImplementation(async () => {
          streamingError = true;
          // Simulate error during streaming
          mockChatStore.setError('Streaming failed');
          mockChatStore.setStreaming(false);
        }),
        stopStreaming: vi.fn(),
        setCurrentSession: vi.fn(),
        setMessages: vi.fn(),
      };
      
      mockUseChatStore.mockReturnValue(mockChatStore);
      
      render(<ChatInterface />);
      
      // Send message that will cause streaming error
      await user.type(screen.getByRole('textbox'), 'Problematic message');
      await user.click(screen.getByText('Send'));
      
      // Verify error recovery
      await waitFor(() => {
        expect(screen.getByText('Streaming failed')).toBeInTheDocument();
      });
    });

    it('should handle session initialization errors', async () => {
      mockUseSessionInit.mockReturnValue({
        loading: false,
        error: 'Failed to load session',
      });
      
      render(<ChatInterface />);
      
      // Should handle session loading errors
      await waitFor(() => {
        expect(screen.getByText('Failed to load session')).toBeInTheDocument();
      });
      
      // Should provide recovery options
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('Performance with Realistic Data', () => {
    it('should handle long conversation histories efficiently', async () => {
      // Mock a long conversation
      const longConversation = Array.from({ length: 50 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i} content demonstrating a discussion about React concepts and best practices.`,
        timestamp: new Date(Date.now() - (50 - i) * 60000), // 1 minute apart
        thinking_content: i % 2 === 1 ? `Thinking about message ${i}...` : undefined,
      }));
      
      const mockChatStore = {
        messages: longConversation,
        isStreaming: false,
        streamingContent: '',
        thinkingContent: '',
        inputText: '',
        error: null,
        currentSession: { id: 'session-1', title: 'Long Conversation Session' },
        addMessage: vi.fn(),
        updateMessage: vi.fn(),
        setLoading: vi.fn(),
        setStreaming: vi.fn(),
        appendStreamChunk: vi.fn(),
        setThinkingContent: vi.fn(),
        resetStreaming: vi.fn(),
        setInputText: vi.fn(),
        setError: vi.fn(),
        sendMessage: vi.fn(),
        stopStreaming: vi.fn(),
        setCurrentSession: vi.fn(),
        setMessages: vi.fn(),
      };
      
      mockUseChatStore.mockReturnValue(mockChatStore);
      
      const startTime = performance.now();
      render(<ChatInterface />);
      
      // Should render efficiently even with long conversations
      await waitFor(() => {
        expect(screen.getByText('Message 0 content')).toBeInTheDocument();
      });
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(2000); // Should render in under 2 seconds
      
      // Should handle scrolling through long conversations
      const chatArea = screen.getByTestId('chat-area');
      await userEvent.wheel(chatArea, { deltaY: 1000 });
      
      expect(chatArea.scrollTop).toBeGreaterThan(0);
    });

    it('should maintain responsiveness during streaming', async () => {
      const user = userEvent.setup();
      
      const mockChatStore = {
        messages: [],
        isStreaming: true,
        streamingContent: '',
        thinkingContent: '',
        inputText: '',
        error: null,
        currentSession: { id: 'session-1', title: 'Test Session' },
        addMessage: vi.fn(),
        updateMessage: vi.fn(),
        setLoading: vi.fn(),
        setStreaming: vi.fn(),
        appendStreamChunk: vi.fn(),
        setThinkingContent: vi.fn(),
        resetStreaming: vi.fn().mockImplementation(() => {
          // Simulate periodic updates during streaming
          act(() => {
            mockChatStore.streamingContent += ' chunk';
            mockChatStore.thinkingContent += ' thinking chunk';
          });
        }),
        setInputText: vi.fn(),
        setError: vi.fn(),
        sendMessage: vi.fn(),
        stopStreaming: vi.fn(),
        setCurrentSession: vi.fn(),
        setMessages: vi.fn(),
      };
      
      mockUseChatStore.mockReturnValue(mockChatStore);
      
      render(<ChatInterface />);
      
      // Start streaming simulation
      act(() => {
        mockChatStore.isStreaming = true;
      });
      
      // UI should remain responsive during streaming
      expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
      
      // User should still be able to interact with stop button
      await waitFor(() => {
        expect(screen.getByText('Stop')).toBeInTheDocument();
      });
    });
  });

  describe('Session Management Integration', () => {
    it('should handle session switching smoothly', async () => {
      const user = userEvent.setup();
      
      // Mock initial session
      const mockChatStore = {
        messages: [
          { id: 'msg-1', role: 'user', content: 'Hello', timestamp: new Date() },
          { id: 'msg-2', role: 'assistant', content: 'Hi there!', timestamp: new Date() }
        ],
        isStreaming: false,
        streamingContent: '',
        thinkingContent: '',
        inputText: '',
        error: null,
        currentSession: { id: 'session-1', title: 'React Learning' },
        addMessage: vi.fn(),
        updateMessage: vi.fn(),
        setLoading: vi.fn(),
        setStreaming: vi.fn(),
        appendStreamChunk: vi.fn(),
        setThinkingContent: vi.fn(),
        resetStreaming: vi.fn(),
        setInputText: vi.fn(),
        setError: vi.fn(),
        sendMessage: vi.fn(),
        stopStreaming: vi.fn(),
        setCurrentSession: vi.fn().mockImplementation((session) => {
          mockChatStore.currentSession = session;
          mockChatStore.setMessages(session.messages || []);
        }),
        setMessages: vi.fn(),
      };
      
      mockUseChatStore.mockReturnValue(mockChatStore);
      
      render(<ChatInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(screen.getByText('Hi there!')).toBeInTheDocument();
      });
      
      // Simulate switching to another session
      const newSession = {
        id: 'session-2',
        title: 'JavaScript Fundamentals',
        messages: [
          { id: 'msg-3', role: 'user', content: 'Explain closures', timestamp: new Date() },
          { id: 'msg-4', role: 'assistant', content: 'Closures are...', timestamp: new Date() }
        ]
      };
      
      act(() => {
        mockChatStore.setCurrentSession(newSession);
      });
      
      // Verify session content changed
      await waitFor(() => {
        expect(screen.getByText('Explain closures')).toBeInTheDocument();
        expect(screen.getByText('Closures are...')).toBeInTheDocument();
      });
    });

    it('should preserve message history during session operations', async () => {
      const user = userEvent.setup();
      
      const mockMessages = [
        { id: 'msg-1', role: 'user', content: 'Initial question', timestamp: new Date() },
        { id: 'msg-2', role: 'assistant', content: 'Initial response', timestamp: new Date() }
      ];
      
      const mockChatStore = {
        messages: mockMessages,
        isStreaming: false,
        streamingContent: '',
        thinkingContent: '',
        inputText: '',
        error: null,
        currentSession: { id: 'session-1', title: 'Test Session', messages: mockMessages },
        addMessage: vi.fn().mockImplementation((message) => {
          mockMessages.push(message);
          mockChatStore.setMessages([...mockMessages]);
        }),
        updateMessage: vi.fn(),
        setLoading: vi.fn(),
        setStreaming: vi.fn(),
        appendStreamChunk: vi.fn(),
        setThinkingContent: vi.fn(),
        resetStreaming: vi.fn(),
        setInputText: vi.fn(),
        setError: vi.fn(),
        sendMessage: vi.fn().mockImplementation(async (content) => {
          const newMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: `Response to: ${content}`,
            timestamp: new Date()
          };
          mockChatStore.addMessage(newMessage);
        }),
        stopStreaming: vi.fn(),
        setCurrentSession: vi.fn(),
        setMessages: vi.fn(),
      };
      
      mockUseChatStore.mockReturnValue(mockChatStore);
      
      render(<ChatInterface />);
      
      // Verify initial messages are displayed
      await waitFor(() => {
        expect(screen.getByText('Initial question')).toBeInTheDocument();
        expect(screen.getByText('Initial response')).toBeInTheDocument();
      });
      
      // Send a new message
      await user.type(screen.getByRole('textbox'), 'Follow-up question');
      await user.click(screen.getByText('Send'));
      
      // Verify message history is maintained
      await waitFor(() => {
        expect(screen.getByText('Follow-up question')).toBeInTheDocument();
        expect(screen.getByText('Response to: Follow-up question')).toBeInTheDocument();
      });
      
      // All messages should be present
      expect(screen.getAllByRole('article')).toHaveLength(4); // 2 original + 1 user + 1 assistant
    });
  });

  describe('Realistic Learning Scenarios', () => {
    it('should support iterative learning conversations', async () => {
      const user = userEvent.setup();
      
      const conversationFlow = [
        {
          role: 'user',
          content: 'Explain React hooks to me'
        },
        {
          role: 'assistant',
          content: 'React hooks allow functional components to use state and lifecycle features.',
          thinking_content: 'Need to explain useState first, then useEffect'
        },
        {
          role: 'user',
          content: 'Can you show me a useState example?'
        },
        {
          role: 'assistant',
          content: 'Here\'s a useState example: const [count, setCount] = useState(0);',
          thinking_content: 'User wants practical example, showing basic useState usage'
        }
      ];
      
      let messageIndex = 0;
      const mockChatStore = {
        messages: [],
        isStreaming: false,
        streamingContent: '',
        thinkingContent: '',
        inputText: '',
        error: null,
        currentSession: { id: 'session-1', title: 'React Hooks Learning' },
        addMessage: vi.fn().mockImplementation((message) => {
          mockChatStore.messages.push(message);
        }),
        updateMessage: vi.fn(),
        setLoading: vi.fn(),
        setStreaming: vi.fn(),
        appendStreamChunk: vi.fn(),
        setThinkingContent: vi.fn(),
        resetStreaming: vi.fn(),
        setInputText: vi.fn(),
        setError: vi.fn(),
        sendMessage: vi.fn().mockImplementation(async (content) => {
          // Simulate AI response
          const response = conversationFlow[messageIndex + 1];
          if (response) {
            messageIndex++;
            mockChatStore.addMessage({
              id: `msg-${Date.now()}`,
              role: response.role,
              content: response.content,
              thinking_content: response.thinking_content,
              timestamp: new Date()
            });
          }
        }),
        stopStreaming: vi.fn(),
        setCurrentSession: vi.fn(),
        setMessages: vi.fn(),
      };
      
      mockUseChatStore.mockReturnValue(mockChatStore);
      
      render(<ChatInterface />);
      
      // First question
      await user.type(screen.getByRole('textbox'), 'Explain React hooks to me');
      await user.click(screen.getByText('Send'));
      
      // Verify response
      await waitFor(() => {
        expect(screen.getByText(/React hooks allow/)).toBeInTheDocument();
      });
      
      // Follow-up question
      await user.type(screen.getByRole('textbox'), 'Can you show me a useState example?');
      await user.click(screen.getByText('Send'));
      
      // Verify follow-up response
      await waitFor(() => {
        expect(screen.getByText(/const \[count, setCount\]/)).toBeInTheDocument();
      });
      
      // Verify conversation flow maintained
      expect(screen.getAllByRole('article')).toHaveLength(4); // 2 Q&A pairs
    });

    it('should handle clarification requests during learning', async () => {
      const user = userEvent.setup();
      
      const mockChatStore = {
        messages: [],
        isStreaming: false,
        streamingContent: '',
        thinkingContent: '',
        inputText: '',
        error: null,
        currentSession: { id: 'session-1', title: 'Clarification Session' },
        addMessage: vi.fn(),
        updateMessage: vi.fn(),
        setLoading: vi.fn(),
        setStreaming: vi.fn(),
        appendStreamChunk: vi.fn(),
        setThinkingContent: vi.fn(),
        resetStreaming: vi.fn(),
        setInputText: vi.fn(),
        setError: vi.fn(),
        sendMessage: vi.fn().mockImplementation(async (content) => {
          // Mock different responses based on content
          let response = '';
          if (content.toLowerCase().includes('clarify')) {
            response = 'Let me clarify that concept further...';
          } else if (content.toLowerCase().includes('example')) {
            response = 'Here\'s a practical example...';
          } else {
            response = 'I understand you want to learn more about this topic.';
          }
          
          mockChatStore.addMessage({
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: response,
            timestamp: new Date()
          });
        }),
        stopStreaming: vi.fn(),
        setCurrentSession: vi.fn(),
        setMessages: vi.fn(),
      };
      
      mockUseChatStore.mockReturnValue(mockChatStore);
      
      render(<ChatInterface />);
      
      // Initial question
      await user.type(screen.getByRole('textbox'), 'Tell me about React state management');
      await user.click(screen.getByText('Send'));
      
      await waitFor(() => {
        expect(screen.getByText(/learn more about/)).toBeInTheDocument();
      });
      
      // Request clarification
      await user.type(screen.getByRole('textbox'), 'Can you clarify the difference between useState and useReducer?');
      await user.click(screen.getByText('Send'));
      
      await waitFor(() => {
        expect(screen.getByText(/Let me clarify/)).toBeInTheDocument();
      });
      
      // Request example
      await user.type(screen.getByRole('textbox'), 'Show me an example with useReducer');
      await user.click(screen.getByText('Send'));
      
      await waitFor(() => {
        expect(screen.getByText(/Here's a practical example/)).toBeInTheDocument();
      });
      
      // Verify learning conversation maintained properly
      expect(mockChatStore.messages).toHaveLength(6); // 3 user, 3 assistant
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});