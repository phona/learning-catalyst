import { BrowserWindow, dialog, ipcMain, type OpenDialogOptions, type SaveDialogOptions } from 'electron';

export const setupDialogHandlers = (ipcMainInstance: typeof ipcMain): void => {
  ipcMainInstance.handle(
    'dialog:show-open-dialog',
    async (event, options?: OpenDialogOptions) => {
      const browserWindow = BrowserWindow.fromWebContents(event.sender) ?? undefined;
      if (browserWindow) {
        return dialog.showOpenDialog(browserWindow, options ?? {});
      }
      return dialog.showOpenDialog(options ?? {});
    },
  );

  ipcMainInstance.handle(
    'dialog:show-save-dialog',
    async (event, options?: SaveDialogOptions) => {
      const browserWindow = BrowserWindow.fromWebContents(event.sender) ?? undefined;
      if (browserWindow) {
        return dialog.showSaveDialog(browserWindow, options ?? {});
      }
      return dialog.showSaveDialog(options ?? {});
    },
  );
};
