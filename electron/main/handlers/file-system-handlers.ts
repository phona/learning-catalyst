import { readFile, writeFile, access, readdir, stat } from 'fs/promises';
import { join, extname, basename, sep } from 'path';
import { ipcMain } from 'electron';
import type { DirectoryFilterConfig } from '../../../src/types/filesystem';

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

	ipcMain.handle('fs:readDirectory', async (_, dirPath: string, recursive: boolean = false, maxDepth: number = 10, filterConfig?: DirectoryFilterConfig) => {
		try {
			const results = await scanDirectory(dirPath, recursive, maxDepth, 0, filterConfig);
			return results;
		} catch (error) {
			throw new Error(`Failed to read directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	ipcMain.handle('fs:getFileInfo', async (_, filePath: string) => {
		try {
			const stats = await stat(filePath);
			return {
				name: basename(filePath),
				path: filePath,
				isDirectory: stats.isDirectory(),
				isFile: stats.isFile(),
				size: stats.size,
				extension: extname(filePath),
				modifiedTime: stats.mtime,
				createdTime: stats.birthtime,
				accessedTime: stats.atime
			};
		} catch (error) {
			throw new Error(`Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});
}

async function scanDirectory(dirPath: string, recursive: boolean, maxDepth: number, currentDepth: number, filterConfig?: DirectoryFilterConfig): Promise<any[]> {
	try {
		const items = await readdir(dirPath);
		const results: any[] = [];

		// Default filter values
		const showHiddenFiles = filterConfig?.showHiddenFiles ?? false;
		const excludePatterns = filterConfig?.excludePatterns ?? [];

		for (const item of items) {
			// Skip hidden files and folders if not requested
			if (!showHiddenFiles && item.startsWith('.')) {
				continue;
			}

			// Skip directories that match exclude patterns
			if (excludePatterns.length > 0 && excludePatterns.includes(item)) {
				continue;
			}

			const fullPath = join(dirPath, item);
			try {
				const stats = await stat(fullPath);
				const fileInfo = {
					name: item,
					path: fullPath,
					isDirectory: stats.isDirectory(),
					isFile: stats.isFile(),
					size: stats.size,
					extension: extname(fullPath),
					modifiedTime: stats.mtime,
					createdTime: stats.birthtime,
					accessedTime: stats.atime,
					isMarkdown: extname(fullPath).toLowerCase() === '.md' || extname(fullPath).toLowerCase() === '.markdown'
				};

				results.push(fileInfo);

				// Recursively scan subdirectories if enabled and within depth limit
				if (recursive && stats.isDirectory() && currentDepth < maxDepth) {
					const subItems = await scanDirectory(fullPath, recursive, maxDepth, currentDepth + 1, filterConfig);
					results.push(...subItems);
				}
			} catch (error) {
				// Skip files we can't access
				console.warn(`Cannot access ${fullPath}:`, error);
			}
		}

		return results;
	} catch (error) {
		throw new Error(`Failed to scan directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}