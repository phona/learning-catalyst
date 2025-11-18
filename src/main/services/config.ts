/**
 * Main Thread Service Configuration
 *
 * Centralized configuration management for main thread services.
 * Provides default values and environment-based overrides.
 */

import Store from 'electron-store';
import { ServiceConfig } from './types';

/**
 * Default service configuration
 */
const DEFAULT_CONFIG: ServiceConfig = {
  database: {
    maxConnections: 10,
    connectionTimeout: 30000, // 30 seconds
    queryTimeout: 60000, // 1 minute
  },
  agents: {
    maxConcurrent: 5,
    defaultTimeout: 300000, // 5 minutes
    maxIterations: 50,
  },
  tools: {
    defaultTimeout: 30000, // 30 seconds
    enableSandbox: true,
  },
  logging: {
    level: 'info',
    maxLogSize: 1000,
    enableConsole: true,
  },
};

/**
 * Configuration manager for main thread services
 */
export class ServiceConfigManager {
  private static instance: ServiceConfigManager;
  private config: ServiceConfig;
  private readonly store: Store<ServiceConfig>;
  private static readonly STORE_KEY = 'service-config';
  private static readonly STORE_NAME = 'learning-catalyst-service-config';

  private constructor(config?: Partial<ServiceConfig>) {
    this.store = new Store<ServiceConfig>({
      name: ServiceConfigManager.STORE_NAME,
      clearInvalidConfig: true
    });

    const persistedConfig = this.store.get(ServiceConfigManager.STORE_KEY);
    const initialConfig = this.mergeConfig(
      DEFAULT_CONFIG,
      persistedConfig ?? {}
    );

    this.config = this.mergeConfig(initialConfig, config || {});
    this.persist();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<ServiceConfig>): ServiceConfigManager {
    if (!ServiceConfigManager.instance) {
      ServiceConfigManager.instance = new ServiceConfigManager(config);
    }
    return ServiceConfigManager.instance;
  }

  /**
   * Get current configuration
   */
  getConfig(): ServiceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (only for development/testing)
   */
  updateConfig(updates: Partial<ServiceConfig>): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Configuration updates are not allowed in production');
    }
    this.config = this.mergeConfig(this.config, updates);
    this.persist();
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig() {
    return this.config.database;
  }

  /**
   * Get agents configuration
   */
  getAgentsConfig() {
    return this.config.agents;
  }

  /**
   * Get tools configuration
   */
  getToolsConfig() {
    return this.config.tools;
  }

  /**
   * Get logging configuration
   */
  getLoggingConfig() {
    return this.config.logging;
  }

  /**
   * Deep merge configuration objects
   */
  private mergeConfig(
    base: ServiceConfig,
    overrides: Partial<ServiceConfig>
  ): ServiceConfig {
    return {
      database: { ...base.database, ...overrides.database },
      agents: { ...base.agents, ...overrides.agents },
      tools: { ...base.tools, ...overrides.tools },
      logging: { ...base.logging, ...overrides.logging },
    };
  }
  private persist(): void {
    this.store.set(ServiceConfigManager.STORE_KEY, this.config);
  }

  /**
   * Validate configuration values
   */
  validateConfig(config: ServiceConfig): void {
    // Database validation
    if (config.database.maxConnections < 1 || config.database.maxConnections > 100) {
      throw new Error('Database maxConnections must be between 1 and 100');
    }

    if (config.database.connectionTimeout < 1000) {
      throw new Error('Database connectionTimeout must be at least 1000ms');
    }

    if (config.database.queryTimeout < 1000) {
      throw new Error('Database queryTimeout must be at least 1000ms');
    }

    // Agents validation
    if (config.agents.maxConcurrent < 1 || config.agents.maxConcurrent > 20) {
      throw new Error('Agents maxConcurrent must be between 1 and 20');
    }

    if (config.agents.defaultTimeout < 10000) {
      throw new Error('Agents defaultTimeout must be at least 10000ms');
    }

    if (config.agents.maxIterations < 1 || config.agents.maxIterations > 1000) {
      throw new Error('Agents maxIterations must be between 1 and 1000');
    }

    // Tools validation
    if (config.tools.defaultTimeout < 1000) {
      throw new Error('Tools defaultTimeout must be at least 1000ms');
    }

    // Logging validation
    if (config.logging.maxLogSize < 100 || config.logging.maxLogSize > 10000) {
      throw new Error('Logging maxLogSize must be between 100 and 10000');
    }
  }

  /**
   * Export configuration for debugging
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Reset configuration to defaults (development only)
   */
  resetToDefaults(): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Configuration reset is not allowed in production');
    }
    this.config = { ...DEFAULT_CONFIG };
    this.persist();
  }
}

/**
 * Initialize service configuration with environment-based overrides
 */
export function initializeServiceConfig(): ServiceConfigManager {
  const configManager = ServiceConfigManager.getInstance();

  // Validate configuration
  configManager.validateConfig(configManager.getConfig());

  return configManager;
}
