import type { AppConfig, ProviderConfig } from '@/shared/types';
import { ConfigStorage } from './storage';
import { LoggerService } from '../logger/logger-service';
import { merge } from 'lodash';

const DEFAULT_APP_CONFIG: AppConfig = {
  ai: {
    providers: {},
    modelTypes: {
      chat: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 2048,
        topP: 1,
        enableThinking: false,
        stream: true,
      },
      embedding: {
        provider: 'openai',
        model: 'text-embedding-ada-002',
      },
      rerank: {
        provider: 'openai',
        model: 'text-embedding-ada-002',
      },
    },
    metadata: {
      modelTests: [],
    },
  },
  ui: {
    theme: 'light',
    showTokenUsage: false,
    displayFormat: 'detailed',
    sessionDuration: 25,
    fontSize: 'medium',
    sidebarWidth: 300,
    autoSave: true,
    autoScroll: true,
    showLineNumbers: false,
    enableMarkdown: true,
    enableSyntaxHighlighting: true,
    compactMode: false,
  },
  learning: {
    autoSave: true,
    sessionTimeoutMinutes: 60,
    difficulty: 'intermediate',
    learningStyle: 'visual',
    personalizationEnabled: true,
    checkpointInterval: 15,
    maxSessionHistory: 100,
    enableAnalytics: false,
    preferredExplanationLength: 'detailed',
  },
  privacy: {
    storeConversations: true,
    retentionDays: 90,
    anonymousAnalytics: false,
    crashReporting: true,
    encryptLocalStorage: false,
    autoCleanup: true,
    exportFormat: 'json',
  },
  performance: {
    cacheSizeMb: 100,
    enableCaching: true,
    maxConcurrentRequests: 5,
    requestTimeout: 30,
    memoryLimitMb: 512,
    gpuAcceleration: false,
    backgroundProcessing: true,
    preloadModels: false,
  },
};

type DeepPaths<T> = T extends object
  ? {
      [K in Extract<keyof T, string>]: NonNullable<T[K]> extends object
        ? `${K}` | `${K}.${DeepPaths<NonNullable<T[K]>>}`
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

export type ConfigPath = DeepPaths<AppConfig>;

/**
 * Functional config service factory
 */
export const createConfigService = ({
  storage,
  logger,
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
      if (!cachedConfig) {
        return DEFAULT_APP_CONFIG;
      }

      return cachedConfig;
    },

    /**
     * Set the full configuration
     */
    setConfig: async (config: Partial<AppConfig>): Promise<void> => {
      const currentConfig = await service.getConfig();

      if (!currentConfig) {
        await storage.saveConfig(config as AppConfig);
        cachedConfig = config as AppConfig;
        emitConfigChanged(cachedConfig);
        return;
      }

      const newConfig = merge({}, currentConfig, config);
      await storage.saveConfig(newConfig);
      cachedConfig = newConfig;
      emitConfigChanged(newConfig);
    },

    /**
     * Get a nested config value referenced by a dot path (e.g., 'ai.contentAnalysisModel')
     */
    get: async <Path extends ConfigPath>(
      key: Path,
    ): Promise<PathValue<AppConfig, Path> | undefined> => {
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
      if (!config?.ai?.providers) {
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
            [name]: config,
          },
        },
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
      if (!config?.ai?.modelTypes) {
        return false;
      }

      const chatConfig = config.ai.modelTypes.chat;
      if (!chatConfig?.provider || !chatConfig.model) {
        return false;
      }

      return true;
    },
  };

  return service;
};

export type ConfigService = ReturnType<typeof createConfigService>;
