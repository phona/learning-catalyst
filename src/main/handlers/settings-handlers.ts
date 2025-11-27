/**
 * Settings & Configuration IPC Handlers
 *
 * Implements the documented settings domain and helpers from
 * docs/DEVELOPER-GUIDE/electron-api.md.
 */

import { ipcMain, app } from 'electron';
import { AVAILABLE_PROVIDERS } from '@/shared/types/config';
import type { AppConfig, ProviderConfig } from '@/shared/types';
import type { APIResponse } from '@/shared/types';
import { ConfigService } from '../services/core/config/config-service';
import { IPC_ERROR_CODES } from '@/shared/types/ipc-error';

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

const ok = <T>(data?: T, metadata?: APIResponse<T>['metadata']): APIResponse<T> => ({
  success: true,
  data,
  metadata,
});

const fail = (code: string, message: string, details?: unknown): APIResponse<never> => ({
  success: false,
  error: { code, message, details },
});

export const setupSettingsHandlers = (deps: {
  configService: ConfigService;
}): void => {
  const configService = deps.configService;

  ipcMain.handle('settings:get-user-preferences', async () => ok(userPreferences));

  ipcMain.handle(
    'settings:update-preferences',
    async (_event, preferences: Partial<UserPreferences>) => {
      userPreferences = { ...userPreferences, ...preferences };
      const changes = Object.keys(preferences ?? {});
      return ok({ updatedSettings: userPreferences, changes });
    },
  );

  ipcMain.handle('settings:getAvailableProviders', async () => {
    const providers = AVAILABLE_PROVIDERS;
    const summary = {
      total: providers.length,
      connected: providers.length, // placeholder until provider health is wired
      configured: Object.keys(configuredProviders).length,
    };
    return ok({ providers, summary });
  });

  ipcMain.handle(
    'settings:configureProvider',
    async (_event, params: { provider: string; config: ProviderConfig }) => {
      configuredProviders[params.provider] = params.config;
      return ok({ providerId: params.provider, status: 'configured' });
    },
  );

  ipcMain.handle('settings:get-learning-settings', async () => ok(learningSettings));

  ipcMain.handle(
    'settings:update-learning-settings',
    async (_event, settings: Partial<LearningSettings>) => {
      learningSettings = { ...learningSettings, ...settings };
      const impact = Object.keys(settings ?? {});
      return ok({ updatedSettings: learningSettings, impact });
    },
  );

  ipcMain.handle('settings:getWorkspaceConfig', async () => {
    const cfg = await configService.getConfig();
    return ok(cfg);
  });

  ipcMain.handle('settings:setWorkspaceConfig', async (_event, config: Partial<AppConfig>) => {
    try {
      await configService.setConfig(config);
      return ok(undefined);
    } catch (error) {
      return fail(IPC_ERROR_CODES.settings.configWriteFailed, 'Unable to save workspace config', error);
    }
  });

  ipcMain.handle('settings:getAppVersion', async () => ok(app.getVersion()));

  ipcMain.handle('settings:quitApp', async () => {
    app.quit();
    return ok(undefined);
  });
};
