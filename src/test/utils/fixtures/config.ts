import type { AppConfig, ProviderConfig, ModelTypeConfig } from '@/shared/types/config';

const defaultUIConfig = {
  theme: 'light' as 'auto' | 'light' | 'dark',
  show_token_usage: true,
  display_format: 'detailed' as 'detailed' | 'compact' | 'minimal',
  session_duration: 25,
  font_size: 'medium' as 'small' | 'medium' | 'large',
  sidebar_width: 280,
  auto_save: true,
  auto_scroll: true,
  show_line_numbers: false,
  enable_markdown: true,
  enable_syntax_highlighting: true,
  compact_mode: false,
};

const defaultLearningConfig = {
  auto_save: true,
  session_timeout_minutes: 60,
  difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' | 'adaptive',
  learning_style: 'visual' as 'visual' | 'auditory' | 'kinesthetic' | 'reading',
  personalization_enabled: true,
  checkpoint_interval: 15,
  max_session_history: 100,
  enable_analytics: false,
  preferred_explanation_length: 'detailed' as 'brief' | 'detailed' | 'comprehensive',
};

const defaultPrivacyConfig = {
  store_conversations: true,
  retention_days: 30,
  anonymous_analytics: false,
  crash_reporting: true,
  encrypt_local_storage: false,
  auto_cleanup: true,
  export_format: 'json' as 'json' | 'markdown' | 'txt',
};

const defaultPerformanceConfig = {
  cache_size_mb: 64,
  enable_caching: true,
  max_concurrent_requests: 3,
  request_timeout: 30,
  memory_limit_mb: 512,
  gpu_acceleration: false,
  background_processing: true,
  preload_models: false,
};

const baseModelCapabilities = {
  streaming: true,
  thinking: true,
  function_calling: false,
  vision: false,
};

export const makeEmptyConfig = (overrides: Partial<AppConfig> = {}): AppConfig => ({
  ai: {
    providers: {},
    model_types: {},
  },
  ui: { ...defaultUIConfig },
  learning: { ...defaultLearningConfig },
  privacy: { ...defaultPrivacyConfig },
  performance: { ...defaultPerformanceConfig },
  ...overrides,
});

export const makeProviderConfig = (overrides: Partial<ProviderConfig> = {}): ProviderConfig => ({
  provider_type: 'openai',
  base_url: 'https://api.openai.com/v1',
  api_key: 'test-openai-key',
  models: ['gpt-4', 'gpt-4o', 'gpt-3.5-turbo'],
  ...overrides,
});

export const makeModelTypeConfig = (overrides: Partial<ModelTypeConfig> = {}): ModelTypeConfig => ({
  default_provider: 'openai',
  default_model: 'gpt-3.5-turbo',
  available_providers: ['openai', 'chatglm'],
  settings: {},
  capabilities: { ...baseModelCapabilities },
  ...overrides,
});
