/**
 * Session Operations API
 *
 * Provides session and system path operations through Electron IPC
 */

export interface SessionAPI {
  /**
   * Get user data directory path
   * @returns User data directory path
   */
  getUserDataPath: () => Promise<string>;

  /**
   * Get documents directory path
   * @returns Documents directory path
   */
  getDocumentsPath: () => Promise<string>;

  /**
   * Get application directory path
   * @returns Application directory path
   */
  getAppPath: () => Promise<string>;
}