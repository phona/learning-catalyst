import {
	setdbPath,
	executeQuery,
	executeMany,
	executeScript,
	fetchOne,
	fetchMany,
	fetchAll
} from 'sqlite-electron';
import { ipcMain } from 'electron';

export function setupDatabaseHandlers(): void {
	ipcMain.handle('db:setPath', async (_, dbPath: string) => {
		try {
			console.log('[DB API] Setting database path to:', dbPath);
			await setdbPath(dbPath, false, false);
			console.log('[DB API] Database path set successfully');
			return dbPath;
		} catch (error: any) {
			console.error('[DB API] Failed to set database path:', error);
			throw new Error(`Failed to set database path: ${error}`);
		}
	});

	ipcMain.handle('db:executeQuery', async (_, query: string, params: any[] = []) => {
		try {
			return await executeQuery(query, params);
		} catch (error: any) {
			console.error('[DB API] Failed to execute query:', error);
			throw new Error(`Failed to execute query: ${error}`);
		}
	});

	ipcMain.handle('db:fetchOne', async (_, query: string, params: any[] = []) => {
		try {
			return await fetchOne(query, params);
		} catch (error: any) {
			console.error('[DB API] Failed to fetch one:', error);
			throw new Error(`Failed to fetch one: ${error}`);
		}
	});

	ipcMain.handle('db:fetchMany', async (_, query: string, size: number, params: any[] = []) => {
		try {
			return await fetchMany(query, size, params);
		} catch (error: any) {
			console.error('[DB API] Failed to fetch many:', error);
			throw new Error(`Failed to fetch many: ${error}`);
		}
	});

	ipcMain.handle('db:fetchAll', async (_, query: string, params: any[] = []) => {
		try {
			return await fetchAll(query, params);
		} catch (error: any) {
			console.error('[DB API] Failed to fetch all:', error);
			throw new Error(`Failed to fetch all: ${error}`);
		}
	});

	ipcMain.handle('db:executeMany', async (_, query: string, values: any[] = []) => {
		try {
			return await executeMany(query, values);
		} catch (error: any) {
			console.error('[DB API] Failed to execute many:', error);
			throw new Error(`Failed to execute many: ${error}`);
		}
	});

	ipcMain.handle('db:executeScript', async (_, script: string) => {
		try {
			return await executeScript(script);
		} catch (error: any) {
			console.error('[DB API] Failed to execute script:', error);
			throw new Error(`Failed to execute script: ${error}`);
		}
	});
}