// Re-export from specific type modules with conflict resolution
export type {
  Message,
  ToolCall,
  StreamChunk,
  TokenUsage,
  ChatResponse as AIChatResponse,
  AIModel,
  AIProvider,
  ChatOptions,
  ModelList,
  ProviderFactory,
  AIError,
  AuthenticationError,
  ModelNotFoundError,
  ProviderError,
  RateLimitError,
  TimeoutError,
} from './ai';
export { ModelType } from './ai';
export type {
  AppConfig,
  AIConfig,
  UIConfig,
  LearningConfig,
  PrivacyConfig,
  PerformanceConfig,
  ProviderType,
  ProviderConfig,
  SelectedModel,
  SelectedChatModel,
  ModelTypeConfig,
  ModelCapabilities,
  ModelTestResult,
  ModelValidationResult,
  ProviderValidationResult,
  ValidationError,
  ValidationResult,
  ConfigMigration,
  ConfigSchema,
  ThemeConfig,
  ConfigPreset,
  ConfigChangeEvent,
} from './config';
export type {
  Session,
  ConversationMessage,
  MessageMetadata,
  SessionMetadata,
  SessionContext,
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
  MessageEvent,
} from './session';
export type {
  LearningObjective,
  LearningMaterial,
  AssessmentCriteria,
  LearningPath,
  LearningProgress as ObjectiveLearningProgress,
} from './learning';
export * from './ui';
export * from './api';
export type { Database, SessionDatabase } from './database';

export type {
  ElectronAPI,
  APIResponse,
  ChatAPI,
  KnowledgeAPI,
  AnalyticsAPI,
  SettingsAPI,
  SessionsAPI,
  CatalystAPI,
  ConversationDisplay,
  MessageDisplay,
  TypingIndicator,
  ConversationSummary,
  ConversationHistory,
  ConversationContext,
  PracticeOpportunityResult,
  NaturalPracticeSuggestion,
  UserLearningContext,
} from './electron-api';

export type { AgentDisplay } from './electron-api/chat-api';

// Export practice types for context-aware practice system
export * from './practice';
