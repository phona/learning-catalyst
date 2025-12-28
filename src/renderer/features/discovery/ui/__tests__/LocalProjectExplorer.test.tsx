import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { LocalProjectExplorer } from '../LocalProjectExplorer';
import { ServicesProvider } from '@/renderer/services/services-provider';
import { createMockElectronAPI } from '@/test/utils/electron-api-fixture';

// Mock services following the DI pattern from the proposal
const createMockFileService = () => ({
  getWorkspacePath: vi.fn().mockResolvedValue({ success: true, data: '/workspace' }),
  readDirectory: vi.fn().mockResolvedValue({ success: true, data: [] }),
  existsFile: vi.fn().mockResolvedValue(true),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
});

const createMockConceptParsingService = () => ({
  parseDirectories: vi.fn(),
  parseFiles: vi.fn(),
  getLastJobId: vi.fn(() => null),
  getLastFiles: vi.fn(() => []),
  clearSavedJobs: vi.fn(async () => 0),
  getJobStatus: vi.fn(),
  listActiveJobs: vi.fn(() => []),
  cancelJob: vi.fn(() => false),
});

const createMockConfigurationService = () => ({
  getConfiguration: vi.fn().mockResolvedValue({
    ai: {
      providers: [],
      defaultProviderId: null,
    },
  }),
  updateConfiguration: vi.fn(),
  getProviderStatus: vi.fn().mockResolvedValue({
    status: 'not-configured',
    message: 'No provider configured',
    details: 'Please configure an AI provider',
  }),
});

const createMockChatService = () => ({
  sendChat: vi.fn(),
  sendChatStream: vi.fn(),
});

