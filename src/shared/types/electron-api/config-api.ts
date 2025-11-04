/**
 * Configuration Management API
 *
 * Provides configuration operations through Electron IPC
 */

import { AppConfig } from "../config";

export interface ConfigAPI {
  /**
   * Get application configuration
   * @returns Current configuration object
   */
  getConfig: () => Promise<AppConfig | null>;

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