/**
 * Configuration Management API
 *
 * Provides configuration operations through Electron IPC
 */

export interface ConfigAPI {
  /**
   * Get application configuration
   * @returns Current configuration object
   */
  getConfig: () => Promise<any>;

  /**
   * Set application configuration
   * @param config - Configuration object to set
   */
  setConfig: (config: any) => Promise<void>;

  /**
   * Reset configuration to defaults
   * @returns Reset configuration object
   */
  resetConfig: () => Promise<any>;
}