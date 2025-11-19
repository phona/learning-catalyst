// TO AI: Don't modify this file, it's checked by me.
import type { AppConfig, ProviderConfig } from '@/shared/types/config';
import { ConfigStorage } from './storage';
import { LoggerService } from '../logger/logger-service';
import { merge } from 'lodash';

type DeepPaths<T> = T extends object
  ? {
      [K in Extract<keyof T, string>]: T[K] extends object
        ? `${K}` | `${K}.${DeepPaths<T[K]>}`
        : `${K}`;
    }[Extract<keyof T, string>]
  : never;

type PathValue<T, P extends string> = P extends `${infer Head}.${infer Tail}`
  ? Head extends keyof T
    ? PathValue<T[Head], Tail>
    : undefined
  : P extends keyof T
  ? T[P]
  : undefined;

type ConfigPath = DeepPaths<AppConfig>;

/**
 * Functional config service factory
 */
export const createConfigService = ({
  storage,
  logger
}: {
  storage: ConfigStorage;
  logger: LoggerService;
}) => {
  let cachedConfig: AppConfig | null = null;
  const listeners = new Set<(config: AppConfig) => void>();
  const emitConfigChanged = (config: AppConfig) => {
    listeners.forEach((listener) => {
      try {
        listener(config);
      } catch (error) {
        logger.error('Config change listener threw', error);
      }
    });
  };

  const service = {
    /**
     * Get the full configuration
     */
    getConfig: async (): Promise<AppConfig | null> => {
      if (cachedConfig) {
        return cachedConfig;
      }

      cachedConfig = await storage.loadConfig();
      return cachedConfig;
    },

    /**
     * Set the full configuration
     */
    setConfig: async (config: Partial<AppConfig>): Promise<void> => {
      const currentConfig = await service.getConfig();

      // If no current config exists, use the new config directly
      if (!currentConfig) {
        await storage.saveConfig(config as AppConfig);
        return;
      }

      // Recursively merge current config with new config (new config takes precedence)
      const newConfig = merge({}, currentConfig, config);
      await storage.saveConfig(newConfig);
      cachedConfig = newConfig;
      emitConfigChanged(newConfig);
    },

    /**
     * Get a nested config value referenced by a dot path (e.g., 'ai.contentAnalysisModel')
     */
    get: async <Path extends ConfigPath>(key: Path): Promise<PathValue<AppConfig, Path> | undefined> => {
      const config = await service.getConfig();
      if (!config) {
        return undefined;
      }
      const segments = key.split('.');
      return segments.reduce<any>((current, segment) => {
        if (current == null) {
          return undefined;
        }
        return current[segment];
      }, config);
    },

    /**
     * Get provider-specific configuration
     */
    getProviderConfig: async (name: string): Promise<ProviderConfig | undefined> => {
      const config = await service.getConfig();
      if (!config || !config.ai || !config.ai.providers) {
        return undefined;
      }

      return config.ai.providers[name];
    },

    /**
     * Set provider-specific configuration
     */
    setProviderConfig: async (name: string, config: Partial<ProviderConfig>): Promise<void> => {
      logger.info(`Setting provider config for: ${name}`, { config });
      const currentConfig = await service.getConfig();

      // Handle null config case
      if (!currentConfig) {
        logger.warn('Current config is null, cannot set provider config');
        return;
      }

      // Use merge to ensure structure exists and merge provider config
      const updatedConfig = merge({}, currentConfig, {
        ai: {
          providers: {
            [name]: config
          }
        }
      });

      await service.setConfig(updatedConfig);
    },

    onConfigChanged: (listener: (config: AppConfig) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /**
     * Check if initial setup is complete (chat model configured)
     */
    isSetupComplete: async (): Promise<boolean> => {
      const config = await service.getConfig();
      if (!config || !config.ai || !config.ai.model_types) {
        return false;
      }

      // Check if chat model is configured
      const chatConfig = config.ai.model_types.chat;
      if (!chatConfig || !chatConfig.provider || !chatConfig.model) {
        return false;
      }

      return true;
    }
  };

  return service;
};

export type ConfigService = ReturnType<typeof createConfigService>;
