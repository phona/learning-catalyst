import { dialog, ipcMain } from 'electron';
import path from 'node:path';
import { promises as fs, constants as fsConstants } from 'node:fs';
import type { DirectoryFilterConfig, DirectoryScanResult } from '@/shared/types/filesystem';

const MARKDOWN_REGEX = /\.md$/i;

export function setupFilesystemHandlers(workspacePath?: string): void {
  const defaultWorkspace = workspacePath || process.cwd();

  ipcMain.handle('filesystem:get-workspace-path', () => defaultWorkspace);

  ipcMain.handle(
    'filesystem:read-directory',
    async (
      _event,
      dirPath: string,
      recursive: boolean = true,
      maxDepth: number = 3,
      filterConfig?: DirectoryFilterConfig
    ) => {
      const targetPath = dirPath || defaultWorkspace;
      return await collectEntries(
        targetPath,
        recursive ? maxDepth : 1,
        filterConfig ?? { excludePatterns: ['node_modules', '.git'] }
      );
    }
  );

  ipcMain.handle('filesystem:read-file', async (_event, filePath: string, encoding: BufferEncoding = 'utf-8') => {
    return await fs.readFile(filePath, { encoding });
  });

  ipcMain.handle(
    'filesystem:write-file',
    async (_event, filePath: string, content: string, encoding: BufferEncoding = 'utf-8') => {
      await fs.writeFile(filePath, content, { encoding });
    }
  );

  ipcMain.handle('filesystem:path-exists', async (_event, filePath: string) => {
    try {
      await fs.access(filePath, fsConstants.F_OK);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('dialog:show-open', async (_event, options: Electron.OpenDialogOptions = {}) => {
    return await dialog.showOpenDialog(options);
  });

  ipcMain.handle('dialog:show-save', async (_event, options: Electron.SaveDialogOptions = {}) => {
    return await dialog.showSaveDialog(options);
  });
}

async function collectEntries(
  directory: string,
  maxDepth: number,
  filterConfig: DirectoryFilterConfig,
  currentDepth = 0,
  results: DirectoryScanResult[] = []
): Promise<DirectoryScanResult[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (shouldExclude(entry.name, filterConfig)) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);
    const stats = await fs.stat(fullPath);

    const record: DirectoryScanResult = {
      name: entry.name,
      path: fullPath,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
      size: stats.size,
      extension: entry.isFile() ? path.extname(entry.name) : '',
      modifiedTime: stats.mtime,
      createdTime: stats.ctime,
      accessedTime: stats.atime,
      isMarkdown: entry.isFile() && MARKDOWN_REGEX.test(entry.name),
      depth: currentDepth,
      children: []
    };

    results.push(record);

    if (entry.isDirectory() && currentDepth + 1 < maxDepth) {
      await collectEntries(fullPath, maxDepth, filterConfig, currentDepth + 1, results);
    }
  }

  return results;
}

function shouldExclude(name: string, filterConfig: DirectoryFilterConfig): boolean {
  if (!filterConfig.showHiddenFiles && name.startsWith('.')) {
    return true;
  }

  if (filterConfig.excludePatterns?.length) {
    return filterConfig.excludePatterns.some(pattern => {
      if (!pattern) return false;
      return name.toLowerCase().includes(pattern.toLowerCase());
    });
  }

  return false;
}