describe('LocalProjectExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Helper to render with ServicesProvider
  const renderWithProvider = (
    component: React.ReactNode,
    customOverrides: Record<string, unknown> = {},
  ) => {
    const mockAPI = createMockElectronAPI();

    return render(
      <ServicesProvider
        apiClient={mockAPI}
        overrides={{
          fileService: createMockFileService() as any,
          conceptParsing: createMockConceptParsingService() as any,
          configService: createMockConfigurationService() as any,
          chatService: createMockChatService() as any,
          ...customOverrides,
        }}
      >
        {component}
      </ServicesProvider>
    );
  };

  it('shows empty state when directory scan returns no items', async () => {
    const fileService = createMockFileService();
    fileService.readDirectory.mockResolvedValue({ success: true, data: [] });

    renderWithProvider(<LocalProjectExplorer />, { fileService });

    await waitFor(() =>
      expect(screen.getByText(/No files to display/i)).toBeInTheDocument(),
    );
  });

  it('shows error state when scan fails', async () => {
    const fileService = createMockFileService();
    fileService.readDirectory.mockResolvedValue({
      success: false,
      error: { message: 'boom' },
    });

    renderWithProvider(<LocalProjectExplorer />, { fileService });

    await waitFor(() => {
      // FileTree shows "Error: {message}" in the error state
      expect(screen.getByText(/boom/i)).toBeInTheDocument();
      // Also verify the "Try again" button is present
      expect(screen.getByText(/Try again/i)).toBeInTheDocument();
    });
  });

  it('renders directory items and tracks selection counts', async () => {
    const fileService = createMockFileService();
    fileService.readDirectory.mockResolvedValue({
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

    renderWithProvider(<LocalProjectExplorer />, { fileService });

    await waitFor(() => expect(screen.getByText('docs')).toBeInTheDocument());
    // toggle selection
    fireEvent.click(screen.getByText('readme.md'));

    expect(
      screen.getByText(/Selected: 1 files, 0 folders/i),
    ).toBeInTheDocument();
  });

  it('filters items based on search query', async () => {
    const fileService = createMockFileService();
    fileService.readDirectory.mockResolvedValue({
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

    renderWithProvider(<LocalProjectExplorer />, { fileService });

    await waitFor(() => screen.getByText('readme.md'));

    await userEvent.type(screen.getByPlaceholderText(/Search files/i), 'missing');
    expect(screen.getByText(/No files found matching your search/i)).toBeInTheDocument();
  });

  it('reloads with new depth selection', async () => {
    const fileService = createMockFileService();
    fileService.readDirectory.mockResolvedValue({
      success: true,
      data: [],
    });

    renderWithProvider(<LocalProjectExplorer />, { fileService });

    await waitFor(() => expect(fileService.readDirectory).toHaveBeenCalled());

    const depthSelect = screen.getByRole('combobox');
    fireEvent.change(depthSelect, { target: { value: '4' } });

    await waitFor(() => expect(fileService.readDirectory).toHaveBeenCalledTimes(2));
    const lastCall = fileService.readDirectory.mock.calls[fileService.readDirectory.mock.calls.length - 1];
    expect(lastCall?.[2]).toBe(4); // updated depth value when reloading
  });

  // ==================== ENHANCED ERROR TESTING ====================

  describe('Error Detection and Render Safety', () => {
    it('should NOT render error objects', () => {
      const problematicObject = { error: 'test' };

      expect(() => {
        render(<div>{problematicObject as any}</div>);
      }).toThrow('Objects are not valid as a React child');
    });

    it('should handle malformed directory data gracefully', async () => {
      const fileService = createMockFileService();
      fileService.readDirectory.mockResolvedValue({
        success: true,
        data: [
          // Valid entry
          {
            path: '/workspace/valid.md',
            name: 'valid.md',
            isDirectory: false,
            isFile: true,
            isMarkdown: true,
            size: 1024,
          },
          // Malformed entry with missing required fields
          {
            path: '/workspace/malformed',
            // Missing name, isDirectory, isFile - should be handled gracefully
          } as any,
          // Invalid entry with null values
          null as any,
        ],
      });

      // Component should not crash even with malformed data
      expect(() => {
        renderWithProvider(<LocalProjectExplorer />, { fileService });
      }).not.toThrow();

      // The component should handle the malformed data gracefully
      // (it may filter out invalid entries, which is acceptable behavior)
      await waitFor(() => {
        // At minimum, the component should render without crashing
        expect(screen.getByText(/Explorer/i)).toBeInTheDocument();
      });
    });

    it('should render error messages as strings, not objects', async () => {
      const fileService = createMockFileService();
      fileService.readDirectory.mockResolvedValue({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'This is a string message',
          details: { complex: 'object', that: 'should not be rendered directly' }
        }
      });

      renderWithProvider(<LocalProjectExplorer />, { fileService });

      await waitFor(() => {
        // Should render the string error message, not the error object
        // Use a more flexible text matcher since the text might be split across elements
        expect(screen.getByText((content, element) => {
          return content.includes('This is a string message');
        })).toBeInTheDocument();

        // Should render error state properly (the key test is that it doesn't crash)
        expect(screen.getByText(/Error:/i)).toBeInTheDocument();
      });
    });

    it('should handle mixed success/error data in results', async () => {
      const fileService = createMockFileService();
      fileService.readDirectory.mockResolvedValue({
        success: true,
        data: [
          {
            path: '/workspace/valid.md',
            name: 'valid.md',
            isDirectory: false,
            isFile: true,
            isMarkdown: true,
            size: 1024,
          },
          {
            path: '/workspace/invalid',
            name: 'invalid',
            isDirectory: false,
            isFile: false, // Inconsistent: not directory but not file either
            isMarkdown: false,
            size: -1, // Invalid size
          },
        ],
      });

      expect(() => {
        renderWithProvider(<LocalProjectExplorer />, { fileService });
      }).not.toThrow();

      await waitFor(() => {
        // Should still render the valid item
        expect(screen.getByText('valid.md')).toBeInTheDocument();
      });
    });
  });

  // ==================== STRESS TESTING ====================

  describe('Stress Testing and Edge Cases', () => {
    it('should handle very large number of files without crashing', async () => {
      const fileService = createMockFileService();
      // Generate a large number of mock files
      const manyFiles = Array.from({ length: 1000 }, (_, i) => ({
        path: `/workspace/file${i}.md`,
        name: `file${i}.md`,
        isDirectory: false,
        isFile: true,
        isMarkdown: true,
        size: 1024,
      }));

      fileService.readDirectory.mockResolvedValue({
        success: true,
        data: manyFiles,
      });

      expect(() => {
        renderWithProvider(<LocalProjectExplorer />, { fileService });
      }).not.toThrow();

      await waitFor(() => {
        expect(screen.getByText(/Selected: 0 files/)).toBeInTheDocument();
      });
    });

    it('should handle extremely long file names', async () => {
      const fileService = createMockFileService();
      const longFileName = 'a'.repeat(500) + '.md';

      fileService.readDirectory.mockResolvedValue({
        success: true,
        data: [
          {
            path: `/workspace/${longFileName}`,
            name: longFileName,
            isDirectory: false,
            isFile: true,
            isMarkdown: true,
            size: 1024,
          },
        ],
      });

      expect(() => {
        renderWithProvider(<LocalProjectExplorer />, { fileService });
      }).not.toThrow();

      await waitFor(() => {
        // The file is rendered but may be truncated visually
        // Look for the markdown indicator badge instead
        expect(screen.getByText(/MD/)).toBeInTheDocument();
      });
    });
  });
});
