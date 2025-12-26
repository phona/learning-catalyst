/**
 * Settings & Configuration IPC Handlers
 *
 * Implements the documented settings domain and helpers from
 * docs/DEVELOPER-GUIDE/electron-api.md.
 */

import { ipcMain, app } from 'electron';
import { AVAILABLE_PROVIDERS } from '@/shared/types/config';
import type { AppConfig, ProviderConfig } from '@/shared/types';
import { ConfigService } from '../services/core/config/config-service';

type UserPreferences = Record<string, any>;
type LearningSettings = Record<string, any>;

let userPreferences: UserPreferences = {
  theme: 'light',
  language: 'en',
  notifications: true,
};

let learningSettings: LearningSettings = {
  preferredDifficulty: 'intermediate',
  learningStyle: 'visual',
  sessionDuration: 45,
};

const configuredProviders: Record<string, ProviderConfig> = {};

export const setupSettingsHandlers = (
  ipcMainInstance: typeof ipcMain,
  deps: {
    configService: ConfigService;
    app?: {
      getVersion: () => string;
      quit: () => void;
    };
  },
): void => {
  const configService = deps.configService;
  const appInstance = deps.app ?? app;

  ipcMainInstance.handle('settings:get-user-preferences', async () => userPreferences);

  ipcMainInstance.handle(
    'settings:update-preferences',
    async (_event, preferences: Partial<UserPreferences>) => {
      userPreferences = { ...userPreferences, ...preferences };
      const changes = Object.keys(preferences ?? {});
      return { updatedSettings: userPreferences, changes };
    },
  );

  ipcMainInstance.handle('settings:getAvailableProviders', async () => {
    const providers = AVAILABLE_PROVIDERS;
    const summary = {
      total: providers.length,
      connected: providers.length, // placeholder until provider health is wired
      configured: Object.keys(configuredProviders).length,
    };
    return { providers, summary };
  });

  ipcMainInstance.handle(
    'settings:configureProvider',
    async (_event, params: { provider: string; config: ProviderConfig }) => {
      configuredProviders[params.provider] = params.config;
      return { providerId: params.provider, status: 'configured' };
    },
  );

  ipcMainInstance.handle('settings:get-learning-settings', async () => learningSettings);

  ipcMainInstance.handle(
    'settings:update-learning-settings',
    async (_event, settings: Partial<LearningSettings>) => {
      learningSettings = { ...learningSettings, ...settings };
      const impact = Object.keys(settings ?? {});
      return { updatedSettings: learningSettings, impact };
    },
  );

  ipcMainInstance.handle('settings:getWorkspaceConfig', async () => {
    const cfg = await configService.getConfig();
    return cfg;
  });

  ipcMainInstance.handle('settings:setWorkspaceConfig', async (_event, config: Partial<AppConfig>) => {
    await configService.setConfig(config);
    return undefined;
  });

  ipcMainInstance.handle('settings:getAppVersion', async () => appInstance.getVersion());

  ipcMainInstance.handle('settings:quitApp', async () => {
    appInstance.quit();
    return undefined;
  });
};
