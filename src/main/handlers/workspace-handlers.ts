import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';
import { ipcMain, dialog, BrowserWindow } from 'electron';

export function setupWorkspaceHandlers(mainWindow: BrowserWindow | null, globalWorkspacePath: string): void {
	ipcMain.handle('workspace:getPath', () => {
		return globalWorkspacePath;
	});

	ipcMain.handle('workspace:resolvePath', (_, relativePath: string) => {
		return join(globalWorkspacePath, relativePath);
	});

	ipcMain.handle('workspace:getDatabasePath', async () => {
		const dbPath = join(globalWorkspacePath, '.catalyst', 'learning_catalyst.db');
		return dbPath;
	});

	ipcMain.handle('workspace:readFile', async (_, relativePath: string) => {
		try {
			const fullPath = join(globalWorkspacePath, relativePath);
			const content = await readFile(fullPath, 'utf-8');
			return content;
		} catch (error) {
			throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	ipcMain.handle('workspace:writeFile', async (_, relativePath: string, content: string) => {
		try {
			const fullPath = join(globalWorkspacePath, relativePath);
			await writeFile(fullPath, content, 'utf-8');
		} catch (error) {
			throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	ipcMain.handle('workspace:existsFile', async (_, relativePath: string) => {
		try {
			const fullPath = join(globalWorkspacePath, relativePath);
			await access(fullPath);
			return true;
		} catch {
			return false;
		}
	});

	ipcMain.handle('workspace:openDialog', async (_, options: Electron.OpenDialogOptions) => {
		if (!mainWindow) throw new Error('No main window');
		const updatedOptions = {
			...options,
			defaultPath: globalWorkspacePath,
		};
		return await dialog.showOpenDialog(mainWindow, updatedOptions);
	});
}