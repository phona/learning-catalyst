/**
 * Settings & Configuration IPC Handlers
 *
 * IPC handlers for application settings, user preferences,
 * configuration management, and system options.
 */

import { ipcMain } from 'electron';
import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { getCatalystService } from '../services/catalyst/catalyst-service';
import { LoggerFactory } from '../services/logger';
import { ServiceError } from '../services/types';
import { AppConfig } from '../../shared/types/config';

// Store workspace path for config operations
let globalWorkspacePath: string = '';

/**
 * Setup settings and configuration IPC handlers
 */
export function setupSettingsHandlers(workspacePath?: string): void {
  globalWorkspacePath = workspacePath || process.cwd();
  const loggerFactory = LoggerFactory.getInstance();
  const logger = loggerFactory.createContextAwareLogger();

  // Workspace configuration helper functions
  async function loadWorkspaceConfig(): Promise<AppConfig | null> {
    const configPath = join(globalWorkspacePath, '.catalyst', 'config.json');

    try {
      await access(configPath);
      const configContent = await readFile(configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      return null;
    }
  }

  async function saveWorkspaceConfig(config: AppConfig): Promise<void> {
    const configPath = join(globalWorkspacePath, '.catalyst', 'config.json');

    try {
      const catalystDir = dirname(configPath);
      await mkdir(catalystDir, { recursive: true });
      await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save workspace config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  function setNestedValue(obj: any, path: string, value: any): any {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
    return obj;
  }

  function deleteNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => current?.[key], obj);

    if (target && target.hasOwnProperty(lastKey)) {
      delete target[lastKey];
    }

    return obj;
  }

  /**
   * Get user preferences
   */
  ipcMain.handle('settings:getPreferences', async () => {
    logger.info('Getting user preferences');

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'SettingsHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        'system',
        'settings:getPreferences',
        async () => {
          // Mock user preferences
          const preferences = {
            profile: {
              username: 'Learning User',
              email: 'user@example.com',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
              timezone: 'America/New_York',
              language: 'en'
            },
            learning: {
              defaultDifficulty: 'intermediate',
              preferredLearningStyle: 'visual',
              sessionDuration: 45, // minutes
              autoSaveProgress: true,
              enableReminders: true,
              dailyGoal: 60, // minutes
              weeklyGoal: 300, // minutes
              enableSpacedRepetition: true,
              showDetailedFeedback: true
            },
            appearance: {
              theme: 'dark',
              fontSize: 'medium',
              fontFamily: 'Inter',
              primaryColor: '#3b82f6',
              accentColor: '#10b981',
              enableAnimations: true,
              compactMode: false,
              showLineNumbers: true,
              enableSyntaxHighlighting: true
            },
            notifications: {
              enableEmailNotifications: false,
              enablePushNotifications: true,
              reminderFrequency: 'daily',
              achievementNotifications: true,
              streakNotifications: true,
              weeklyProgressReports: true,
              quietHours: {
                enabled: true,
                start: '22:00',
                end: '08:00'
              }
            },
            privacy: {
              shareProgressStats: false,
              enableAnalytics: true,
              dataRetention: '1year',
              allowCrashReporting: true,
              encryptLocalData: false,
              shareAchievements: true
            },
            ai: {
              preferredProvider: 'openai',
              defaultModel: 'gpt-3.5-turbo',
              temperature: 0.7,
              maxTokens: 1000,
              enableThinking: true,
              conversationStyle: 'educational',
              responseLength: 'medium',
              technicalLevel: 'intermediate'
            },
            advanced: {
              enableDeveloperMode: false,
              showDebugInfo: false,
              enableExperimentalFeatures: false,
              customApiEndpoints: {},
              cacheSize: 100, // MB
              maxConcurrentSessions: 3,
              logLevel: 'warn'
            },
            metadata: {
              lastUpdated: new Date().toISOString(),
              version: '1.0.0',
              backupEnabled: true,
              syncEnabled: false
            }
          };

          return {
            success: true,
            preferences
          };
        },
        {
          operation: 'settings:getPreferences',
          source: 'ipc_handler'
        }
      );

      return result;

    } catch (error) {
      logger.error('Failed to get user preferences', error as Error);
      throw error;
    }
  });

  /**
   * Update user preferences
   */
  ipcMain.handle('settings:updatePreferences', async (event, updates) => {
    logger.info('Updating user preferences', {
      categories: Object.keys(updates)
    });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'SettingsHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        'system',
        'settings:updatePreferences',
        async () => {
          // Mock preference update
          const changes = Object.keys(updates);
          const updatedSettings = {
            ...updates,
            metadata: {
              lastUpdated: new Date().toISOString(),
              updatedBy: 'user',
              version: '1.0.0'
            }
          };

          return {
            success: true,
            updatedSettings,
            changes: changes.map(category => `${category} updated`),
            summary: {
              totalChanges: changes.length,
              categories: changes,
              appliedAt: new Date().toISOString()
            }
          };
        },
        {
          operation: 'settings:updatePreferences',
          categories: Object.keys(updates),
          source: 'ipc_handler'
        }
      );

      return result;

    } catch (error) {
      logger.error('Failed to update user preferences', error as Error, updates);
      throw error;
    }
  });

  /**
   * Reset settings to defaults
   */
  ipcMain.handle('settings:resetDefaults', async () => {
    logger.info('Resetting settings to defaults');

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'SettingsHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        'system',
        'settings:resetDefaults',
        async () => {
          // Mock reset to defaults
          const defaultSettings = {
            theme: 'light',
            fontSize: 'medium',
            sessionDuration: 30,
            dailyGoal: 45,
            weeklyGoal: 225,
            enableNotifications: true,
            enableAnalytics: true,
            autoSaveProgress: true,
            preferredLearningStyle: 'mixed',
            defaultDifficulty: 'beginner'
          };

          return {
            success: true,
            defaultSettings,
            resetCategories: Object.keys(defaultSettings),
            resetAt: new Date().toISOString(),
            backupCreated: true
          };
        },
        {
          operation: 'settings:resetDefaults',
          source: 'ipc_handler'
        }
      );

      return result;

    } catch (error) {
      logger.error('Failed to reset settings to defaults', error as Error);
      throw error;
    }
  });

  /**
   * Export settings
   */
  ipcMain.handle('settings:export', async (event, params) => {
    logger.info('Exporting settings', {
      format: params.format || 'json',
      includePrivate: params.includePrivate || false
    });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'SettingsHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        'system',
        'settings:export',
        async () => {
          // Mock settings export
          const exportData = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            format: params.format || 'json',
            includePrivate: params.includePrivate || false,
            settings: {
              // Mock exported settings (excluding private data if not requested)
              appearance: {
                theme: 'dark',
                fontSize: 'medium',
                fontFamily: 'Inter'
              },
              learning: {
                defaultDifficulty: 'intermediate',
                sessionDuration: 45,
                dailyGoal: 60
              },
              notifications: {
                enablePushNotifications: true,
                reminderFrequency: 'daily'
              }
            },
            metadata: {
              totalCategories: 3,
              exportedBy: 'user_request',
              checksum: 'abc123def456'
            }
          };

          if (params.includePrivate) {
            // Include private data in export
            exportData.settings.private = {
              apiKey: '***hidden***',
              personalData: '***hidden***'
            };
          }

          return {
            success: true,
            exportData,
            filename: `learning-catalyst-settings-${new Date().toISOString().split('T')[0]}.${params.format || 'json'}`,
            size: JSON.stringify(exportData).length // bytes
          };
        },
        {
          operation: 'settings:export',
          format: params.format,
          source: 'ipc_handler'
        }
      );

      return result;

    } catch (error) {
      logger.error('Failed to export settings', error as Error, params);
      throw error;
    }
  });

  /**
   * Import settings
   */
  ipcMain.handle('settings:import', async (event, params) => {
    logger.info('Importing settings', {
      source: params.source,
      merge: params.merge
    });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'SettingsHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        'system',
        'settings:import',
        async () => {
          // Mock settings import
          const importResult = {
            importedAt: new Date().toISOString(),
            source: params.source,
            merge: params.merge,
            status: 'success',
            importedCategories: ['appearance', 'learning'],
            conflicts: [],
            warnings: [
              'AI provider settings not imported (security restriction)'
            ],
            appliedChanges: {
              appearance: {
                theme: 'light',
                fontSize: 'large'
              },
              learning: {
                defaultDifficulty: 'advanced',
                sessionDuration: 60
              }
            },
            summary: {
              totalSettings: 4,
              successfulImports: 4,
              conflicts: 0,
              warnings: 1,
              backupCreated: true
            }
          };

          return {
            success: true,
            importResult
          };
        },
        {
          operation: 'settings:import',
          source: 'ipc_handler',
          sourceType: params.sourceType,
          originalSource: params.source
        }
      );

      return result;

    } catch (error) {
      logger.error('Failed to import settings', error as Error, params);
      throw error;
    }
  });

  /**
   * Get system information
   */
  ipcMain.handle('settings:getSystemInfo', async () => {
    logger.info('Getting system information');

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'SettingsHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        'system',
        'settings:getSystemInfo',
        async () => {
          // Mock system information
          const systemInfo = {
            application: {
              name: 'Learning Catalyst',
              version: '1.0.0',
              build: '2024.01.15.1430',
              environment: 'production',
              electronVersion: '28.0.0',
              nodeVersion: '18.17.0'
            },
            system: {
              platform: process.platform,
              arch: process.arch,
              osVersion: 'Windows 10',
              cpuCount: 8,
              totalMemory: 16384, // MB
              freeMemory: 8192, // MB
              diskSpace: {
                total: 512000, // MB
                free: 256000 // MB
              }
            },
            performance: {
              startupTime: 2.3, // seconds
              memoryUsage: 128, // MB
              activeSessions: 2,
              uptime: 86400, // seconds
              cacheSize: 45.6 // MB
            },
            services: {
              aiProviders: {
                openai: { connected: true, latency: 250 },
                anthropic: { connected: false, latency: null },
                local: { connected: true, latency: 100 }
              },
              database: {
                connected: true,
                size: 156.7, // MB
                lastBackup: new Date(Date.now() - 86400000).toISOString()
              },
              vectorDatabase: {
                connected: true,
                collections: 3,
                vectors: 15420
              }
            },
            security: {
              encryptionEnabled: false,
              secureStorage: true,
              autoBackup: true,
              lastSecurityUpdate: new Date(Date.now() - 604800000).toISOString()
            },
            metadata: {
              collectedAt: new Date().toISOString(),
              nextUpdate: new Date(Date.now() + 300000).toISOString()
            }
          };

          return {
            success: true,
            systemInfo
          };
        },
        {
          operation: 'settings:getSystemInfo',
          source: 'ipc_handler'
        }
      );

      return result;

    } catch (error) {
      logger.error('Failed to get system information', error as Error);
      throw error;
    }
  });

  // Workspace configuration handlers (consolidated from config-handlers.ts)

  /**
   * Get workspace configuration
   */
  ipcMain.handle('settings:getWorkspaceConfig', async () => {
    logger.info('Getting workspace configuration');
    try {
      return await loadWorkspaceConfig();
    } catch (error) {
      logger.error('Failed to get workspace config', error as Error);
      throw error;
    }
  });

  /**
   * Set workspace configuration
   */
  ipcMain.handle('settings:setWorkspaceConfig', async (_, config: AppConfig) => {
    logger.info('Setting workspace configuration');
    try {
      await saveWorkspaceConfig(config);
    } catch (error) {
      logger.error('Failed to set workspace config', error as Error);
      throw error;
    }
  });

  /**
   * Get specific workspace configuration key
   */
  ipcMain.handle('settings:getWorkspaceConfigKey', async (_, key: string) => {
    logger.info('Getting workspace config key', { key });
    try {
      const config = await loadWorkspaceConfig();
      return getNestedValue(config, key);
    } catch (error) {
      logger.error('Failed to get workspace config key', error as Error);
      throw error;
    }
  });

  /**
   * Set specific workspace configuration key
   */
  ipcMain.handle('settings:setWorkspaceConfigKey', async (_, key: string, value: any) => {
    logger.info('Setting workspace config key', { key });
    try {
      const config = await loadWorkspaceConfig() || {};
      const updatedConfig = setNestedValue(config, key, value);
      await saveWorkspaceConfig(updatedConfig);
    } catch (error) {
      logger.error('Failed to set workspace config key', error as Error);
      throw error;
    }
  });

  /**
   * Delete workspace configuration key
   */
  ipcMain.handle('settings:deleteWorkspaceConfigKey', async (_, key: string) => {
    logger.info('Deleting workspace config key', { key });
    try {
      const config = await loadWorkspaceConfig();
      if (config) {
        const updatedConfig = deleteNestedValue(config, key);
        await saveWorkspaceConfig(updatedConfig);
      }
    } catch (error) {
      logger.error('Failed to delete workspace config key', error as Error);
      throw error;
    }
  });

  /**
   * Reset workspace configuration
   */
  ipcMain.handle('settings:resetWorkspaceConfig', async () => {
    logger.info('Resetting workspace configuration');
    try {
      const configPath = join(globalWorkspacePath, '.catalyst', 'config.json');
      await access(configPath);
      const fs = await import('fs/promises');
      await fs.unlink(configPath);
      return await loadWorkspaceConfig();
    } catch (error) {
      logger.error('Failed to reset workspace config', error as Error);
      throw error;
    }
  });

  // Application utility handlers (consolidated from app-handlers.ts)

  /**
   * Get application version
   */
  ipcMain.handle('settings:getAppVersion', () => {
    logger.info('Getting application version');
    const app = require('electron').app;
    return app.getVersion();
  });

  /**
   * Get user data path
   */
  ipcMain.handle('settings:getUserDataPath', () => {
    logger.info('Getting user data path');
    const app = require('electron').app;
    return app.getPath('userData');
  });

  /**
   * Get documents path
   */
  ipcMain.handle('settings:getDocumentsPath', () => {
    logger.info('Getting documents path');
    const app = require('electron').app;
    return app.getPath('documents');
  });

  /**
   * Get application path
   */
  ipcMain.handle('settings:getAppPath', () => {
    logger.info('Getting application path');
    const app = require('electron').app;
    return app.getAppPath();
  });

  /**
   * Quit application
   */
  ipcMain.handle('settings:quitApp', () => {
    logger.info('Quitting application');
    const app = require('electron').app;
    app.quit();
  });

  logger.info('✅ Settings handlers registered successfully');
}