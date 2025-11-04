import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInput } from '@/renderer/components/Chat/ChatInput';
import { useChatStore } from '@/renderer/hooks/useChatStore';
import { useConfigStore } from '@/renderer/stores/useConfigStore';

// Mock the stores
jest.mock('@/renderer/hooks/useChatStore');
jest.mock('@/renderer/stores/useConfigStore');

// Mock Electron API
const mockReadFile = jest.fn();
const mockShowOpenDialog = jest.fn();

Object.defineProperty(window, 'electronAPI', {
  value: {
    showOpenDialog: mockShowOpenDialog,
    readFile: mockReadFile,
  },
  writable: true,
});

const mockUseChatStore = useChatStore as jest.MockedFunction<typeof useChatStore>;
const mockUseConfigStore = useConfigStore as jest.MockedFunction<typeof useConfigStore>;

describe('ChatInput', () => {
  const mockSendMessage = jest.fn();
  const mockStopStreaming = jest.fn();
  const mockSetInputText = jest.fn();

  beforeEach(() => {
    mockSendMessage.mockResolvedValue(undefined);
    mockUseChatStore.mockReturnValue({
      inputText: '',
      setInputText: mockSetInputText,
      isStreaming: false,
      isLoading: false,
      sendMessage: mockSendMessage,
      stopStreaming: mockStopStreaming,
      selectedProvider: 'openai',
      selectedModel: 'gpt-3.5-turbo',
      currentSession: null,
      messages: [],
      thinkingContent: '',
      streamingContent: '',
      error: null,
      showThinking: true,
      autoScroll: true,
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
      setError: jest.fn(),
      setShowThinking: jest.fn(),
      setAutoScroll: jest.fn(),
      setSelectedProvider: jest.fn(),
      setSelectedModel: jest.fn(),
      retryLastMessage: jest.fn(),
    });

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
      loadConfig: jest.fn(),
      saveConfig: jest.fn(),
      resetConfig: jest.fn(),
    });

    mockShowOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['/path/to/test.txt'],
    });
    mockReadFile.mockResolvedValue('File content here');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders input form with all elements', () => {
      render(<ChatInput />);

      expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Attach file' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start voice input' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
    });

    it('displays provider and model information', () => {
      render(<ChatInput />);

      expect(screen.getByText(/Provider:/)).toBeInTheDocument();
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText(/Model:/)).toBeInTheDocument();
      expect(screen.getByText('gpt-3.5-turbo')).toBeInTheDocument();
    });

    it('shows thinking indicator when enabled', () => {
      render(<ChatInput />);

      expect(screen.getByText('🧠')).toBeInTheDocument();
      expect(screen.getByText('Thinking enabled')).toBeInTheDocument();
    });

    it('displays input tips', () => {
      render(<ChatInput />);

      expect(screen.getByText('Press Enter to send, Shift+Enter for new line')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+K for command palette')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+/ for keyboard shortcuts')).toBeInTheDocument();
    });
  });

  describe('Input Handling', () => {
    it('updates input text when typing', () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'Hello',
      });

      render(<ChatInput />);

      const textarea = screen.getByPlaceholderText('Type your message here...') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Hello');

      fireEvent.change(textarea, { target: { value: 'Hello world' } });
      expect(mockSetInputText).toHaveBeenCalledWith('Hello world');
    });

    it('auto-resizes textarea', () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5',
      });

      render(<ChatInput />);

      const textarea = screen.getByPlaceholderText('Type your message here...') as HTMLTextAreaElement;
      expect(textarea.style.height).toBeDefined();
    });

    it('shows character count for long messages', () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'a'.repeat(150),
      });

      render(<ChatInput />);

      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('does not show character count for short messages', () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'Short message',
      });

      render(<ChatInput />);

      expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('sends message when form is submitted', async () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'Hello AI',
      });

      render(<ChatInput />);

      const form = screen.getByRole('form');
      fireEvent.submit(form);

      expect(mockSetInputText).toHaveBeenCalledWith('');
      expect(mockSendMessage).toHaveBeenCalledWith('Hello AI', {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
        enable_thinking: true,
      });
    });

    it('sends message when send button is clicked', async () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'Hello AI',
      });

      render(<ChatInput />);

      const sendButton = screen.getByRole('button', { name: 'Send' });
      fireEvent.click(sendButton);

      expect(mockSetInputText).toHaveBeenCalledWith('');
      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('sends message when Enter is pressed', async () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'Hello AI',
      });

      render(<ChatInput />);

      const textarea = screen.getByPlaceholderText('Type your message here...');
      fireEvent.keyDown(textarea, { key: 'Enter' });

      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('creates new line when Shift+Enter is pressed', () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'Hello',
      });

      render(<ChatInput />);

      const textarea = screen.getByPlaceholderText('Type your message here...');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('does not send empty messages', () => {
      render(<ChatInput />);

      const form = screen.getByRole('form');
      fireEvent.submit(form);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('does not send when streaming', () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'Hello',
        isStreaming: true,
      });

      render(<ChatInput />);

      const form = screen.getByRole('form');
      fireEvent.submit(form);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('does not send when loading', () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'Hello',
        isLoading: true,
      });

      render(<ChatInput />);

      const form = screen.getByRole('form');
      fireEvent.submit(form);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('restores input text on send error', async () => {
      const errorMessage = 'Send failed';
      mockSendMessage.mockRejectedValueOnce(new Error(errorMessage));

      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'Hello AI',
      });

      render(<ChatInput />);

      const form = screen.getByRole('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockSetInputText).toHaveBeenCalledWith('Hello AI'); // Restore on error
      });
    });
  });

  describe('Streaming State', () => {
    it('shows stop button when streaming', () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        isStreaming: true,
      });

      render(<ChatInput />);

      expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
    });

    it('calls stopStreaming when stop button is clicked', () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        isStreaming: true,
      });

      render(<ChatInput />);

      const stopButton = screen.getByRole('button', { name: 'Stop' });
      fireEvent.click(stopButton);

      expect(mockStopStreaming).toHaveBeenCalled();
    });

    it('disables input when streaming', () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        isStreaming: true,
      });

      render(<ChatInput />);

      const textarea = screen.getByPlaceholderText('Type your message here...') as HTMLTextAreaElement;
      expect(textarea.disabled).toBe(true);
    });

    it('shows appropriate placeholder when streaming', () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        isStreaming: true,
      });

      render(<ChatInput />);

      expect(screen.getByPlaceholderText('AI is responding...')).toBeInTheDocument();
    });
  });

  describe('File Attachment', () => {
    it('attaches file when file button is clicked', async () => {
      render(<ChatInput />);

      const fileButton = screen.getByRole('button', { name: 'Attach file' });
      fireEvent.click(fileButton);

      await waitFor(() => {
        expect(mockShowOpenDialog).toHaveBeenCalledWith({
          properties: ['openFile'],
          filters: [
            { name: 'Text Files', extensions: ['txt', 'md', 'js', 'ts', 'py', 'java', 'cpp', 'c'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
      });

      await waitFor(() => {
        expect(mockReadFile).toHaveBeenCalledWith('/path/to/test.txt');
      });

      expect(mockSetInputText).toHaveBeenCalledWith(
        expect.stringContaining('📎 Attached file: test.txt')
      );
      expect(mockSetInputText).toHaveBeenCalledWith(
        expect.stringContaining('File content here')
      );
    });

    it('does not attach file when dialog is cancelled', async () => {
      mockShowOpenDialog.mockResolvedValue({
        canceled: true,
        filePaths: [],
      });

      render(<ChatInput />);

      const fileButton = screen.getByRole('button', { name: 'Attach file' });
      fireEvent.click(fileButton);

      await waitFor(() => {
        expect(mockReadFile).not.toHaveBeenCalled();
      });
    });

    it('handles file read errors gracefully', async () => {
      mockReadFile.mockRejectedValue(new Error('File read error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<ChatInput />);

      const fileButton = screen.getByRole('button', { name: 'Attach file' });
      fireEvent.click(fileButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to read file:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Voice Recording', () => {
    it('toggles recording state when voice button is clicked', () => {
      render(<ChatInput />);

      const voiceButton = screen.getByRole('button', { name: 'Start voice input' });
      fireEvent.click(voiceButton);

      // Since the actual recording logic is not implemented,
      // we just check that the button click doesn't throw errors
      expect(voiceButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper button titles', () => {
      render(<ChatInput />);

      expect(screen.getByTitle('Attach file')).toBeInTheDocument();
      expect(screen.getByTitle('Start voice input')).toBeInTheDocument();
    });

    it('disables send button when input is empty', () => {
      render(<ChatInput />);

      const sendButton = screen.getByRole('button', { name: 'Send' });
      expect(sendButton).toBeDisabled();
    });

    it('enables send button when input has text', () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'Hello',
      });

      render(<ChatInput />);

      const sendButton = screen.getByRole('button', { name: 'Send' });
      expect(sendButton).not.toBeDisabled();
    });

    it('disables send button when loading', () => {
      mockUseChatStore.mockReturnValue({
        ...mockUseChatStore(),
        inputText: 'Hello',
        isLoading: true,
      });

      render(<ChatInput />);

      const sendButton = screen.getByRole('button', { name: 'Send' });
      expect(sendButton).toBeDisabled();
    });
  });
});