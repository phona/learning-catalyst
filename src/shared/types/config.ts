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
  providerType: ProviderType;
  displayName?: string;
  apiKey?: string;
  baseUrl?: string;
  models?: string[]; // Available models for this provider
  type?: ProviderType;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
  customHeaders?: Record<string, string>;
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
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  enableThinking?: boolean;
  stream?: boolean;
  defaultProvider?: string;
  defaultModel?: string;
  capabilities?: ModelCapabilities;
}

export interface AIConfig {
  providers: Record<string, ProviderConfig>;
  // Enhanced model type support
  modelTypes?: {
    chat?: SelectedChatModel;
    embedding?: SelectedModel;
    rerank?: SelectedModel;
  };
  metadata?: {
    modelTests?: ModelTestResult[];
    [key: string]: any;
  };
  defaultProvider?: string;
  defaultModel?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
  enableThinking?: boolean;
  contextWindowSize?: number;
}

export interface UIConfig {
  theme: 'light' | 'dark' | 'auto';
  showTokenUsage: boolean;
  displayFormat: 'detailed' | 'compact' | 'minimal';
  sessionDuration: number; // minutes
  fontSize: 'small' | 'medium' | 'large';
  sidebarWidth: number;
  autoSave: boolean;
  autoScroll: boolean;
  showLineNumbers: boolean;
  enableMarkdown: boolean;
  enableSyntaxHighlighting: boolean;
  compactMode: boolean;
}

export interface LearningConfig {
  autoSave: boolean;
  sessionTimeoutMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'adaptive';
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  personalizationEnabled: boolean;
  checkpointInterval: number; // minutes
  maxSessionHistory: number; // number of sessions
  enableAnalytics: boolean;
  preferredExplanationLength: 'brief' | 'detailed' | 'comprehensive';
}

export interface PrivacyConfig {
  storeConversations: boolean;
  retentionDays: number;
  anonymousAnalytics: boolean;
  crashReporting: boolean;
  encryptLocalStorage: boolean;
  autoCleanup: boolean;
  exportFormat: 'json' | 'markdown' | 'txt';
}

export interface PerformanceConfig {
  cacheSizeMb: number;
  enableCaching: boolean;
  maxConcurrentRequests: number;
  requestTimeout: number; // seconds
  memoryLimitMb: number;
  gpuAcceleration: boolean;
  backgroundProcessing: boolean;
  preloadModels: boolean;
}

// Model type configuration for multi-model support
export interface ModelTypeConfig {
  defaultProvider: string;
  defaultModel: string;
  availableProviders: ProviderType[];
  customProviderUrl?: string; // For openai-compatible providers
  apiKey?: string;
  settings: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  capabilities: ModelCapabilities;
  // Legacy aliases (deprecated)
  default_provider?: string;
  default_model?: string;
  available_providers?: ProviderType[];
  custom_provider_url?: string;
  api_key?: string;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface ModelCapabilities {
  streaming: boolean;
  thinking: boolean;
  functionCalling: boolean;
  vision: boolean;
  maxInputTokens?: number;
  maxOutputTokens?: number;
}

// Model validation and testing
export interface ModelTestResult {
  modelId: string;
  provider: string;
  modelType: string;
  status: 'success' | 'error';
  responseTimeMs?: number;
  errorMessage?: string;
  testTimestamp: Date;
  capabilitiesTested?: string[];
}

export interface ModelValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  testedCapabilities: string[];
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
    providerType: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'text-embedding-ada-002'],
    apiKey: '',
  },
  chatglm: {
    providerType: 'chatglm',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4', 'glm-4-plus', 'glm-3-turbo'],
    apiKey: '',
  },
  deepseek: {
    providerType: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder'],
    apiKey: '',
  },
  siliconflow: {
    providerType: 'siliconflow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: ['Qwen/Qwen2.5-7B-Instruct', 'BAAI/bge-large-en-v1.5'],
    apiKey: '',
  },
  'openai-compatible': {
    providerType: 'openai-compatible',
    baseUrl: 'http://localhost:11434/v1',
    models: ['llama3.1:8b'],
    apiKey: '',
  },
};

export const AVAILABLE_PROVIDERS: ProviderConfig[] = [
  {
    providerType: 'openai',
    models: [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'text-embedding-ada-002',
      'text-embedding-3-small',
      'text-embedding-3-large',
    ],
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
  },
  {
    providerType: 'chatglm',
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
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
    apiKey: '',
  },
  {
    providerType: 'deepseek',
    models: ['deepseek-chat', 'deepseek-coder'],
    baseUrl: 'https://api.deepseek.com',
    apiKey: '',
  },
  {
    providerType: 'siliconflow',
    models: [
      'deepseek-ai/DeepSeek-V3',
      'meta-llama/Meta-Llama-3.1-8B-Instruct',
      '01-ai/Yi-1.5-9B-Chat-16K',
      'BAAI/bge-large-en-v1.5',
      'BAAI/bge-large-zh-v1.5',
      'BAAI/bge-reranker-v2-m3',
    ],
    baseUrl: 'https://api.siliconflow.cn',
    apiKey: '',
  },
  {
    providerType: 'openai-compatible',
    models: ['llama3.1:8b'],
    baseUrl: 'http://localhost:11434/v1',
    apiKey: '',
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
