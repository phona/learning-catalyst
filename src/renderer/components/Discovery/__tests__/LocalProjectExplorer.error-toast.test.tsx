import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { LocalProjectExplorer } from '@/renderer/components/Discovery/LocalProjectExplorer';

// Mock the toast utilities before any imports
vi.mock('@/renderer/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

const mockFileService = {
  getWorkspacePath: vi.fn(),
  readDirectory: vi.fn(),
};

const mockConceptService = {
  parseDirectories: vi.fn(),
  parseFiles: vi.fn(),
  getLastJobId: vi.fn(() => null),
  getLastFiles: vi.fn(() => []),
  clearSavedJobs: vi.fn(async () => 0),
  getJobStatus: vi.fn(),
  cancelJob: vi.fn(),
};

const mockChatService = {
  getProviderInfo: vi.fn(() => ({ name: 'OpenAI', type: 'openai' })),
};

vi.mock('@/renderer/services/services-provider', () => ({
  useFileService: () => mockFileService,
  useService: (name: string) => {
    if (name === 'conceptParsing') return mockConceptService;
    if (name === 'chatService') return mockChatService;
    return {};
  },
}));

describe('LocalProjectExplorer - error handling', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const toastModule = await import('@/renderer/utils/toast');
    vi.mocked(toastModule.showError).mockClear();
    vi.mocked(toastModule.showSuccess).mockClear();
    mockFileService.getWorkspacePath.mockResolvedValue({ success: true, data: '/workspace' });
    mockFileService.readDirectory.mockResolvedValue({
      success: true,
      data: [
        {
          path: '/workspace/test.md',
          name: 'test.md',
          isDirectory: false,
          isFile: true,
          isMarkdown: true,
          size: 1024,
          children: [],
        },
      ],
    });
  });

  it('shows error toast when parsing job fails', async () => {
    const user = userEvent.setup();
    const toastModule = await import('@/renderer/utils/toast');

    // Setup: mock parseFiles to return a job
    const mockJob = {
      id: 'test-job',
      status: 'pending' as const,
      progress: 0,
      startedAt: new Date(),
      stages: [],
    };
    mockConceptService.parseFiles.mockResolvedValueOnce(mockJob);

    // Setup: mock getJobStatus to return failed job
    const failedJob = {
      id: 'test-job',
      status: 'failed' as const,
      progress: 1,
      startedAt: new Date(),
      completedAt: new Date(),
      errorMessage: 'Cannot read properties of undefined (reading \'providerName\')',
      stages: [],
    };
    mockConceptService.getJobStatus.mockReturnValue(failedJob);

    render(<LocalProjectExplorer />);

    // Wait for file to be loaded
    await waitFor(() => expect(screen.getByText('test.md')).toBeInTheDocument());

    // Select the markdown file
    await act(async () => {
      fireEvent.click(screen.getByText('test.md'));
    });

    // Click "Parse Concepts" button
    const parseButton = screen.getByText(/Parse Concepts/i);
    await user.click(parseButton);

    // Wait for the job to be checked and detected as failed
    await waitFor(
      () => {
        expect(vi.mocked(toastModule.showError)).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Verify the error toast was shown with the error message
    expect(vi.mocked(toastModule.showError)).toHaveBeenCalledWith(
      expect.stringContaining('Concept parsing failed'),
    );
    expect(vi.mocked(toastModule.showError)).toHaveBeenCalledWith(
      expect.stringContaining('Cannot read properties of undefined'),
    );
  });

  it('shows success toast when parsing starts', async () => {
    const user = userEvent.setup();
    const toastModule = await import('@/renderer/utils/toast');

    // Setup: mock parseFiles to return a job that will succeed
    const mockJob = {
      id: 'test-job-2',
      status: 'pending' as const,
      progress: 0,
      startedAt: new Date(),
      stages: [],
    };
    mockConceptService.parseFiles.mockResolvedValueOnce(mockJob);

    // Setup: mock getJobStatus to return completed job
    const completedJob = {
      id: 'test-job-2',
      status: 'completed' as const,
      progress: 1,
      startedAt: new Date(),
      completedAt: new Date(),
      stages: [],
      result: {
        concepts: [],
        relationships: [],
      },
    };
    mockConceptService.getJobStatus.mockReturnValue(completedJob);

    render(<LocalProjectExplorer />);

    await waitFor(() => expect(screen.getByText('test.md')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('test.md'));
    });

    const parseButton = screen.getByText(/Parse Concepts/i);
    await user.click(parseButton);

    // Should show success toast when parsing starts
    await waitFor(() => {
      expect(vi.mocked(toastModule.showSuccess)).toHaveBeenCalledWith('Parsing started');
    });
  });

  it('handles job failure with empty error message', async () => {
    const user = userEvent.setup();
    const toastModule = await import('@/renderer/utils/toast');

    const mockJob = {
      id: 'test-job-3',
      status: 'pending' as const,
      progress: 0,
      startedAt: new Date(),
      stages: [],
    };
    mockConceptService.parseFiles.mockResolvedValueOnce(mockJob);

    // Job fails with no error message
    const failedJob = {
      id: 'test-job-3',
      status: 'failed' as const,
      progress: 1,
      startedAt: new Date(),
      completedAt: new Date(),
      errorMessage: undefined,
      stages: [],
    };
    mockConceptService.getJobStatus.mockReturnValue(failedJob);

    render(<LocalProjectExplorer />);

    await waitFor(() => expect(screen.getByText('test.md')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('test.md'));
    });

    const parseButton = screen.getByText(/Parse Concepts/i);
    await user.click(parseButton);

    await waitFor(
      () => {
        expect(vi.mocked(toastModule.showError)).toHaveBeenCalledWith(
          expect.stringContaining('Concept parsing failed'),
        );
        expect(vi.mocked(toastModule.showError)).toHaveBeenCalledWith(
          expect.stringContaining('Unknown error'),
        );
      },
      { timeout: 3000 },
    );
  });
});
