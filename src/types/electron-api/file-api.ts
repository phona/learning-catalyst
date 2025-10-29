/**
 * File Operations API
 *
 * Provides file system operations through Electron IPC
 */

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
}