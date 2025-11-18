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
/* eslint-disable no-undef */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import path from 'node:path';

type IpcHandler = (...args: unknown[]) => unknown;

interface Dirent {
  name: string;
  isDirectory: () => boolean;
  isFile: () => boolean;
}

interface FileStats {
  size: number;
  mtime: Date;
  ctime: Date;
  atime: Date;
}

const electronMocks = vi.hoisted(() => ({
  handlerMap: new Map<string, IpcHandler>(),
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn()
}));

const fsMocks = vi.hoisted(() => ({
  readdir: vi.fn(),
  stat: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  access: vi.fn()
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: IpcHandler): void =>
      electronMocks.handlerMap.set(channel, handler)
  },
  dialog: {
    showOpenDialog: electronMocks.showOpenDialog,
    showSaveDialog: electronMocks.showSaveDialog
  }
}));

vi.mock('node:fs', () => ({
  promises: fsMocks,
  constants: { F_OK: 0 }
}));

import { setupFilesystemHandlers } from '../filesystem-handlers';

const handlerMap = electronMocks.handlerMap;
const showOpenDialog = electronMocks.showOpenDialog;
const showSaveDialog = electronMocks.showSaveDialog;
const mockFs = fsMocks;

const getHandler = (channel: string): IpcHandler => {
  const handler = handlerMap.get(channel);
  expect(handler).toBeDefined();
  return handler as IpcHandler;
};

const createDirent = (name: string, type: 'file' | 'dir'): Dirent => ({
  name,
  isDirectory: (): boolean => type === 'dir',
  isFile: (): boolean => type === 'file'
});

const mockStats: FileStats = {
  size: 100,
  mtime: new Date(),
  ctime: new Date(),
  atime: new Date()
};

describe('filesystem handlers', () => {
  beforeEach(() => {
    handlerMap.clear();
    vi.clearAllMocks();
  });

  it('returns workspace path and directory entries', async (): Promise<void> => {
    const root = path.join('/', 'workspace');
    mockFs.readdir.mockImplementation(async (dir: string): Promise<Dirent[]> => {
      const normalized = dir.replace(/\\/g, '/');
      if (normalized === root.replace(/\\/g, '/')) {
        return [createDirent('docs', 'dir'), createDirent('notes.md', 'file')];
      }
      if (normalized.endsWith('docs')) {
        return [createDirent('deep.md', 'file')];
      }
      return [];
    });
    mockFs.stat.mockResolvedValue(mockStats);

    setupFilesystemHandlers('/workspace');

    const workspacePath = await (getHandler('filesystem:get-workspace-path'))(null);
    expect(workspacePath).toBe('/workspace');

    const entries = await (getHandler('filesystem:read-directory'))(null, '/workspace', true, 2, {
      showHiddenFiles: false,
      excludePatterns: []
    }) as Array<{ isMarkdown: boolean; path: string }>;

    expect(entries).toHaveLength(3);
    const markdownFiles = entries.filter((entry) => entry.isMarkdown);
    expect(markdownFiles).toHaveLength(2);
    expect(entries.every((entry) => entry.path.includes('workspace'))).toBe(true);
  });

  it('checks path existence and proxies dialog calls', async (): Promise<void> => {
    mockFs.access.mockResolvedValue(undefined);

    setupFilesystemHandlers('/workspace');

    const existsTrue = await (getHandler('filesystem:path-exists'))(null, '/workspace/notes.md');
    expect(existsTrue).toBe(true);

    mockFs.access.mockRejectedValueOnce(new Error('missing'));
    const existsFalse = await (getHandler('filesystem:path-exists'))(null, '/workspace/missing.md');
    expect(existsFalse).toBe(false);

    await (getHandler('dialog:show-open'))(null, { properties: ['openFile'] });
    expect(showOpenDialog).toHaveBeenCalled();

    await (getHandler('dialog:show-save'))(null, { defaultPath: 'file.md' });
    expect(showSaveDialog).toHaveBeenCalled();
  });
});
