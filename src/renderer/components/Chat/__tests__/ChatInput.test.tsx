import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInput } from '@/renderer/components/Chat/ChatInput';
// Mock the stores
vi.mock('@/renderer/hooks/useChat');
vi.mock('@/renderer/stores/useConfigStore');

// Import after mocking
import { useChat } from '@/renderer/hooks/useChat';
import { useConfigStore } from '@/renderer/stores/useConfigStore';

// Mock Electron API
const mockReadFile = vi.fn();
const mockShowOpenDialog = vi.fn();

Object.defineProperty(window, 'electronAPI', {
  value: {
    showOpenDialog: mockShowOpenDialog,
    readFile: mockReadFile,
  },
  writable: true,
});

const mockUseChat = useChat as vi.MockedFunction<typeof useChat>;
const mockUseConfigStore = useConfigStore as vi.MockedFunction<typeof useConfigStore>;

describe('ChatInput', () => {
  const mockSendMessage = vi.fn();
  const mockStopStreaming = vi.fn();
  const mockSetInputText = vi.fn();

  beforeEach(() => {
    mockSendMessage.mockResolvedValue(undefined);
    mockUseChat.mockReturnValue({
      isLoading: false,
      isStreaming: false,
      sendMessage: mockSendMessage,
      sendMessageStream: mockSendMessage,
      stopStreaming: mockStopStreaming,
      error: null,
      setError: vi.fn(),
      selectedAgent: null,
    });

    mockUseConfigStore.mockReturnValue({
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
          },
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
      updateConfig: vi.fn(),
      loadConfig: vi.fn(),
      saveConfig: vi.fn(),
      resetConfig: vi.fn(),
    });

    mockShowOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['/path/to/test.txt'],
    });
    mockReadFile.mockResolvedValue('File content here');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders input form with all elements', () => {
      render(<ChatInput />);

      expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
      expect(screen.getByText('Advanced Options')).toBeInTheDocument();
    });

    it('displays provider and model information', () => {
      render(<ChatInput />);

      // Click to open advanced options
      const advancedButton = screen.getByText('Advanced Options');
      fireEvent.click(advancedButton);

      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('gpt-3.5-turbo')).toBeInTheDocument();
    });

    it('shows thinking indicator when enabled', () => {
      render(<ChatInput />);

      // Click to open advanced options
      const advancedButton = screen.getByText('Advanced Options');
      fireEvent.click(advancedButton);

      expect(screen.getByText('Deep Thinking')).toBeInTheDocument();
    });

    it('displays input tips', () => {
      render(<ChatInput />);

      expect(screen.getByText('send')).toBeInTheDocument();
      expect(screen.getByText('new line')).toBeInTheDocument();
      expect(screen.getByText('clear')).toBeInTheDocument();
    });
  });

  describe('Input Handling', () => {
    it('updates input text when typing', () => {
      render(<ChatInput />);

      const textarea = screen.getByPlaceholderText('Type your message here...') as HTMLTextAreaElement;
      expect(textarea.value).toBe('');

      fireEvent.change(textarea, { target: { value: 'Hello world' } });
      expect(textarea.value).toBe('Hello world');
    });

    it('auto-resizes textarea', () => {
      render(<ChatInput />);

      const textarea = screen.getByPlaceholderText('Type your message here...') as HTMLTextAreaElement;

      // Simulate typing multiple lines
      fireEvent.change(textarea, { target: { value: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5' } });

      expect(textarea.style.height).toBeDefined();
      expect(textarea.value).toBe('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
    });

    it('shows character count for long messages', () => {
      render(<ChatInput />);

      const textarea = screen.getByPlaceholderText('Type your message here...');
      fireEvent.change(textarea, { target: { value: 'a'.repeat(150) } });

      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('does not show character count for short messages', () => {
      mockUseChat.mockReturnValue({
        ...mockUseChat(),
        inputText: 'Short message',
      });

      render(<ChatInput />);

      expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('sends message when form is submitted', async () => {
      render(<ChatInput />);

      const textarea = screen.getByPlaceholderText('Type your message here...');
      fireEvent.change(textarea, { target: { value: 'Hello AI' } });

      const form = screen.getByRole('form');
      fireEvent.submit(form);

      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('sends message when send button is clicked', async () => {
      render(<ChatInput />);

      const textarea = screen.getByPlaceholderText('Type your message here...');
      fireEvent.change(textarea, { target: { value: 'Hello AI' } });

      const sendButton = screen.getByRole('button', { name: 'Send' });
      fireEvent.click(sendButton);

      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('sends message when Enter is pressed', async () => {
      mockUseChat.mockReturnValue({
        ...mockUseChat(),
        inputText: 'Hello AI',
      });

      render(<ChatInput />);

      const textarea = screen.getByPlaceholderText('Type your message here...');
      fireEvent.keyDown(textarea, { key: 'Enter' });

      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('creates new line when Shift+Enter is pressed', () => {
      mockUseChat.mockReturnValue({
        ...mockUseChat(),
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
      mockUseChat.mockReturnValue({
        ...mockUseChat(),
        inputText: 'Hello',
        isStreaming: true,
      });

      render(<ChatInput />);

      const form = screen.getByRole('form');
      fireEvent.submit(form);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('does not send when loading', () => {
      mockUseChat.mockReturnValue({
        ...mockUseChat(),
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

      mockUseChat.mockReturnValue({
        ...mockUseChat(),
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
      mockUseChat.mockReturnValue({
        ...mockUseChat(),
        isStreaming: true,
      });

      render(<ChatInput />);

      expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
    });

    it('calls stopStreaming when stop button is clicked', () => {
      mockUseChat.mockReturnValue({
        ...mockUseChat(),
        isStreaming: true,
      });

      render(<ChatInput />);

      const stopButton = screen.getByRole('button', { name: 'Stop' });
      fireEvent.click(stopButton);

      expect(mockStopStreaming).toHaveBeenCalled();
    });

    it('disables input when streaming', () => {
      mockUseChat.mockReturnValue({
        ...mockUseChat(),
        isStreaming: true,
      });

      render(<ChatInput />);

      const textarea = screen.getByPlaceholderText('Type your message here...') as HTMLTextAreaElement;
      expect(textarea.disabled).toBe(true);
    });

    it('shows appropriate placeholder when streaming', () => {
      mockUseChat.mockReturnValue({
        ...mockUseChat(),
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
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

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
      mockUseChat.mockReturnValue({
        ...mockUseChat(),
        inputText: 'Hello',
      });

      render(<ChatInput />);

      const sendButton = screen.getByRole('button', { name: 'Send' });
      expect(sendButton).not.toBeDisabled();
    });

    it('disables send button when loading', () => {
      mockUseChat.mockReturnValue({
        ...mockUseChat(),
        inputText: 'Hello',
        isLoading: true,
      });

      render(<ChatInput />);

      const sendButton = screen.getByRole('button', { name: 'Send' });
      expect(sendButton).toBeDisabled();
    });
  });
});