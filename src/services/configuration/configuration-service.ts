/**
 * Mock Configuration Service
 *
 * A mock implementation of the ConfigurationService for integration testing.
 * This simulates configuration management operations including getting,
 * setting, and persisting application configuration.
 */

import { vi } from 'vitest';

export class ConfigurationService {
  private configCache = new Map<string, any>();
  private configPath = '';

  constructor() {
    // Initialize with some default configuration
    this.configCache.set('ai.provider', 'openai');
    this.configCache.set('ai.model', 'gpt-3.5-turbo');
    this.configCache.set('ui.theme', 'dark');
    this.configCache.set('ui.language', 'en');
  }

  async getConfiguration(key?: string): Promise<any> {
    if (key) {
      // Get specific configuration value
      if (window.electronAPI?.dbFetchOne) {
        const result = await window.electronAPI.dbFetchOne(
          'SELECT * FROM settings WHERE key = ?',
          [key]
        );

        if (result.success && result.result) {
          const value = this.parseValue(result.result.value, result.result.data_type);
          this.configCache.set(key, value);
          return value;
        }
      }

      // Return from cache or default
      return this.configCache.get(key);
    } else {
      // Get all configuration
      if (window.electronAPI?.dbFetchAll) {
        const result = await window.electronAPI.dbFetchAll(
          'SELECT * FROM settings',
          []
        );

        if (result.success) {
          const config: any = {};
          result.result.forEach((setting: any) => {
            const value = this.parseValue(setting.value, setting.data_type);
            config[setting.key] = value;
            this.configCache.set(setting.key, value);
          });
          return config;
        }
      }

      // Return from cache
      const config: any = {};
      this.configCache.forEach((value, key) => {
        config[key] = value;
      });
      return config;
    }
  }

  async setConfiguration(key: string, value: any, dataType?: string): Promise<void> {
    // Determine data type if not provided
    if (!dataType) {
      dataType = typeof value === 'number' ? 'number' :
                  typeof value === 'boolean' ? 'boolean' :
                  typeof value === 'object' ? 'json' :
                  'string';
    }

    // Store in cache
    this.configCache.set(key, value);

    // Persist to database
    if (window.electronAPI?.dbExecuteQuery) {
      const stringValue = this.stringifyValue(value, dataType);
      await window.electronAPI.dbExecuteQuery(
        expect.stringContaining('INSERT OR REPLACE INTO settings'),
        expect.arrayContaining([key, stringValue, dataType])
      );
    }
  }

  async deleteConfiguration(key: string): Promise<boolean> {
    // Remove from cache
    const existed = this.configCache.has(key);
    this.configCache.delete(key);

    // Remove from database
    if (window.electronAPI?.dbExecuteQuery) {
      const result = await window.electronAPI.dbExecuteQuery(
        'DELETE FROM settings WHERE key = ?',
        [key]
      );

      return result.success;
    }

    return existed;
  }

  async resetConfiguration(): Promise<void> {
    // Clear cache
    this.configCache.clear();

    // Clear database
    if (window.electronAPI?.dbExecuteQuery) {
      await window.electronAPI.dbExecuteQuery('DELETE FROM settings', []);
    }

    // Set defaults
    await this.setDefaults();
  }

  async setDefaults(): Promise<void> {
    const defaults = {
      'ai.provider': 'openai',
      'ai.model': 'gpt-3.5-turbo',
      'ai.temperature': 0.7,
      'ai.maxTokens': 2000,
      'ui.theme': 'dark',
      'ui.language': 'en',
      'ui.fontSize': 'medium',
      'ui.sidebarCollapsed': false,
      'learning.dailyGoal': 30, // minutes
      'learning.reminderEnabled': true,
      'learning.reminderTime': '09:00',
      'privacy.anonymousUsage': true,
      'privacy.crashReporting': false
    };

    for (const [key, value] of Object.entries(defaults)) {
      await this.setConfiguration(key, value);
    }
  }

  async exportConfiguration(): Promise<string> {
    const config = await this.getConfiguration();
    return JSON.stringify(config, null, 2);
  }

  async importConfiguration(configJson: string): Promise<void> {
    try {
      const config = JSON.parse(configJson);

      for (const [key, value] of Object.entries(config)) {
        await this.setConfiguration(key, value);
      }
    } catch (error) {
      throw new Error('Invalid configuration JSON format');
    }
  }

