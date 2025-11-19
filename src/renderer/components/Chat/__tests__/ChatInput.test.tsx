import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInput } from '@/renderer/components/Chat/ChatInput';
import { renderWithServices } from '@/test/utils/renderWithServices';

vi.mock('@/renderer/hooks/useChat');
vi.mock('@/renderer/stores/useConfigStore');

import { useChat } from '@/renderer/hooks/useChat';
import { useConfigStore } from '@/renderer/stores/useConfigStore';

const mockShowOpenDialog = vi.fn();
const mockReadFile = vi.fn();

const setElectronAPI = () => {
  try {
    Object.defineProperty(window, 'electronAPI', {
      value: {
        showOpenDialog: mockShowOpenDialog,
        readFile: mockReadFile,
      },
      configurable: true,
      writable: true,
    });
  } catch {
    (window as typeof window & { electronAPI?: unknown }).electronAPI = {
      showOpenDialog: mockShowOpenDialog,
      readFile: mockReadFile,
    } as typeof window.electronAPI;
  }
};

setElectronAPI();

const baseConfig = {
  ai: {
    model_types: {
      chat: {
        default_provider: 'openai',
        default_model: 'gpt-3.5-turbo',
        capabilities: {
          streaming: true,
          thinking: false,
        },
      },
    },
  },
};

const createChatMock = () => ({
  isLoading: false,
  isStreaming: false,
  sendMessage: vi.fn().mockResolvedValue(undefined),
  sendMessageStream: vi.fn().mockResolvedValue(undefined),
  stopStreaming: vi.fn(),
  error: null,
  setError: vi.fn(),
  selectedAgent: null,
});

const mockUseChat = useChat as unknown as vi.MockedFunction<typeof useChat>;
const mockUseConfigStore = useConfigStore as unknown as vi.MockedFunction<typeof useConfigStore>;

describe('ChatInput', () => {
  let chatMock: ReturnType<typeof createChatMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    chatMock = createChatMock();
    mockUseChat.mockReturnValue(chatMock as any);
    mockUseConfigStore.mockReturnValue({
      config: baseConfig,
      updateConfig: vi.fn(),
    } as any);

    mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
    mockReadFile.mockResolvedValue('file content');
  });

  it('renders textarea and send button', () => {
    renderWithServices(<ChatInput />);

    expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
  });

  it('enables send button when text is present', () => {
    renderWithServices(<ChatInput />);
    const textarea = screen.getByPlaceholderText('Type your message here...');

    fireEvent.change(textarea, { target: { value: 'Hello world' } });

    expect(screen.getByRole('button', { name: /send message/i })).not.toBeDisabled();
  });

  it('submits via streaming API when capability is enabled', async () => {
    renderWithServices(<ChatInput />);

    const textarea = screen.getByPlaceholderText('Type your message here...');
    fireEvent.change(textarea, { target: { value: 'Stream test' } });

    const form = screen.getByTestId('chat-input-form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(chatMock.sendMessageStream).toHaveBeenCalled();
    });

    expect(chatMock.sendMessage).not.toHaveBeenCalled();
  });

  it('calls stopStreaming when actively streaming', () => {
    const streamingMock = {
      ...chatMock,
      isStreaming: true,
    };
    mockUseChat.mockReturnValue(streamingMock as any);

    renderWithServices(<ChatInput />);

    const stopButton = screen.getByRole('button', { name: /stop generating response/i });
    fireEvent.click(stopButton);

    expect(streamingMock.stopStreaming).toHaveBeenCalled();
  });

  it('attaches file content when user selects a file', async () => {
    mockShowOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['/tmp/example.txt'],
    });
    mockReadFile.mockResolvedValue('Example file');

    renderWithServices(<ChatInput />);

    fireEvent.click(screen.getByRole('button', { name: /advanced options/i }));
    const attachButton = screen.getByRole('button', { name: /attach file/i });
    fireEvent.click(attachButton);

    await waitFor(() => {
      expect(mockReadFile).toHaveBeenCalledWith('/tmp/example.txt');
    });

    const textarea = screen.getByPlaceholderText('Type your message here...') as HTMLTextAreaElement;
    expect(textarea.value).toContain('Example file');
  });

  it('toggles deep thinking mode via updateConfig when advanced panel open', () => {
    const updateConfigMock = vi.fn();
    mockUseConfigStore.mockReturnValue({
      config: baseConfig,
      updateConfig: updateConfigMock,
    } as any);

    renderWithServices(<ChatInput />);

    fireEvent.click(screen.getByRole('button', { name: /advanced options/i }));

    const deepThinkingButton = screen.getByRole('button', { name: /deep thinking/i });
    fireEvent.click(deepThinkingButton);

    expect(updateConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ai: expect.objectContaining({
          model_types: expect.objectContaining({
            chat: expect.objectContaining({
              capabilities: expect.objectContaining({
                thinking: true,
              }),
            }),
          }),
        }),
      })
    );
  });
});
