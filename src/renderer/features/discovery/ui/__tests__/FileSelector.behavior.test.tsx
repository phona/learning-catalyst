import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { FileSelector } from '../FileSelector';
import type { FileSystemItem } from '@/shared/types/filesystem';
import { renderWithServices } from '@/test/utils/renderWithServices';

const mkItem = (overrides: Partial<FileSystemItem>): FileSystemItem => ({
  name: 'file',
  path: '/file',
  isDirectory: false,
  isFile: true,
  isMarkdown: false,
  size: 1024,
  extension: '.txt',
  modifiedTime: new Date('2024-01-01'),
  createdTime: new Date('2024-01-01'),
  accessedTime: new Date('2024-01-01'),
  ...overrides,
});

describe('FileSelector', () => {
  const onFileSelect = vi.fn();
  const onDirectorySelect = vi.fn();
  const onClearSelection = vi.fn();

  const files: FileSystemItem[] = [
    mkItem({ name: 'notes.md', path: '/notes.md', isMarkdown: true, extension: '.md', size: 1024 }),
    mkItem({ name: 'report.txt', path: '/report.txt', size: 2048 }),
    mkItem({
      name: 'docs',
      path: '/docs',
      isDirectory: true,
      isFile: false,
      size: 0,
    }),
  ];

  const renderSelector = (selectedFiles: string[] = [], selectedDirs: string[] = []) =>
    renderWithServices(
      <FileSelector
        selectedFiles={selectedFiles}
        selectedDirectories={selectedDirs}
        availableFiles={files}
        onFileSelect={onFileSelect}
        onDirectorySelect={onDirectorySelect}
        onClearSelection={onClearSelection}
      />,
    );

  it('filters by markdown and directories', () => {
    renderSelector();

    const [filterSelect] = screen.getAllByRole('combobox');
    fireEvent.change(filterSelect, { target: { value: 'markdown' } });
    expect(screen.getByText('notes.md')).toBeInTheDocument();
    expect(screen.queryByText('report.txt')).toBeNull();
    expect(screen.queryByText('docs')).toBeNull();

    fireEvent.change(filterSelect, { target: { value: 'directories' } });
    expect(screen.getByText('docs')).toBeInTheDocument();
    expect(screen.queryByText('notes.md')).toBeNull();
  });

  it('sorts by size descending', () => {
    renderSelector();

    const [, sortSelect] = screen.getAllByRole('combobox');
    fireEvent.change(sortSelect, { target: { value: 'size' } });

    const headings = screen.getAllByRole('heading', { level: 4 });
    expect(headings[0].textContent).toContain('report.txt');
  });

  it('toggles file and directory selection and allows clearing', () => {
    renderSelector(['/report.txt'], ['/docs']);

    fireEvent.click(screen.getByText('report.txt'));
    expect(onFileSelect).toHaveBeenCalledWith('/report.txt', false);

    fireEvent.click(screen.getByText('docs'));
    expect(onDirectorySelect).toHaveBeenCalledWith('/docs', false);

    fireEvent.click(screen.getByRole('button', { name: /Clear All/i }));
    expect(onClearSelection).toHaveBeenCalled();
  });
});
