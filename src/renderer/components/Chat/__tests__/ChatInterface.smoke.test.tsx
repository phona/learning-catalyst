/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */




import { describe, it, beforeEach, vi, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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