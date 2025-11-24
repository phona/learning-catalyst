import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DiscoveryPage } from './DiscoveryPage';
import { ServicesProvider } from './services/services-provider';

const makeDirectoryItem = (overrides: Partial<any> = {}) => ({
  name: 'readme.md',
  path: '/workspace/readme.md',
  isDirectory: false,
  isFile: true,
  isMarkdown: true,
  size: 1024,
  extension: '.md',
  modifiedTime: new Date('2024-01-01'),
  createdTime: new Date('2024-01-01'),
  accessedTime: new Date('2024-01-01'),
  children: [],
  depth: 0,
  ...overrides,
});

describe('DiscoveryPage end-to-end (no Electron)', () => {
  const queryClient = new QueryClient();

  const makeServices = () => {
    const fileService = {
      getWorkspacePath: vi.fn().mockResolvedValue({ success: true, data: '/workspace' }),
      readDirectory: vi.fn().mockResolvedValue({
        success: true,
        data: [makeDirectoryItem()],
      }),
    } as any;

    const parsingJob = {
      id: 'job-1',
      materialId: 'mat',
      status: 'completed' as const,
      progress: 1,
      stages: [],
      result: {
        concepts: [],
        relationships: [],
        statistics: {
          totalConcepts: 0,
          validConcepts: 0,
          totalRelationships: 0,
          confidenceDistribution: {},
          difficultyDistribution: {},
          typeDistribution: {},
          processingTime: 10,
          modelUsage: {},
        },
        learningPath: {} as any,
        assessments: [],
        errors: [],
      },
    };

    const conceptParsing = {
      parseFiles: vi.fn().mockResolvedValue(parsingJob),
      getJobStatus: vi.fn().mockReturnValue(parsingJob),
      cancelJob: vi.fn(),
    } as any;

    const chatService = {
      getProviderInfo: vi.fn().mockReturnValue({ name: 'MockProvider', type: 'llm' }),
    } as any;

    const stub = {
      sessionService: {} as any,
      chatService,
      analyticsService: {} as any,
      discoveryService: {} as any,
      catalystService: {} as any,
      configService: {} as any,
      fileService,
      conceptParsing,
      agentService: {} as any,
    };

    return { stub, parsingJob };
  };

  beforeEach(() => {
    vi.useFakeTimers();
    // Prevent accidental dialogs during tests
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockImplementation(() => false);
    (process.env as any).HOME = '/workspace';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('loads workspace, selects markdown, and shows parsing results flow', async () => {
    const { stub } = makeServices();

    render(
      <QueryClientProvider client={queryClient}>
        <ServicesProvider apiClient={{} as any} overrides={stub}>
          <DiscoveryPage />
        </ServicesProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText('/workspace')).toBeInTheDocument());
    const fileRow = screen.getByText('readme.md');
    fireEvent.click(fileRow);

    await waitFor(() =>
      expect(screen.getByText(/Parse Concepts/i)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText(/Parse Concepts/i));
    vi.runOnlyPendingTimers();

    await waitFor(() =>
      expect(screen.getByText(/Parsing Completed Successfully/i)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText(/View Results/i));

    await waitFor(() =>
      expect(screen.getAllByText(/Concept Parsing Results/i)[0]).toBeInTheDocument(),
    );
  });
});
