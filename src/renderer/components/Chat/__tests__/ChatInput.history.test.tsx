import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { ChatInput } from '@/renderer/components/Chat/ChatInput';
import { renderWithServices } from '@/test/utils/renderWithServices';
import type { AppConfig } from '@/shared/types/config';

vi.mock('@/renderer/hooks/useChatStore', () => ({
  useChatStore: vi.fn(),
}));

vi.mock('@/renderer/stores/useConfigStore', () => ({
  useConfigStore: vi.fn(),
}));

import { useChatStore } from '@/renderer/hooks/useChatStore';
import { useConfigStore } from '@/renderer/stores/useConfigStore';

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

const createChatMock = (overrides: Partial<Record<string, unknown>> = {}) => ({
  isLoading: false,
  isStreaming: false,
  error: null,
  sendMessage: vi.fn().mockResolvedValue(undefined),
  sendMessageStream: vi.fn().mockResolvedValue(undefined),
  stopStreaming: vi.fn().mockResolvedValue(undefined),
  setError: vi.fn(),
  history: [],
  currentSessionId: null,
  ...overrides,
});

const mockUseChatStore = vi.mocked(useChatStore);
const mockUseConfigStore = vi.mocked(useConfigStore);

describe('ChatInput history UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cycles history with arrow keys and restores draft', () => {
    const chatMock = createChatMock({
      history: [
        { id: 'h-older', text: 'older prompt', sessionId: 's1', createdAt: 1 },
        { id: 'h-newer', text: 'newer prompt', sessionId: 's1', createdAt: 2 },
      ],
      currentSessionId: 's1',
    });
    mockUseChatStore.mockImplementation((selector?: any) => (selector ? selector(chatMock) : chatMock));
    mockUseConfigStore.mockReturnValue(createConfigStoreMock());

    renderWithServices(<ChatInput />);
    const textarea = screen.getByPlaceholderText('Type your message here...') as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: 'my draft' } });
    fireEvent.keyDown(textarea, { key: 'ArrowUp' });
    expect(textarea.value).toBe('newer prompt');
    expect(screen.getByText(/History mode/i)).toBeInTheDocument();

    fireEvent.keyDown(textarea, { key: 'ArrowUp' });
    expect(textarea.value).toBe('older prompt');

    fireEvent.keyDown(textarea, { key: 'ArrowDown' });
    expect(textarea.value).toBe('newer prompt');

    fireEvent.keyDown(textarea, { key: 'ArrowDown' });
    expect(textarea.value).toBe('my draft');
    expect(screen.queryByText(/History mode/i)).not.toBeInTheDocument();
  });

  it('submits and resets history mode state', async () => {
    const chatMock = createChatMock({
      history: [{ id: 'h1', text: 'reuse me', sessionId: 's1', createdAt: 1 }],
      currentSessionId: 's1',
    });
    mockUseChatStore.mockImplementation((selector?: any) => (selector ? selector(chatMock) : chatMock));
    mockUseConfigStore.mockReturnValue(createConfigStoreMock());

    renderWithServices(<ChatInput />);
    const textarea = screen.getByPlaceholderText('Type your message here...');

    fireEvent.keyDown(textarea, { key: 'ArrowUp' });
    expect(screen.getByText(/History mode/i)).toBeInTheDocument();

    const form = screen.getByTestId('chat-input-form');
    fireEvent.submit(form);

    await waitFor(() => expect(chatMock.sendMessageStream).toHaveBeenCalled());
    expect(screen.queryByText(/History mode/i)).not.toBeInTheDocument();
  });

  it('opens search palette with Ctrl+K and inserts selection', async () => {
    const chatMock = createChatMock({
      history: [
        { id: 'h1', text: 'alpha prompt', sessionId: 's1', createdAt: 1 },
        { id: 'h2', text: 'beta idea', sessionId: 's1', createdAt: 2 },
      ],
      currentSessionId: 's1',
    });
    mockUseChatStore.mockImplementation((selector?: any) => (selector ? selector(chatMock) : chatMock));
    mockUseConfigStore.mockReturnValue(createConfigStoreMock());

    renderWithServices(<ChatInput />);
    const textarea = screen.getByPlaceholderText('Type your message here...');

    fireEvent.keyDown(textarea, { key: 'k', ctrlKey: true });
    const searchBox = await screen.findByPlaceholderText(/Search history/i);
    fireEvent.change(searchBox, { target: { value: 'beta' } });

    const betaButton = await screen.findByText('beta idea');
    fireEvent.click(betaButton);

    await waitFor(() => expect(screen.queryByPlaceholderText(/Search history/i)).not.toBeInTheDocument());
    expect((textarea as HTMLTextAreaElement).value).toBe('beta idea');
  });

  it('closes search with Escape without altering input', async () => {
    const chatMock = createChatMock({
      history: [{ id: 'h1', text: 'alpha prompt', sessionId: 's1', createdAt: 1 }],
      currentSessionId: 's1',
    });
    mockUseChatStore.mockImplementation((selector?: any) => (selector ? selector(chatMock) : chatMock));
    mockUseConfigStore.mockReturnValue(createConfigStoreMock());

    renderWithServices(<ChatInput />);
    const textarea = screen.getByPlaceholderText('Type your message here...') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'stay the same' } });

    fireEvent.keyDown(textarea, { key: 'k', ctrlKey: true });
    const searchBox = await screen.findByPlaceholderText(/Search history/i);
    fireEvent.keyDown(searchBox, { key: 'Escape' });

    expect(screen.queryByPlaceholderText(/Search history/i)).not.toBeInTheDocument();
    expect(textarea.value).toBe('stay the same');
  });
});
