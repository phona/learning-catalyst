// TO AI: Don't modify this file, it's checked by me.
import * as path from 'path';
import * as fs from 'fs/promises';
import type { AppConfig } from '@/shared/types/config';

const DEFAULT_APP_CONFIG: AppConfig = {
  ai: {
    providers: {},
    model_types: {
      chat: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 1,
        enable_thinking: false,
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
      model_tests: [],
    },
  },
  ui: {
    theme: 'light',
    show_token_usage: false,
    display_format: 'detailed',
    session_duration: 25,
    font_size: 'medium',
    sidebar_width: 300,
    auto_save: true,
    auto_scroll: true,
    show_line_numbers: false,
    enable_markdown: true,
    enable_syntax_highlighting: true,
    compact_mode: false,
  },
  learning: {
    auto_save: true,
    session_timeout_minutes: 60,
    difficulty: 'intermediate',
    learning_style: 'visual',
    personalization_enabled: true,
    checkpoint_interval: 15,
    max_session_history: 100,
    enable_analytics: false,
    preferred_explanation_length: 'detailed',
  },
  privacy: {
    store_conversations: true,
    retention_days: 90,
    anonymous_analytics: false,
    crash_reporting: true,
    encrypt_local_storage: false,
    auto_cleanup: true,
    export_format: 'json',
  },
  performance: {
    cache_size_mb: 100,
    enable_caching: true,
    max_concurrent_requests: 5,
    request_timeout: 30,
    memory_limit_mb: 512,
    gpu_acceleration: false,
    background_processing: true,
    preload_models: false,
  },
};

export const createConfigStorage = (workspace: string) => {
  const configFilePath = path.join(workspace, 'config.json');

  return {
    async loadConfig(): Promise<AppConfig | null> {
      if (!await fs.stat(configFilePath).catch(() => false)) {
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
