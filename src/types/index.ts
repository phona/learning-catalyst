// Re-export from specific type modules with conflict resolution
export type {
  Message,
  ToolCall,
  StreamChunk,
  TokenUsage,
  ChatResponse as AIChatResponse,
  AIModel,
  ModelType,
  ProviderConfig as AIProviderConfig,
  AIProvider,
  ChatOptions,
  ModelList,
  ProviderFactory,
  OpenAIConfig,
  ChatGLMConfig,
  DeepSeekConfig,
  SiliconFlowConfig,
  AIError,
  AuthenticationError,
  ModelNotFoundError,
  ProviderError,
  RateLimitError,
  TimeoutError
} from './ai';
export type {
  AppConfig,
  AIConfig,
  UIConfig,
  LearningConfig,
  PrivacyConfig,
  PerformanceConfig,
  ProviderConfig as ConfigProviderConfig,
  OpenAIProviderConfig,
  ChatGLMProviderConfig,
  DeepSeekProviderConfig,
  SiliconFlowProviderConfig,
  ModelTypeConfig,
  ModelCapabilities,
  ProviderModelMapping,
  ModelTestResult,
  ModelValidationResult,
  ValidationError,
  ValidationResult,
  ConfigMigration,
  ConfigSchema,
  ThemeConfig,
  ConfigPreset,
  ConfigChangeEvent
} from './config';
export type {
  Session,
  ConversationMessage,
  MessageMetadata,
  SessionMetadata,
  SessionContext,
  UserPreferences,
  Checkpoint,
  PracticeExercise,
  SessionStatistics,
  LearningProgress as SessionLearningProgress,
  KnowledgeNode,
  LearningResource,
  SessionSearchQuery,
  SessionSearchResult,
  SessionExportOptions,
  SessionImportResult,
  SessionEvent,
  MessageEvent
} from './session';
export type {
  LearningObjective,
  LearningMaterial,
  AssessmentCriteria,
  LearningPath,
  LearningProgress as ObjectiveLearningProgress
} from './learning';
export * from './ui';
export * from './api';