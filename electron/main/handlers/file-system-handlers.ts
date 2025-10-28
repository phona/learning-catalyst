import { readFile, writeFile, access } from 'fs/promises';
import { ipcMain } from 'electron';

export function setupFileSystemHandlers(): void {
	ipcMain.handle('fs:readFile', async (_, path: string) => {
		try {
			const content = await readFile(path, 'utf-8');
			return content;
		} catch (error) {
			throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	ipcMain.handle('fs:writeFile', async (_, path: string, content: string) => {
		try {
			await writeFile(path, content, 'utf-8');
		} catch (error) {
			throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	ipcMain.handle('fs:existsFile', async (_, path: string) => {
		try {
			await access(path);
			return true;
		} catch (error) {
			return false;
		}
	});
}