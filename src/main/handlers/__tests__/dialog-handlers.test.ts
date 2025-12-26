import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupDialogHandlers } from '../dialog-handlers';
import { BrowserWindow, dialog, ipcMain } from 'electron';

const handlerMap = new Map<string, (...args: any[]) => any>();

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => any) => {
      handlerMap.set(channel, handler);
    },
  },
  dialog: {
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
    showSaveDialog: vi.fn().mockResolvedValue({ canceled: true, filePath: '' }),
  },
  BrowserWindow: {
    fromWebContents: vi.fn(() => null),
  },
}));

const getHandler = (channel: string) => {
  const handler = handlerMap.get(channel);
  if (!handler) {
    throw new Error(`Missing handler: ${channel}`);
  }
  return handler;
};

describe('dialog handlers', () => {
  beforeEach(() => {
    handlerMap.clear();
    vi.clearAllMocks();
    setupDialogHandlers(ipcMain);
  });

  it('registers dialog:show-open-dialog', async () => {
    const handler = getHandler('dialog:show-open-dialog');
    await handler({ sender: {} }, { title: 'Pick a file' });

    expect(dialog.showOpenDialog).toHaveBeenCalledWith({ title: 'Pick a file' });
  });

  it('registers dialog:show-save-dialog', async () => {
    const handler = getHandler('dialog:show-save-dialog');
    await handler({ sender: {} }, { title: 'Save as' });

    expect(dialog.showSaveDialog).toHaveBeenCalledWith({ title: 'Save as' });
  });

  it('passes a BrowserWindow when available', async () => {
    const win = { id: 1 };
    vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(win as any);

    const handler = getHandler('dialog:show-open-dialog');
    await handler({ sender: {} }, { title: 'Pick a file' });

    expect(dialog.showOpenDialog).toHaveBeenCalledWith(win, { title: 'Pick a file' });
  });
});
