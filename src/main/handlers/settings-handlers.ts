/**
 * Settings & Configuration IPC Handlers
 *
 * Implements the documented settings domain and helpers from
 * docs/DEVELOPER-GUIDE/electron-api.md.
 */

import { ipcMain, app } from 'electron';
import { access, mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { AVAILABLE_PROVIDERS } from '@/shared/types/config';
import type { AppConfig, ProviderConfig } from '@/shared/types/config';
import type { APIResponse } from '@/shared/types/electron-api';

const CONFIG_REL_PATH = join('.catalyst', 'config.json');
let workspaceRoot = process.cwd();
let cachedConfig: AppConfig | null = null;

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

const getConfigPath = (): string => join(workspaceRoot, CONFIG_REL_PATH);

const ensureConfigDir = async (): Promise<void> => {
  const dir = dirname(getConfigPath());
  await mkdir(dir, { recursive: true });
};

const loadConfigFromDisk = async (): Promise<AppConfig | null> => {
  try {
    const path = getConfigPath();
    await access(path);
    const content = await readFile(path, 'utf-8');
    const parsed = JSON.parse(content) as AppConfig;
    cachedConfig = parsed;
    return parsed;
  } catch {
    return null;
  }
};

const saveConfigToDisk = async (config: AppConfig): Promise<void> => {
  await ensureConfigDir();
  await writeFile(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
  cachedConfig = config;
};

export const setupSettingsHandlers = (workspacePath?: string): void => {
  workspaceRoot = workspacePath || process.cwd();

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
    const providers = (AVAILABLE_PROVIDERS as unknown as string[]) ?? [];
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
    const cfg = cachedConfig ?? (await loadConfigFromDisk());
    return ok(cfg);
  });

  ipcMain.handle('settings:setWorkspaceConfig', async (_event, config: AppConfig) => {
    try {
      await saveConfigToDisk(config);
      return ok(undefined);
    } catch (error) {
      return fail('settings.config_write_failed', 'Unable to save workspace config', error);
    }
  });

  ipcMain.handle('settings:getAppVersion', async () => ok(app.getVersion()));

  ipcMain.handle('settings:quitApp', async () => {
    app.quit();
    return ok(undefined);
  });
};
