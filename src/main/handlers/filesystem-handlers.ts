/**
 * Filesystem & Dialog IPC Handlers
 *
 * Implements the helper surface documented in docs/DEVELOPER-GUIDE/electron-api.md:
 * - getWorkspacePath
 * - readDirectory
 * - readFile / writeFile / existsFile
 * - showOpenDialog / showSaveDialog
 */

import { ipcMain, dialog } from 'electron';
import type { OpenDialogOptions, SaveDialogOptions } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import type { LoggerService } from '../services/core/logger/logger-service';

type DirectoryFilterConfig = {
  showHiddenFiles?: boolean;
  excludePatterns?: string[];
};

type DirectoryEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  extension: string;
  modifiedTime: Date;
  createdTime: Date;
  accessedTime: Date;
  depth: number;
  children: DirectoryEntry[];
};

export const setupFilesystemHandlers = (
  ipcMainInstance: typeof ipcMain,
  deps: { workspacePath: string; loggerService: LoggerService },
): void => {
  const logger = deps.loggerService.child({ handler: 'filesystem' });

  ipcMainInstance.handle('fs:get-workspace-path', async () => {
    logger.info('Returning workspace path', { workspacePath: deps.workspacePath });
    return deps.workspacePath;
  });

  ipcMainInstance.handle(
    'fs:read-directory',
    async (
      _event,
      targetPath: string,
      recursive = false,
      maxDepth = 3,
      filterConfig?: DirectoryFilterConfig,
    ): Promise<DirectoryEntry[]> => {
      const visit = async (dir: string, depth: number): Promise<DirectoryEntry[]> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const results: DirectoryEntry[] = [];
        for (const entry of entries) {
          if (!filterConfig?.showHiddenFiles && entry.name.startsWith('.')) continue;
          const fullPath = path.join(dir, entry.name);
          if (filterConfig?.excludePatterns?.some((pat) => fullPath.includes(pat))) continue;
          const stat = await fs.stat(fullPath);
          const item: DirectoryEntry = {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            isFile: entry.isFile(),
            size: stat.size,
            extension: path.extname(entry.name).replace('.', ''),
            modifiedTime: stat.mtime,
            createdTime: stat.ctime,
            accessedTime: stat.atime,
            depth,
            children: [],
          };
          if (recursive && entry.isDirectory() && depth < maxDepth) {
            item.children = await visit(fullPath, depth + 1);
          }
          results.push(item);
        }
        return results;
      };

      try {
        const items = await visit(targetPath, 0);
        return items;
      } catch (error) {
        logger.error('Failed to read directory', { targetPath, error });
        throw error;
      }
    },
  );

  ipcMainInstance.handle(
    'fs:read-file',
    async (_event, filePath: string, encoding: BufferEncoding = 'utf-8') => {
      try {
        return await fs.readFile(filePath, encoding);
      } catch (error) {
        logger.error('Failed to read file', { filePath, error });
        throw error;
      }
    },
  );

  ipcMainInstance.handle(
    'fs:write-file',
    async (_event, filePath: string, content: string, encoding: BufferEncoding = 'utf-8') => {
      try {
        await fs.writeFile(filePath, content, { encoding });
      } catch (error) {
        logger.error('Failed to write file', { filePath, error });
        throw error;
      }
    },
  );

  ipcMainInstance.handle('fs:exists-file', async (_event, filePath: string) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  });

  ipcMainInstance.handle('dialog:show-open-dialog', async (_event, options?: OpenDialogOptions) => {
    logger.info('Opening file dialog');
    return dialog.showOpenDialog(options ?? ({} as OpenDialogOptions));
  });

  ipcMainInstance.handle('dialog:show-save-dialog', async (_event, options?: SaveDialogOptions) => {
    logger.info('Opening save dialog');
    return dialog.showSaveDialog(options ?? ({} as SaveDialogOptions));
  });

  logger.info('Filesystem handlers registered');
};
