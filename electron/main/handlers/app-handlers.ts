import { ipcMain, app, BrowserWindow } from 'electron';

export function setupAppHandlers(): void {
	ipcMain.handle('app:getVersion', () => {
		return app.getVersion();
	});

	ipcMain.handle('app:quit', () => {
		app.quit();
	});

	ipcMain.handle('app:getApp', () => {
		return app;
	});

	ipcMain.handle('session:getUserDataPath', () => {
		return app.getPath('userData');
	});

	ipcMain.handle('session:getDocumentsPath', () => {
		return app.getPath('documents');
	});

	ipcMain.handle('session:getAppPath', () => {
		return app.getAppPath();
	});
}