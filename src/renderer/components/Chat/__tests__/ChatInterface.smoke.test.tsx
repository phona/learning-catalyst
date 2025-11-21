
import { describe, it, beforeEach, vi, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMockConfigurationService, createMockFileService } from '@/test/utils/services-provider-stubs';
import { ChatInterface } from '../ChatInterface';
import { useSessionInit } from '@/renderer/hooks/useSessionInit';

// Mock useSessionInit hook
vi.mock('@/renderer/hooks/useSessionInit', () => ({
  useSessionInit: vi.fn(() => ({
    loading: false,
    error: null,
    session: null,
    sessionId: undefined,
  })),
}));

const configServiceMock = createMockConfigurationService();
const fileServiceMock = createMockFileService();

// Mock services provider
vi.mock('@/renderer/services/services-provider', () => ({
  useChatService: () => ({
    sendMessage: vi.fn(),
    sendMessageStream: vi.fn(),
    getAvailableAgents: vi.fn(),
  }),
  useSessionService: () => ({
    createNewSession: vi.fn().mockResolvedValue('test-session-id'),
  }),
  useAnalyticsService: () => ({
    trackEvent: vi.fn(),
  }),
  useElectronAPIClient: () => ({
    sessions: {
      get: vi.fn().mockResolvedValue({ success: true, data: null }),
      update: vi.fn().mockResolvedValue({ success: true }),
      list: vi.fn().mockResolvedValue({ success: true, data: [] }),
    },
    chat: {
      startConversation: vi.fn(),
      sendMessage: vi.fn(),
      sendMessageStream: vi.fn(),
      getConversationHistory: vi.fn(),
    },
    onIPCError: vi.fn(() => () => undefined),
  }),
  useConfigurationService: vi.fn(() => configServiceMock),
  useFileService: vi.fn(() => fileServiceMock),
}));

describe('ChatInterface smoke coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows skeletons when session is loading', () => {
    vi.mocked(useSessionInit).mockReturnValue({
      loading: true,
      session: null,
      sessionId: undefined
    });

    render(<ChatInterface />);

    // Should render loading state with skeletons
    expect(screen.getByTestId('chat-skeleton-list')).toBeInTheDocument();
  });

  it('shows chat interface when session is not loading', () => {
    vi.mocked(useSessionInit).mockReturnValue({
      loading: false,
      session: null,
      sessionId: undefined
    });

    render(<ChatInterface />);

    // Should render chat interface (not loading)
    expect(screen.getByTestId('chat-area')).toBeInTheDocument();
  });

  it('renders chat interface when session is loaded', () => {
    vi.mocked(useSessionInit).mockReturnValue({
      loading: false,
      session: {
        id: 'test-session',
        title: 'Test Session',
        created_at: new Date(),
      },
      sessionId: 'test-session'
    });

    render(<ChatInterface />);

    // Should render chat interface
    expect(screen.getByTestId('chat-area')).toBeInTheDocument();
  });
});
