import Store from 'electron-store';
import type { AppConfig } from '@/shared/types/config';
import { IConfigStorage } from './interfaces';

/**
 * Electron Store implementation of configuration storage
 * Uses Electron's secure storage for persistence
 */
export class ElectronStoreConfigStorage implements IConfigStorage {
  private readonly store: Store<AppConfig>;

  constructor(name?: string) {
    this.store = new Store<AppConfig>({
      name: name || 'learning-catalyst-config',
      defaults: {} as AppConfig,
      clearInvalidConfig: true,
    });
  }

  async loadConfig(): Promise<AppConfig | null> {
    try {
      const config = this.store.store;
      return Object.keys(config).length > 0 ? config : null;
    } catch (error) {
      console.error('Failed to load configuration from Electron store:', error);
      return null;
    }
  }

  async saveConfig(config: AppConfig): Promise<void> {
    try {
      this.store.set(config);
    } catch (error) {
      console.error('Failed to save configuration to Electron store:', error);
      throw new Error(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async hasConfig(): Promise<boolean> {
    try {
      const config = this.store.store;
      return Object.keys(config).length > 0;
    } catch (error) {
      console.error('Failed to check configuration existence:', error);
      return false;
    }
  }

  /**
   * Clear all configuration data
   */
  async clearConfig(): Promise<void> {
    try {
      this.store.clear();
    } catch (error) {
      console.error('Failed to clear configuration:', error);
      throw new Error(`Failed to clear configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the underlying Electron store instance
   * @returns Store instance for advanced operations
   */
  getStore(): Store<AppConfig> {
    return this.store;
  }
}