/**
 * Configuration Service
 *
 * Service for managing application configuration.
 */

export interface ConfigurationValue {
  key: string;
  value: unknown;
  dataType: 'string' | 'number' | 'boolean' | 'json';
  lastModified: Date;
}

export interface ConfigurationSection {
  [key: string]: unknown;
}

/**
 * Configuration Service for managing application settings
 */
export class ConfigurationService {
  private cache: Map<string, ConfigurationValue> = new Map();

  /**
   * Get configuration value
   */
  async getConfiguration(key?: string): Promise<ConfigurationValue | Record<string, ConfigurationValue>> {
    // Mock implementation for testing
    if (key) {
      const mockValue: ConfigurationValue = {
        key,
        value: key === 'ai.provider' ? 'openai' : 'default_value',
        dataType: 'string',
        lastModified: new Date()
      };
      return mockValue;
    }

    // Return all configuration if no key specified
    const allConfig: Record<string, ConfigurationValue> = {
      'ai.provider': {
        key: 'ai.provider',
        value: 'openai',
        dataType: 'string',
        lastModified: new Date()
      },
      'ai.model': {
        key: 'ai.model',
        value: 'gpt-3.5-turbo',
        dataType: 'string',
        lastModified: new Date()
      }
    };

    return allConfig;
  }

  /**
   * Set configuration value
   */
  async setConfiguration(key: string, value: unknown, dataType?: string): Promise<boolean> {
    try {
      // Mock implementation for testing
      const configValue: ConfigurationValue = {
        key,
        value,
        dataType: (dataType as any) || typeof value,
        lastModified: new Date()
      };

      this.cache.set(key, configValue);

      // Simulate IPC call to main process
      if (window.electronAPI?.setConfig) {
        await window.electronAPI.setConfig(key, value);
      }

      return true;
    } catch (error) {
      console.error('Failed to set configuration:', error);
      return false;
    }
  }

  /**
   * Get configuration section
   */
  async getConfigurationSection(section: string): Promise<ConfigurationSection> {
    // Mock implementation
    const sections: Record<string, ConfigurationSection> = {
      ai: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 2048
      },
      ui: {
        theme: 'dark',
        language: 'en',
        fontSize: 14
      },
      learning: {
        dailyGoal: 60, // minutes
        reminderEnabled: true,
        autoSave: true
      }
    };

    return sections[section] || {};
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfiguration(section?: string): Promise<boolean> {
    try {
      // Mock implementation
      if (section) {
        // Reset specific section
        console.log(`Resetting configuration section: ${section}`);
      } else {
        // Reset all configuration
        this.cache.clear();
        console.log('Resetting all configuration');
      }

      return true;
    } catch (error) {
      console.error('Failed to reset configuration:', error);
      return false;
    }
  }

  /**
   * Export configuration
   */
  async exportConfiguration(format: 'json' = 'json'): Promise<string> {
    const config = await this.getConfiguration();

    if (format === 'json') {
      return JSON.stringify(config, null, 2);
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Import configuration
   */
  async importConfiguration(configData: string, format: 'json' = 'json'): Promise<boolean> {
    try {
      if (format === 'json') {
        const config = JSON.parse(configData);

        // Apply configuration
        for (const [key, value] of Object.entries(config)) {
          await this.setConfiguration(key, value);
        }

        return true;
      }

      throw new Error(`Unsupported import format: ${format}`);
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  }

  /**
   * Validate configuration value
   */
  private validateConfigValue(key: string, value: unknown): boolean {
    // Mock validation logic
    const validations: Record<string, (value: unknown) => boolean> = {
      'ai.temperature': (v) => typeof v === 'number' && v >= 0 && v <= 2,
      'ai.maxTokens': (v) => typeof v === 'number' && v > 0,
      'ui.fontSize': (v) => typeof v === 'number' && v >= 8 && v <= 32,
      'learning.dailyGoal': (v) => typeof v === 'number' && v > 0
    };

    const validator = validations[key];
    return validator ? validator(value) : true;
  }

  /**
   * Get cached configuration value
   */
  getCachedValue(key: string): ConfigurationValue | undefined {
    return this.cache.get(key);
  }

  /**
   * Clear configuration cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}