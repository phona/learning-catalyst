
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { createMockConfigurationService, createMockFileService } from '@/test/utils/services-provider-stubs';
import { LocalProjectExplorer } from '../LocalProjectExplorer';

const mockConceptParsingService = {
  parseFiles: vi.fn(),
  parseDirectories: vi.fn(),
  getJobStatus: vi.fn(),
  cancelJob: vi.fn(),
  listActiveJobs: vi.fn(),
  parseContent: vi.fn()
};

const mockChatService = {
  getProviderInfo: vi.fn()
};

const serviceMap: Record<string, any> = {
  conceptParsing: mockConceptParsingService,
  chatService: mockChatService
};

const configServiceMock = createMockConfigurationService();
const fileServiceMock = createMockFileService();

vi.mock('@/renderer/services/services-provider', () => ({
  useService: (serviceName: keyof typeof serviceMap) => serviceMap[serviceName] ?? null,
  useConfigurationService: vi.fn(() => configServiceMock),
  useFileService: vi.fn(() => fileServiceMock),
}));

const mockGetWorkspacePath = vi.fn();
const mockReadDirectory = vi.fn();

const createDirectoryEntries = () => [
  {
    name: 'docs',
    path: '/workspace/docs',
    isDirectory: true,
    isFile: false,
    size: 0,
    extension: '',
    modifiedTime: Date.now(),
    createdTime: Date.now(),
    accessedTime: Date.now(),
    isMarkdown: false
  },
  {
    name: 'notes.md',
    path: '/workspace/docs/notes.md',
    isDirectory: false,
    isFile: true,
    size: 1024,
    extension: '.md',
    modifiedTime: Date.now(),
    createdTime: Date.now(),
    accessedTime: Date.now(),
    isMarkdown: true
  }
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWorkspacePath.mockResolvedValue('/workspace');
  mockReadDirectory.mockResolvedValue(createDirectoryEntries());
  mockChatService.getProviderInfo.mockReturnValue({
    name: 'Test Provider',
    type: 'openai'
  });
  mockConceptParsingService.getJobStatus.mockReturnValue(null);

  (fileServiceMock.readDirectory as any) = vi.fn(async (...args: unknown[]) => {
    const result = await mockReadDirectory(...(args as []));
    return { success: true, data: result };
  });

  (fileServiceMock.getWorkspacePath as any) = vi.fn(async () => {
    const result = await mockGetWorkspacePath();
    return { success: true, data: result };
  });
});

describe('LocalProjectExplorer', () => {
  it('loads workspace contents and renders directory items', async () => {
    render(<LocalProjectExplorer />);

    await waitFor(() => {
      expect(mockReadDirectory).toHaveBeenCalledWith(
        '/workspace',
        true,
        3,
        expect.objectContaining({ excludePatterns: expect.any(Array) })
      );
    });

    expect(await screen.findByText('docs')).toBeInTheDocument();
    expect(screen.getByText('notes.md')).toBeInTheDocument();
  });

  it('shows error message when directory loading fails', async () => {
    mockReadDirectory.mockRejectedValueOnce(new Error('Scan failed'));

    render(<LocalProjectExplorer />);

    expect(await screen.findByText('Error: Scan failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('selects markdown files and starts concept parsing flow', async () => {
    const parsingJob = {
      id: 'job-1',
      status: 'completed',
      progress: 1,
      stages: [],
      startedAt: new Date(),
      completedAt: new Date(),
      result: { concepts: [{ id: 'concept-1' }] }
    };

    mockConceptParsingService.parseFiles.mockResolvedValue(parsingJob);

    render(<LocalProjectExplorer />);

    const markdownFile = await screen.findByText('notes.md');
    fireEvent.click(markdownFile);

    expect(
      await screen.findByText('1 markdown file selected')
    ).toBeInTheDocument();

    const parseButton = screen.getByRole('button', { name: 'Parse Concepts' });
    fireEvent.click(parseButton);

    await waitFor(() => {
      expect(mockConceptParsingService.parseFiles).toHaveBeenCalledTimes(1);
    });

    const summaries = screen.getAllByText(/concepts extracted/i);
    expect(summaries.length).toBeGreaterThan(0);
  });
});