  async validateConfiguration(key: string, value: any): Promise<{
    isValid: boolean;
    errors?: string[];
  }> {
    const errors: string[] = [];

    // AI configuration validation
    if (key.startsWith('ai.')) {
      if (key === 'ai.provider') {
        const validProviders = ['openai', 'anthropic', 'chatglm', 'deepseek', 'siliconflow'];
        if (!validProviders.includes(value)) {
          errors.push(`Invalid AI provider: ${value}. Valid options: ${validProviders.join(', ')}`);
        }
      }

      if (key === 'ai.temperature') {
        if (typeof value !== 'number' || value < 0 || value > 2) {
          errors.push('AI temperature must be a number between 0 and 2');
        }
      }

      if (key === 'ai.maxTokens') {
        if (typeof value !== 'number' || value < 1 || value > 32000) {
          errors.push('AI max tokens must be a number between 1 and 32000');
        }
      }
    }

    // UI configuration validation
    if (key.startsWith('ui.')) {
      if (key === 'ui.theme') {
        const validThemes = ['light', 'dark', 'auto'];
        if (!validThemes.includes(value)) {
          errors.push(`Invalid theme: ${value}. Valid options: ${validThemes.join(', ')}`);
        }
      }

      if (key === 'ui.language') {
        const validLanguages = ['en', 'zh', 'es', 'fr', 'de', 'ja'];
        if (!validLanguages.includes(value)) {
          errors.push(`Invalid language: ${value}. Valid options: ${validLanguages.join(', ')}`);
        }
      }
    }

    // Learning configuration validation
    if (key.startsWith('learning.')) {
      if (key === 'learning.dailyGoal') {
        if (typeof value !== 'number' || value < 1 || value > 480) {
          errors.push('Daily goal must be a number between 1 and 480 minutes');
        }
      }

      if (key === 'learning.reminderTime') {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(value)) {
          errors.push('Reminder time must be in HH:MM format');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  async getConfigSchema(): Promise<any> {
    return {
      ai: {
        provider: {
          type: 'string',
          enum: ['openai', 'anthropic', 'chatglm', 'deepseek', 'siliconflow'],
          default: 'openai',
          description: 'AI provider to use for chat'
        },
        model: {
          type: 'string',
          default: 'gpt-3.5-turbo',
          description: 'AI model to use'
        },
        temperature: {
          type: 'number',
          min: 0,
          max: 2,
          default: 0.7,
          description: 'AI response temperature (0-2)'
        },
        maxTokens: {
          type: 'number',
          min: 1,
          max: 32000,
          default: 2000,
          description: 'Maximum tokens per response'
        }
      },
      ui: {
        theme: {
          type: 'string',
          enum: ['light', 'dark', 'auto'],
          default: 'dark',
          description: 'Application theme'
        },
        language: {
          type: 'string',
          enum: ['en', 'zh', 'es', 'fr', 'de', 'ja'],
          default: 'en',
          description: 'Interface language'
        },
        fontSize: {
          type: 'string',
          enum: ['small', 'medium', 'large'],
          default: 'medium',
          description: 'Font size'
        }
      },
      learning: {
        dailyGoal: {
          type: 'number',
          min: 1,
          max: 480,
          default: 30,
          description: 'Daily learning goal in minutes'
        },
        reminderEnabled: {
          type: 'boolean',
          default: true,
          description: 'Enable learning reminders'
        },
        reminderTime: {
          type: 'string',
          pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
          default: '09:00',
          description: 'Daily reminder time (HH:MM)'
        }
      }
    };
  }

  // Private helper methods
  private parseValue(value: string, dataType: string): any {
    switch (dataType) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true';
      case 'json':
        return JSON.parse(value);
      default:
        return value;
    }
  }

  private stringifyValue(value: any, dataType: string): string {
    switch (dataType) {
      case 'json':
        return JSON.stringify(value);
      default:
        return String(value);
    }
  }

  // Test helper methods
  _clearCache(): void {
    this.configCache.clear();
  }

  _setConfigPath(path: string): void {
    this.configPath = path;
  }

  _getCache(): Map<string, any> {
    return new Map(this.configCache);
  }
}