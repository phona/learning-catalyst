import type { AppConfig, ProviderConfig, ModelTypeConfig } from '@/shared/types/config';

const defaultUIConfig = {
  theme: 'light' as 'auto' | 'light' | 'dark',
  showTokenUsage: true,
  displayFormat: 'detailed' as 'detailed' | 'compact' | 'minimal',
  sessionDuration: 25,
  fontSize: 'medium' as 'small' | 'medium' | 'large',
  sidebarWidth: 280,
  autoSave: true,
  autoScroll: true,
  showLineNumbers: false,
  enableMarkdown: true,
  enableSyntaxHighlighting: true,
  compactMode: false,
};

const defaultLearningConfig = {
  autoSave: true,
  sessionTimeoutMinutes: 60,
  difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' | 'adaptive',
  learningStyle: 'visual' as 'visual' | 'auditory' | 'kinesthetic' | 'reading',
  personalizationEnabled: true,
  checkpointInterval: 15,
  maxSessionHistory: 100,
  enableAnalytics: false,
  preferredExplanationLength: 'detailed' as 'brief' | 'detailed' | 'comprehensive',
};

const defaultPrivacyConfig = {
  storeConversations: true,
  retentionDays: 30,
  anonymousAnalytics: false,
  crashReporting: true,
  encryptLocalStorage: false,
  autoCleanup: true,
  exportFormat: 'json' as 'json' | 'markdown' | 'txt',
};

const defaultPerformanceConfig = {
  cacheSizeMb: 64,
  enableCaching: true,
  maxConcurrentRequests: 3,
  requestTimeout: 30,
  memoryLimitMb: 512,
  gpuAcceleration: false,
  backgroundProcessing: true,
  preloadModels: false,
};

const baseModelCapabilities = {
  streaming: true,
  thinking: true,
  functionCalling: false,
  vision: false,
};

export const makeEmptyConfig = (overrides: Partial<AppConfig> = {}): AppConfig => ({
  ai: {
    providers: {},
    modelTypes: {},
    embeddingDimensions: 1024,
  },
  ui: { ...defaultUIConfig },
  learning: { ...defaultLearningConfig },
  privacy: { ...defaultPrivacyConfig },
  performance: { ...defaultPerformanceConfig },
  ...overrides,
});

export const makeProviderConfig = (overrides: Partial<ProviderConfig> = {}): ProviderConfig => ({
  providerType: 'openai',
  displayName: 'OpenAI',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: 'test-openai-key',
  models: ['gpt-4', 'gpt-4o', 'gpt-3.5-turbo'],
  ...overrides,
});

export const makeModelTypeConfig = (overrides: Partial<ModelTypeConfig> = {}): ModelTypeConfig => ({
  defaultProvider: 'openai',
  defaultModel: 'gpt-3.5-turbo',
  availableProviders: ['openai', 'chatglm'],
  settings: {},
  capabilities: { ...baseModelCapabilities },
  ...overrides,
});
