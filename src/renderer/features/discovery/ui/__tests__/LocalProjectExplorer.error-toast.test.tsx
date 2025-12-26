import React from 'react';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { LocalProjectExplorer } from '../LocalProjectExplorer';
import { createMockElectronAPI } from '@/test/utils/electron-api-fixture';
import { renderWithServices } from '@/test/utils/renderWithServices';

// Mock the toast utilities
vi.mock('@/renderer/shared/lib', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

const createMockFileService = () => ({
  getWorkspacePath: vi.fn(),
  readDirectory: vi.fn(),
  existsFile: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
});

const createMockConceptService = () => ({
  parseDirectories: vi.fn(),
  parseFiles: vi.fn(),
  getLastJobId: vi.fn(() => null),
  getLastFiles: vi.fn(() => []),
  clearSavedJobs: vi.fn(async () => 0),
  getJobStatus: vi.fn(),
  cancelJob: vi.fn(),
  listActiveJobs: vi.fn(() => []),
});

const createMockChatService = () => ({
  getProviderInfo: vi.fn(() => ({ name: 'OpenAI', type: 'openai' })),
});

const createMockConfigurationService = () => ({
  getConfiguration: vi.fn().mockResolvedValue({
    ai: {
      providers: [],
      defaultProviderId: null,
    },
  }),
  getProviderStatus: vi.fn().mockResolvedValue({
    status: 'not-configured',
    message: 'No provider configured',
    details: 'Please configure an AI provider',
  }),
});

// Import after mocking
import { showError, showSuccess } from '@/renderer/shared/lib';

describe('LocalProjectExplorer - error handling', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(showError).mockClear();
    vi.mocked(showSuccess).mockClear();
  });

  const setup = (component: React.ReactElement) => {
    const mockAPI = createMockElectronAPI();
    const fileService = createMockFileService();
    const conceptService = createMockConceptService();
    const chatService = createMockChatService();
    const configService = createMockConfigurationService();

    // Default mock setup for fileService
    fileService.getWorkspacePath.mockResolvedValue({ success: true, data: '/workspace' });
    fileService.readDirectory.mockResolvedValue({
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

    const renderResult = renderWithServices(component, {
      electronAPI: mockAPI,
      withAssistantProvider: false,
      serviceOverrides: {
        fileService,
        conceptParsing: conceptService,
        chatService,
        configService,
      },
    });

    return {
      ...renderResult,
      services: { fileService, conceptService, chatService, configService },
    };
  };

  it('shows error toast when parsing job fails', async () => {
    const user = userEvent.setup();

    const { services } = setup(<LocalProjectExplorer />);

    // Wait for file to be loaded
    await waitFor(() => expect(screen.getByText('test.md')).toBeInTheDocument());

    // Select the markdown file
    await act(async () => {
      fireEvent.click(screen.getByText('test.md'));
    });

    // Setup: mock parseFiles to return a job
    const mockJob = {
      id: 'test-job',
      status: 'pending' as const,
      progress: 0,
      startedAt: new Date(),
      stages: [],
    };
    services.conceptService.parseFiles.mockResolvedValueOnce(mockJob);

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
    services.conceptService.getJobStatus.mockReturnValue(failedJob);

    // Click "Parse Concepts" button
    const parseButton = screen.getByText(/Parse Concepts/i);
    await user.click(parseButton);

    // Wait for the job to be checked and detected as failed
    await waitFor(
      () => {
        expect(vi.mocked(showError)).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Verify the error toast was shown with the error message
    expect(vi.mocked(showError)).toHaveBeenCalledWith(
      expect.stringContaining('Concept parsing failed'),
    );
    expect(vi.mocked(showError)).toHaveBeenCalledWith(
      expect.stringContaining('Cannot read properties of undefined'),
    );
  });

  it('shows success toast when parsing starts', async () => {
    const user = userEvent.setup();

    const { services } = setup(<LocalProjectExplorer />);

    // Setup: mock parseFiles to return a job that will succeed
    const mockJob = {
      id: 'test-job-2',
      status: 'pending' as const,
      progress: 0,
      startedAt: new Date(),
      stages: [],
    };
    services.conceptService.parseFiles.mockResolvedValueOnce(mockJob);

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
    services.conceptService.getJobStatus.mockReturnValue(completedJob);

    await waitFor(() => expect(screen.getByText('test.md')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('test.md'));
    });

    const parseButton = screen.getByText(/Parse Concepts/i);
    await user.click(parseButton);

    // Should show success toast when parsing starts
    await waitFor(() => {
      expect(vi.mocked(showSuccess)).toHaveBeenCalledWith('Parsing started');
    });
  });

  it('handles job failure with empty error message', async () => {
    const user = userEvent.setup();

    const { services } = setup(<LocalProjectExplorer />);

    const mockJob = {
      id: 'test-job-3',
      status: 'pending' as const,
      progress: 0,
      startedAt: new Date(),
      stages: [],
    };
    services.conceptService.parseFiles.mockResolvedValueOnce(mockJob);

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
    services.conceptService.getJobStatus.mockReturnValue(failedJob);

    await waitFor(() => expect(screen.getByText('test.md')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('test.md'));
    });

    const parseButton = screen.getByText(/Parse Concepts/i);
    await user.click(parseButton);

    await waitFor(
      () => {
        expect(vi.mocked(showError)).toHaveBeenCalledWith(
          expect.stringContaining('Concept parsing failed'),
        );
        expect(vi.mocked(showError)).toHaveBeenCalledWith(
          expect.stringContaining('Unknown error'),
        );
      },
      { timeout: 3000 },
    );
  });
});
