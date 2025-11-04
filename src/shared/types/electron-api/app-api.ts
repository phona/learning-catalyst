/**
 * Application Operations API
 *
 * Provides application-level operations through Electron IPC
 */

export interface AppAPI {
  /**
   * Get application version
   * @returns Application version string
   */
  getAppVersion: () => Promise<string>;

  /**
   * Get Electron app instance
   * @returns Electron app instance
   */
  getApp: () => Promise<any>;

  /**
   * Quit the application
   */
  quit: () => void;
}