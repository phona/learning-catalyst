import { ipcMain, dialog, BrowserWindow } from 'electron';

export function setupDialogHandlers(mainWindow: BrowserWindow | null): void {
	ipcMain.handle('dialog:openFile', async (_, options: Electron.OpenDialogOptions) => {
		if (!mainWindow) throw new Error('No main window');
		return await dialog.showOpenDialog(mainWindow, options);
	});

	ipcMain.handle('dialog:saveFile', async (_, options: Electron.SaveDialogOptions) => {
		if (!mainWindow) throw new Error('No main window');
		return await dialog.showSaveDialog(mainWindow, options);
	});
}