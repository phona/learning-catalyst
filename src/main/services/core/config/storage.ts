import * as path from 'path';
import * as fs from 'fs/promises';
import type { AppConfig } from '@/shared/types/config';

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

export const createConfigStorage = (workspace: string) => {
  const configFilePath = path.join(workspace, 'config.json');

  return {
    async loadConfig(): Promise<AppConfig | null> {
      if (!(await fs.stat(configFilePath).catch(() => false))) {
        return DEFAULT_APP_CONFIG;
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
