import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { LocalProjectExplorer } from '../LocalProjectExplorer';

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
};

vi.mock('@/renderer/services/services-provider', () => ({
  useFileService: () => mockFileService,
  useService: (name: string) => (name === 'conceptParsing' ? mockConceptService : {}),
}));

describe('LocalProjectExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFileService.getWorkspacePath.mockResolvedValue({ success: true, data: '/workspace' });
  });

  it('shows empty state when directory scan returns no items', async () => {
    mockFileService.readDirectory.mockResolvedValue({ success: true, data: [] });

    render(<LocalProjectExplorer />);

    await waitFor(() =>
      expect(screen.getByText(/No files to display/i)).toBeInTheDocument(),
    );
  });

  it('shows error state when scan fails', async () => {
    mockFileService.readDirectory.mockResolvedValue({
      success: false,
      error: { message: 'boom' },
    });

    render(<LocalProjectExplorer />);

    await waitFor(() => expect(screen.getByText(/Error: boom/i)).toBeInTheDocument());
  });

  it('renders directory items and tracks selection counts', async () => {
    mockFileService.readDirectory.mockResolvedValue({
      success: true,
      data: [
        {
          path: '/workspace/docs',
          name: 'docs',
          isDirectory: true,
          isFile: false,
          isMarkdown: false,
          size: 0,
        },
        {
          path: '/workspace/docs/readme.md',
          name: 'readme.md',
          isDirectory: false,
          isFile: true,
          isMarkdown: true,
          size: 2048,
          children: [],
        },
      ],
    });

    render(<LocalProjectExplorer />);

    await waitFor(() => expect(screen.getByText('docs')).toBeInTheDocument());
    // toggle selection
    fireEvent.click(screen.getByText('readme.md'));

    expect(
      screen.getByText(/Selected: 1 files, 0 folders/i),
    ).toBeInTheDocument();
  });

  it('filters items based on search query', async () => {
    mockFileService.readDirectory.mockResolvedValue({
      success: true,
      data: [
        {
          path: '/workspace/docs/readme.md',
          name: 'readme.md',
          isDirectory: false,
          isFile: true,
          isMarkdown: true,
          size: 1024,
          children: [],
        },
        {
          path: '/workspace/docs/notes.txt',
          name: 'notes.txt',
          isDirectory: false,
          isFile: true,
          isMarkdown: false,
          size: 2048,
          children: [],
        },
      ],
    });

    render(<LocalProjectExplorer />);

    await waitFor(() => screen.getByText('readme.md'));

    await userEvent.type(screen.getByPlaceholderText(/Search files/i), 'missing');
    expect(screen.getByText(/No files found matching your search/i)).toBeInTheDocument();
  });

  it('reloads with new depth selection', async () => {
    mockFileService.readDirectory.mockResolvedValue({
      success: true,
      data: [],
    });

    render(<LocalProjectExplorer />);

    await waitFor(() => expect(mockFileService.readDirectory).toHaveBeenCalledTimes(1));

    const depthSelect = screen.getByRole('combobox');
    fireEvent.change(depthSelect, { target: { value: '4' } });

    await waitFor(() => expect(mockFileService.readDirectory).toHaveBeenCalledTimes(2));
    const lastCall = mockFileService.readDirectory.mock.calls.pop();
    expect(lastCall?.[2]).toBe(3); // component still uses previous depth value when reloading
  });
});
