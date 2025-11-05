import { ipcMain, BrowserWindow } from 'electron';

export function setupWindowHandlers(mainWindow: BrowserWindow | null): void {
	ipcMain.handle('window:minimize', () => {
		if (mainWindow) mainWindow.minimize();
	});

	ipcMain.handle('window:maximize', () => {
		if (mainWindow) {
			if (mainWindow.isMaximized()) {
				mainWindow.unmaximize();
			} else {
				mainWindow.maximize();
			}
		}
	});

	ipcMain.handle('window:close', () => {
		if (mainWindow) mainWindow.close();
	});
}