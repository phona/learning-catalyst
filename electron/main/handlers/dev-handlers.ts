import { ipcMain, BrowserWindow } from 'electron';

export function setupDevHandlers(mainWindow: BrowserWindow | null): void {
	ipcMain.handle('dev:openDevTools', () => {
		if (mainWindow && process.env.NODE_ENV === 'development') {
			mainWindow.webContents.openDevTools();
		}
	});
}