import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { ipcMain } from 'electron';
import { AppConfig } from '@/types';

export function setupConfigHandlers(globalWorkspacePath: string): void {
	async function loadWorkspaceConfig(): Promise<AppConfig | null> {
		const configPath = join(globalWorkspacePath, '.catalyst', 'config.json');

		try {
			await access(configPath);
			const configContent = await readFile(configPath, 'utf-8');
			return JSON.parse(configContent);
		} catch (error) {
			return null;
		}
	}

	async function saveWorkspaceConfig(config: AppConfig): Promise<void> {
		const configPath = join(globalWorkspacePath, '.catalyst', 'config.json');

		try {
			const catalystDir = dirname(configPath);
			await mkdir(catalystDir, { recursive: true });
			await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
		} catch (error) {
			throw new Error(`Failed to save workspace config: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	function getNestedValue(obj: any, path: string): any {
		return path.split('.').reduce((current, key) => current?.[key], obj);
	}

	function setNestedValue(obj: any, path: string, value: any): any {
		const keys = path.split('.');
		const lastKey = keys.pop()!;
		const target = keys.reduce((current, key) => {
			if (!current[key] || typeof current[key] !== 'object') {
				current[key] = {};
			}
			return current[key];
		}, obj);
		target[lastKey] = value;
		return obj;
	}

	function deleteNestedValue(obj: any, path: string): any {
		const keys = path.split('.');
		const lastKey = keys.pop()!;
		const target = keys.reduce((current, key) => current?.[key], obj);

		if (target && target.hasOwnProperty(lastKey)) {
			delete target[lastKey];
		}

		return obj;
	}

	ipcMain.handle('config:get', async () => {
		return await loadWorkspaceConfig();
	});

	ipcMain.handle('config:set', async (_, config: any) => {
		await saveWorkspaceConfig(config);
	});

	ipcMain.handle('config:delete:key', async (_, key: string) => {
		const config = await loadWorkspaceConfig();
		const updatedConfig = deleteNestedValue(config, key);
		await saveWorkspaceConfig(updatedConfig);
	});

	ipcMain.handle('config:get:key', async (_, key: string) => {
		const config = await loadWorkspaceConfig();
		return getNestedValue(config, key);
	});

	ipcMain.handle('config:set:key', async (_, key: string, value: any) => {
		const config = await loadWorkspaceConfig();
		const updatedConfig = setNestedValue(config, key, value);
		await saveWorkspaceConfig(updatedConfig);
	});

	ipcMain.handle('config:reset', async () => {
		const configPath = join(globalWorkspacePath, '.catalyst', 'config.json');
		await access(configPath);
		const fs = await import('fs/promises');
		await fs.unlink(configPath);
		return await loadWorkspaceConfig();
	});
}