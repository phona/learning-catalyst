import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInput } from '@/renderer/components/Chat/ChatInput';
import { renderWithServices } from '@/test/utils/renderWithServices';

vi.mock('@/renderer/hooks/useChat');
vi.mock('@/renderer/stores/useConfigStore');

import { useChat, UseChatResult } from '@/renderer/hooks/useChat';
import { useConfigStore } from '@/renderer/stores/useConfigStore';
import type { AppConfig } from '@/shared/types/config';

const mockShowOpenDialog = vi.fn();
const mockReadFile = vi.fn();
const mockFileService = {
  showOpenDialog: mockShowOpenDialog,
  readFile: mockReadFile,
  writeFile: vi.fn().mockResolvedValue({ success: true }),
  existsFile: vi.fn().mockResolvedValue({ success: true, data: true }),
  showSaveDialog: vi
    .fn()
    .mockResolvedValue({ success: true, data: { canceled: true, filePath: '' } }),
  readDirectory: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getWorkspacePath: vi.fn().mockResolvedValue({ success: true, data: '/mock/workspace' }),
};

vi.mock('@/renderer/services/services-provider', async () => {
  const actual = await vi.importActual('@/renderer/services/services-provider');
  return {
    ...actual,
    useFileService: vi.fn(() => mockFileService),
  };
});

const baseConfig: AppConfig = {
  ai: {
    providers: {},
    modelTypes: {
      chat: {
        defaultProvider: 'openai',
        defaultModel: 'gpt-3.5-turbo',
        capabilities: {
          streaming: true,
          thinking: false,
          functionCalling: true,
          vision: false,
        },
      },
    },
  },
  ui: {
    theme: 'light',
    showTokenUsage: false,
    displayFormat: 'detailed',
    sessionDuration: 25,
    fontSize: 'medium',
    sidebarWidth: 300,
    autoSave: true,
    autoScroll: true,
    showLineNumbers: false,
    enableMarkdown: true,
    enableSyntaxHighlighting: true,
    compactMode: false,
  },
  learning: {
    autoSave: true,
    sessionTimeoutMinutes: 60,
    difficulty: 'intermediate',
    learningStyle: 'visual',
    personalizationEnabled: true,
    checkpointInterval: 15,
    maxSessionHistory: 100,
    enableAnalytics: false,
    preferredExplanationLength: 'detailed',
  },
  privacy: {
    storeConversations: true,
    retentionDays: 90,
    anonymousAnalytics: false,
    crashReporting: true,
    encryptLocalStorage: false,
    autoCleanup: true,
    exportFormat: 'json',
  },
  performance: {
    cacheSizeMb: 100,
    enableCaching: true,
    maxConcurrentRequests: 5,
    requestTimeout: 30,
    memoryLimitMb: 512,
    gpuAcceleration: false,
    backgroundProcessing: true,
    preloadModels: false,
  },
};

const createChatMock = (): UseChatResult => ({
  messages: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  currentSession: null,
  sendMessage: vi.fn().mockResolvedValue(undefined),
  sendMessageStream: vi.fn().mockResolvedValue(undefined),
  stopStreaming: vi.fn().mockResolvedValue(undefined),
  clearMessages: vi.fn(),
  setError: vi.fn(),
  createSession: vi.fn().mockResolvedValue(null),
  loadSession: vi.fn(),
  updateSessionTitle: vi.fn(),
  getAvailableAgents: vi.fn().mockResolvedValue([]),
  setSelectedAgent: vi.fn(),
  selectedAgent: null,
});

type ConfigStoreState = {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
  loadConfig: () => Promise<AppConfig | null>;
  setConfig: (config: AppConfig) => void;
  saveConfig: (config: AppConfig) => Promise<void>;
  updateConfig: (updates: Partial<AppConfig>) => Promise<void>;
  resetConfig: () => Promise<AppConfig>;
  getProviderConfig: (providerName: string) => unknown;
  setProviderConfig: (providerName: string, config: unknown) => Promise<void>;
  removeProviderConfig: (providerName: string) => Promise<void>;
  setDefaultProvider: (providerName: string, modelName: string) => Promise<void>;
};

const createConfigStoreMock = (): ConfigStoreState => ({
  config: baseConfig,
  loading: false,
  error: null,
  loadConfig: vi.fn(),
  setConfig: vi.fn(),
  saveConfig: vi.fn().mockResolvedValue(undefined),
  updateConfig: vi.fn().mockResolvedValue(undefined),
  resetConfig: vi.fn().mockResolvedValue(baseConfig),
  getProviderConfig: vi.fn(),
  setProviderConfig: vi.fn().mockResolvedValue(undefined),
  removeProviderConfig: vi.fn().mockResolvedValue(undefined),
  setDefaultProvider: vi.fn().mockResolvedValue(undefined),
});

const mockUseChat = vi.mocked(useChat);
const mockUseConfigStore = vi.mocked(useConfigStore);

describe('ChatInput', () => {
  let chatMock: UseChatResult;

  beforeEach(() => {
    vi.clearAllMocks();
    chatMock = createChatMock();
    mockUseChat.mockReturnValue(chatMock);
    mockUseConfigStore.mockReturnValue(createConfigStoreMock());

    mockShowOpenDialog.mockResolvedValue({
      success: true,
      data: {
        canceled: true,
        filePaths: [],
      },
    });
    mockReadFile.mockResolvedValue({
      success: true,
      data: {
        content: 'file content',
        fileName: 'mock.txt',
      },
    });
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
      success: true,
      data: {
        canceled: false,
        filePaths: ['/tmp/example.txt'],
      },
    });
    mockReadFile.mockResolvedValue({
      success: true,
      data: {
        content: 'Example file',
        fileName: 'example.txt',
      },
    });

    renderWithServices(<ChatInput />);

    fireEvent.click(screen.getByRole('button', { name: /advanced options/i }));
    const attachButton = screen.getByRole('button', { name: /attach file/i });
    fireEvent.click(attachButton);

    await waitFor(() => {
      expect(mockReadFile).toHaveBeenCalledWith('/tmp/example.txt');
    });

    const textarea = screen.getByPlaceholderText(
      'Type your message here...',
    ) as HTMLTextAreaElement;
    expect(textarea.value).toContain('Example file');
  });

  it('toggles deep thinking mode via updateConfig when advanced panel open', () => {
    const updateConfigMock = vi.fn().mockResolvedValue(undefined);
    mockUseConfigStore.mockReturnValue({
      ...createConfigStoreMock(),
      updateConfig: updateConfigMock,
    });

    renderWithServices(<ChatInput />);

    fireEvent.click(screen.getByRole('button', { name: /advanced options/i }));

    const deepThinkingButton = screen.getByRole('button', { name: /deep thinking/i });
    fireEvent.click(deepThinkingButton);

    expect(updateConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ai: expect.objectContaining({
          modelTypes: expect.objectContaining({
            chat: expect.objectContaining({
              capabilities: expect.objectContaining({
                thinking: true,
              }),
            }),
          }),
        }),
      }),
    );
  });
});
