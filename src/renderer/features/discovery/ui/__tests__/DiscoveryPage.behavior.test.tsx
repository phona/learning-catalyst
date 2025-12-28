import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithServices } from '@/test/utils/renderWithServices';
import { DiscoveryPage } from '@/renderer/pages/discovery/DiscoveryPage';

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
      getLastJobId: vi.fn().mockReturnValue('job-1'),
      getLastFiles: vi.fn().mockReturnValue([makeDirectoryItem()]),
    } as any;

    const chatService = {
      getProviderInfo: vi.fn().mockReturnValue({ name: 'MockProvider', type: 'llm' }),
    } as any;

    const configService = {
      getProviderStatus: vi.fn().mockResolvedValue({
        status: 'ready' as const,
        message: 'MockProvider Ready',
        details: 'Provider is configured and ready to use.',
        providerInfo: { name: 'MockProvider', type: 'llm' },
      }),
      getConfig: vi.fn().mockResolvedValue({ ai: { providers: { mock: { apiKey: 'test' } } } } as any),
      setConfig: vi.fn().mockResolvedValue(undefined),
      saveConfig: vi.fn().mockResolvedValue(undefined),
      getAvailableProviders: vi.fn().mockResolvedValue({
        success: true,
        providers: [],
        summary: { total: 0, connected: 0, configured: 0 },
      }),
      configureProvider: vi.fn().mockResolvedValue({ providerId: 'mock', status: 'configured' }),
      validateProvider: vi.fn().mockResolvedValue({ success: true }),
      getProviderModels: vi.fn().mockResolvedValue([]),
    } as any;

    const stub = {
      sessionService: {} as any,
      chatService,
      analyticsService: {} as any,
      discoveryService: {} as any,
      catalystService: {} as any,
      configService,
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

    renderWithServices(<DiscoveryPage />, {
      serviceOverrides: stub,
    });

    // Use real timers for waitFor to work properly
    vi.useRealTimers();

    await waitFor(() => expect(screen.getByText('/workspace')).toBeInTheDocument(), { timeout: 3000 });
    const fileRow = screen.getByText('readme.md');
    fireEvent.click(fileRow);

    await waitFor(() =>
      expect(screen.getByText(/Parse Concepts/i)).toBeInTheDocument(),
    { timeout: 3000 },
    );

    fireEvent.click(screen.getByText(/Parse Concepts/i));

    await waitFor(() =>
      expect(screen.getByText(/Parsing Completed Successfully/i)).toBeInTheDocument(),
    { timeout: 3000 },
    );

    // The modal opens automatically when parsing completes
    await waitFor(() =>
      expect(screen.getAllByText(/Concept Parsing Results/i)[0]).toBeInTheDocument(),
    { timeout: 3000 },
    );
  }, 15000); // Set test timeout to 15 seconds
});
