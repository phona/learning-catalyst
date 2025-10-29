/**
 * Workspace Operations API
 *
 * Provides workspace file and path operations through Electron IPC
 */

export interface WorkspaceAPI {
  /**
   * Get the current workspace path
   * @returns Current workspace directory path
   */
  getWorkspacePath: () => Promise<string>;

  /**
   * Get the database file path in workspace
   * @returns Database file path
   */
  getDatabasePath: () => Promise<string>;

  /**
   * Resolve a relative path to absolute workspace path
   * @param relativePath - Relative path from workspace root
   * @returns Absolute path
   */
  resolveWorkspacePath: (relativePath: string) => Promise<string>;

  /**
   * Read a file from workspace
   * @param relativePath - Relative path from workspace root
   * @returns File content as string
   */
  readWorkspaceFile: (relativePath: string) => Promise<string>;

  /**
   * Write a file to workspace
   * @param relativePath - Relative path from workspace root
   * @param content - Content to write
   */
  writeWorkspaceFile: (relativePath: string, content: string) => Promise<void>;

  /**
   * Check if a file exists in workspace
   * @param relativePath - Relative path from workspace root
   * @returns True if file exists, false otherwise
   */
  workspaceFileExists: (relativePath: string) => Promise<boolean>;

  /**
   * Show workspace file dialog
   * @param options - Dialog options
   * @returns Dialog result with selected file paths
   */
  showWorkspaceDialog: (options: any) => Promise<any>;
}