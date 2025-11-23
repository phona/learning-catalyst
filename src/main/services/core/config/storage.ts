import * as path from 'path';
import * as fs from 'fs/promises';
import type { AppConfig } from '@/shared/types/config';

export const createConfigStorage = (workspace: string) => {
  const configFilePath = path.join(workspace, 'config.json');

  return {
    async loadConfig(): Promise<AppConfig | null> {
      if (!(await fs.stat(configFilePath).catch(() => false))) {
        return null;
      }

      const configData = await fs.readFile(configFilePath, 'utf-8');
      const config = JSON.parse(configData) as AppConfig;
      return config;
    },

    async saveConfig(config: AppConfig): Promise<void> {
      // Ensure directory exists
      const configDir = path.dirname(configFilePath);
      await fs.mkdir(configDir, { recursive: true });

      // Write config to file
      const configJson = JSON.stringify(config, null, 2);
      await fs.writeFile(configFilePath, configJson, 'utf-8');
    },

    async getConfigPath(): Promise<string> {
      return configFilePath;
    },
  };
};

export type ConfigStorage = ReturnType<typeof createConfigStorage>;
