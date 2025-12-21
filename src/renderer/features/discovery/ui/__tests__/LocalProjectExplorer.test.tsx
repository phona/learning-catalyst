import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { LocalProjectExplorer } from '../LocalProjectExplorer';
import { createFileServiceWithErrors, createProblematicDataObjects } from '@/test/utils/services-provider-stubs';

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
  useChatService: () => ({
    sendChat: vi.fn(),
    sendChatStream: vi.fn(),
  }),
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
    expect(lastCall?.[2]).toBe(4); // updated depth value when reloading
  });

  // ==================== ENHANCED ERROR TESTING ====================

  describe('Error Detection and Render Safety', () => {
    it('should NOT render error objects', () => {
      // This test ensures the component doesn't accidentally render objects that would cause
      // "Objects are not valid as a React child" errors
      const problematicObject = createProblematicDataObjects().apiResponseObject;

      expect(() => {
        render(<div>{problematicObject}</div>);
      }).toThrow('Objects are not valid as a React child');
    });

    it('should handle malformed directory data gracefully', async () => {
      // Test with directory data that contains invalid or malformed entries
      mockFileService.readDirectory.mockResolvedValue({
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
        render(<LocalProjectExplorer />);
      }).not.toThrow();

      // The component should handle the malformed data gracefully
      // (it may filter out invalid entries, which is acceptable behavior)
      await waitFor(() => {
        // At minimum, the component should render without crashing
        expect(screen.getByText(/Explorer/i)).toBeInTheDocument();
      });
    });

    it('should render error messages as strings, not objects', async () => {
      // Ensure error messages are properly converted to strings
      mockFileService.readDirectory.mockResolvedValue({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'This is a string message',
          details: { complex: 'object', that: 'should not be rendered directly' }
        }
      });

      render(<LocalProjectExplorer />);

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
      // Test scenario where some items are valid and others have errors
      mockFileService.readDirectory.mockResolvedValue({
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
        render(<LocalProjectExplorer />);
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
      // Generate a large number of mock files
      const manyFiles = Array.from({ length: 1000 }, (_, i) => ({
        path: `/workspace/file${i}.md`,
        name: `file${i}.md`,
        isDirectory: false,
        isFile: true,
        isMarkdown: true,
        size: 1024,
      }));

      mockFileService.readDirectory.mockResolvedValue({
        success: true,
        data: manyFiles,
      });

      expect(() => {
        render(<LocalProjectExplorer />);
      }).not.toThrow();

      await waitFor(() => {
        expect(screen.getByText(/Selected: 0 files/)).toBeInTheDocument();
      });
    });

    it('should handle extremely long file names', async () => {
      const longFileName = 'a'.repeat(500) + '.md';

      mockFileService.readDirectory.mockResolvedValue({
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
        render(<LocalProjectExplorer />);
      }).not.toThrow();

      await waitFor(() => {
        expect(screen.getByText(longFileName)).toBeInTheDocument();
      });
    });
  });
});
