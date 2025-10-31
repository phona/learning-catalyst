/**
 * Configuration Management Types
 * Converted from Python configuration system
 */

export interface AppConfig {
  ai: AIConfig;
  ui: UIConfig;
  learning: LearningConfig;
  privacy: PrivacyConfig;
  performance: PerformanceConfig;
}

export interface AIConfig {
  default_provider: string;
  default_model: string;
  temperature: number;
  max_tokens: number;
  providers: Record<string, ProviderConfig>;
  streaming: boolean;
  enable_thinking: boolean;
  auto_hide_thinking: boolean;
  context_window_size: number;
  system_prompt?: string;
  // Enhanced model type support
  model_types: {
    chat: ModelTypeConfig;
    embedding: ModelTypeConfig;
    rerank: ModelTypeConfig;
  };
  metadata?: {
    model_tests?: ModelTestResult[];
    [key: string]: any;
  };
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

export interface ProviderConfig {
  name: string;
  api_key: string;
  base_url?: string;
  timeout?: number;
  max_retries?: number;
  organization_id?: string;
  custom_headers?: Record<string, string>;
  enabled: boolean;
  last_validated?: Date;
  models?: string[];
}

// Specific provider configurations
export interface OpenAIProviderConfig extends ProviderConfig {
  organization_id?: string;
  base_url?: string;
  models?: string[];
}

export interface ChatGLMProviderConfig extends ProviderConfig {
  base_url: string;
  enable_thinking: boolean;
  models?: string[];
}

export interface DeepSeekProviderConfig extends ProviderConfig {
  base_url: string;
  models?: string[];
}

export interface SiliconFlowProviderConfig extends ProviderConfig {
  base_url: string;
  models?: string[];
}

// Model type configuration for multi-model support
export interface ModelTypeConfig {
  default_provider: string;
  default_model: string;
  available_providers: string[];
  custom_provider_url?: string; // For openai-compatible providers
  api_keys: {
    openai?: string;
    chatglm?: string;
    deepseek?: string;
    siliconflow?: string;
    'openai-compatible'?: string;
  };
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

// Provider to model type mappings
export interface ProviderModelMapping {
  [providerName: string]: {
    [modelType: string]: string[]; // model type -> available models
  };
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

// Configuration migration types
export interface ConfigMigration {
  version: string;
  description: string;
  migrate: (config: any) => any;
}

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