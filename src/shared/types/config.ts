/**
 * Configuration Management Types
 * Simplified architecture with 3 main providers: openai, chatglm, openai-compatible
 */

import { ModelType } from './ai';

export type ProviderType = 'openai' | 'chatglm' | 'deepseek' | 'siliconflow' | 'openai-compatible';

// Interface for AVAILABLE_PROVIDERS structure
export interface ProviderModelInfo {
  id: string;
  capabilities: ModelType[];
}

export interface ProviderConfig {
  provider_type: ProviderType;
  api_key?: string;
  base_url?: string;
  models?: string[]; // Available models for this provider
  // Legacy fields for backward compatibility
  type?: ProviderType;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  streaming?: boolean;
  custom_headers?: Record<string, string>;
}

export interface AppConfig {
  ai: AIConfig;
  ui: UIConfig;
  learning: LearningConfig;
  privacy: PrivacyConfig;
  performance: PerformanceConfig;
}

export interface SelectedModel {
  provider?: string;
  model?: string;
}

export interface SelectedChatModel extends SelectedModel {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  enable_thinking?: boolean;
  stream?: boolean;
  default_provider?: string;
  default_model?: string;
  capabilities?: ModelCapabilities;
}

export interface AIConfig {
  providers: Record<string, ProviderConfig>;
  // Enhanced model type support
  model_types?: {
    chat?: SelectedChatModel;
    embedding?: SelectedModel;
    rerank?: SelectedModel;
  };
  metadata?: {
    model_tests?: ModelTestResult[];
    [key: string]: any;
  };
  default_provider?: string;
  default_model?: string;
  temperature?: number;
  max_tokens?: number;
  streaming?: boolean;
  enable_thinking?: boolean;
  context_window_size?: number;
}

export interface UIConfig {
  theme: 'light' | 'dark' | 'auto';
  show_token_usage: boolean;
  display_format: 'detailed' | 'compact' | 'minimal';
  session_duration: number; // minutes
  font_size: 'small' | 'medium' | 'large';
  sidebar_width: number;
  auto_save: boolean;
  auto_scroll: boolean;
  show_line_numbers: boolean;
  enable_markdown: boolean;
  enable_syntax_highlighting: boolean;
  compact_mode: boolean;
}

export interface LearningConfig {
  auto_save: boolean;
  session_timeout_minutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'adaptive';
  learning_style: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  personalization_enabled: boolean;
  checkpoint_interval: number; // minutes
  max_session_history: number; // number of sessions
  enable_analytics: boolean;
  preferred_explanation_length: 'brief' | 'detailed' | 'comprehensive';
}

export interface PrivacyConfig {
  store_conversations: boolean;
  retention_days: number;
  anonymous_analytics: boolean;
  crash_reporting: boolean;
  encrypt_local_storage: boolean;
  auto_cleanup: boolean;
  export_format: 'json' | 'markdown' | 'txt';
}

export interface PerformanceConfig {
  cache_size_mb: number;
  enable_caching: boolean;
  max_concurrent_requests: number;
  request_timeout: number; // seconds
  memory_limit_mb: number;
  gpu_acceleration: boolean;
  background_processing: boolean;
  preload_models: boolean;
}

// Model type configuration for multi-model support
export interface ModelTypeConfig {
  default_provider: string;
  default_model: string;
  available_providers: ProviderType[];
  custom_provider_url?: string; // For openai-compatible providers
  api_key?: string;
  settings: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  };
  capabilities: ModelCapabilities;
}

export interface ModelCapabilities {
  streaming: boolean;
  thinking: boolean;
  function_calling: boolean;
  vision: boolean;
  max_input_tokens?: number;
  max_output_tokens?: number;
}

// Model validation and testing
export interface ModelTestResult {
  model_id: string;
  provider: string;
  model_type: string;
  status: 'success' | 'error';
  response_time_ms?: number;
  error_message?: string;
  test_timestamp: Date;
  capabilities_tested?: string[];
}

export interface ModelValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  tested_capabilities: string[];
  recommendations: string[];
}

// Configuration validation types
export interface ValidationError {
  field: string;
  message: string;
  value: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Provider validation result (for API validation)
export interface ProviderValidationResult {
  success: boolean;
  error?: string;
}

// Configuration migration types
export interface ConfigMigration {
  version: string;
  description: string;
  migrate: (config: any) => any;
}

// Default provider configurations for ModelFactory compatibility
export const DEFAULT_PROVIDER_CONFIGS: Record<ProviderType, ProviderConfig> = {
  openai: {
    provider_type: 'openai',
    base_url: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'text-embedding-ada-002'],
    api_key: '',
  },
  chatglm: {
    provider_type: 'chatglm',
    base_url: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4', 'glm-4-plus', 'glm-3-turbo'],
    api_key: '',
  },
  deepseek: {
    provider_type: 'deepseek',
    base_url: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder'],
    api_key: '',
  },
  siliconflow: {
    provider_type: 'siliconflow',
    base_url: 'https://api.siliconflow.cn/v1',
    models: ['Qwen/Qwen2.5-7B-Instruct', 'BAAI/bge-large-en-v1.5'],
    api_key: '',
  },
  'openai-compatible': {
    provider_type: 'openai-compatible',
    base_url: 'http://localhost:11434/v1',
    models: ['llama3.1:8b'],
    api_key: '',
  },
};

export const AVAILABLE_PROVIDERS: ProviderConfig[] = [
  {
    provider_type: 'openai',
    models: [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'text-embedding-ada-002',
      'text-embedding-3-small',
      'text-embedding-3-large',
    ],
    base_url: 'https://api.openai.com/v1',
    api_key: '',
  },
  {
    provider_type: 'chatglm',
    models: [
      'glm-4',
      'glm-4-0520',
      'glm-3-turbo',
      'glm-4-plus',
      'glm-4-air',
      'glm-4-airx',
      'glm-4-long',
      'embedding-2',
      'embedding-3',
    ],
    base_url: 'https://open.bigmodel.cn/api/paas/v4/',
    api_key: '',
  },
  {
    provider_type: 'deepseek',
    models: ['deepseek-chat', 'deepseek-coder'],
    base_url: 'https://api.deepseek.com',
    api_key: '',
  },
  {
    provider_type: 'siliconflow',
    models: [
      'deepseek-ai/DeepSeek-V3',
      'meta-llama/Meta-Llama-3.1-8B-Instruct',
      '01-ai/Yi-1.5-9B-Chat-16K',
      'BAAI/bge-large-en-v1.5',
      'BAAI/bge-large-zh-v1.5',
      'BAAI/bge-reranker-v2-m3',
    ],
    base_url: 'https://api.siliconflow.cn',
    api_key: '',
  },
  {
    provider_type: 'openai-compatible',
    models: ['llama3.1:8b'],
    base_url: 'http://localhost:11434/v1',
    api_key: '',
  },
];

// Configuration schema for validation
export interface ConfigSchema {
  type: 'object';
  properties: Record<string, any>;
  required: string[];
  additionalProperties: boolean;
}

// Theme configurations
export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      small: string;
      medium: string;
      large: string;
      xlarge: string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// Preset configurations
export interface ConfigPreset {
  name: string;
  description: string;
  config: Partial<AppConfig>;
  tags: string[];
}

// Configuration events
export interface ConfigChangeEvent {
  key: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
}
