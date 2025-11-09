/**
 * Global Mocks Setup
 *
 * Sets up global mocks for all tests to prevent import issues
 * and provide consistent test environments.
 */

import { vi } from 'vitest';

// Mock fs/promises globally to prevent import issues
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    exists: vi.fn(),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn(),
    rmdir: vi.fn(),
    access: vi.fn(),
    appendFile: vi.fn(),
  },
  readFile: vi.fn(),
  writeFile: vi.fn(),
  exists: vi.fn(),
  mkdir: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
  unlink: vi.fn(),
  rmdir: vi.fn(),
  access: vi.fn(),
  appendFile: vi.fn(),
}));

// Mock path module
vi.mock('path', () => ({
  default: {
    join: (...args: string[]) => args.join('/'),
    resolve: (...args: string[]) => args.join('/'),
    dirname: (p: string) => p.split('/').slice(0, -1).join('/'),
    basename: (p: string) => p.split('/').pop() || '',
    extname: (p: string) => '.' + (p.split('.').pop() || ''),
  },
  join: (...args: string[]) => args.join('/'),
  resolve: (...args: string[]) => args.join('/'),
  dirname: (p: string) => p.split('/').slice(0, -1).join('/'),
  basename: (p: string) => p.split('/').pop() || '',
  extname: (p: string) => '.' + (p.split('.').pop() || ''),
}));

// Mock Electron APIs globally
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/path'),
    getVersion: vi.fn(() => '1.0.0'),
    getName: vi.fn(() => 'Learning Catalyst'),
  },
  BrowserWindow: vi.fn(),
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    removeListener: vi.fn(),
  },
  Menu: vi.fn(),
  MenuItem: vi.fn(),
  dialog: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    showMessageBox: vi.fn(),
  },
  shell: {
    openExternal: vi.fn(),
  },
}));

// Mock Electron APIs for main process
global.electronAPI = {
  openFile: vi.fn(),
  saveFile: vi.fn(),
  showMessageBox: vi.fn(),
  minimizeWindow: vi.fn(),
  closeWindow: vi.fn(),
};