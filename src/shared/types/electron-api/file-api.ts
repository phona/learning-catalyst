/**
 * File Operations API
 *
 * Provides file system operations through Electron IPC
 */

import type { FileSystemItem, FileInfo, DirectoryFilterConfig } from '../filesystem';

export interface FileAPI {
  /**
   * Read file content as string
   * @param path - File path to read
   * @returns File content as string
   */
  readFile: (path: string) => Promise<string>;

  /**
   * Write content to file
   * @param path - File path to write
   * @param content - Content to write to file
   */
  writeFile: (path: string, content: string) => Promise<void>;

  /**
   * Check if file exists
   * @param path - File path to check
   * @returns True if file exists, false otherwise
   */
  existsFile: (path: string) => Promise<boolean>;

  /**
   * Read directory contents with optional recursion
   * @param dirPath - Directory path to read
   * @param recursive - Whether to scan recursively (default: false)
   * @param maxDepth - Maximum recursion depth (default: 10)
   * @param filterConfig - Filter configuration to apply during scanning
   * @returns Array of file/directory information
   */
  readDirectory: (dirPath: string, recursive?: boolean, maxDepth?: number, filterConfig?: DirectoryFilterConfig) => Promise<FileSystemItem[]>;

  /**
   * Get file information
   * @param filePath - File path to get info for
   * @returns File metadata including size, timestamps, etc.
   */
  getFileInfo: (filePath: string) => Promise<FileInfo>;
}