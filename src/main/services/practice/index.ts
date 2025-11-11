/**
 * Practice Services Module
 *
 * Exports all practice-related services for easy importing and dependency injection.
 */

export { NaturalPracticeFlow, DEFAULT_NATURAL_PRACTICE_FLOW_CONFIG } from './natural-practice-flow';
export type {
  NaturalPracticeFlowDependencies,
  NaturalPracticeFlowConfig
} from './natural-practice-flow';

// Exercise Template System
export {
  ExerciseTemplateRegistry,
  exerciseTemplateRegistry
} from './exercise-templates';
export type {
  ExerciseTemplate,
  TemplateParameter,
  ParameterizedExercise,
  TemplateVariation,
  ParameterConstraint,
  GenerationRule,
  ExerciseType,
  ExerciseCategory
} from './exercise-templates';

// Parameter Generator
export {
  ParameterGenerator,
  parameterGenerator
} from './parameter-generator';
export type {
  ParameterGenerationContext,
  ParameterGenerationResult,
  ParameterGenerationStrategy
} from './parameter-generator';

// Contextual Exercise Generator
export {
  ContextualExerciseGenerator,
  contextualExerciseGenerator
} from './contextual-exercise-generator';
export type {
  ExerciseGenerationRequest,
  ExerciseGenerationResult,
  ExerciseGenerationStrategy as ContextualExerciseGenerationStrategy
} from './contextual-exercise-generator';

// Difficulty Calibrator
export {
  DifficultyCalibrator,
  difficultyCalibrator
} from './difficulty-calibrator';
export type {
  DifficultyCalibrationContext,
  DifficultyRecommendation,
  UserPerformanceMetrics,
  DifficultyCalibrationStrategy
} from './difficulty-calibrator';

// Exercise Validator
export {
  ExerciseValidator,
  exerciseValidator
} from './exercise-validator';
export type {
  ExerciseValidationRequest,
  ExerciseValidationResult,
  ValidationCategory,
  ValidationIssue,
  ValidationSuggestion,
  ExerciseSolutionValidator
} from './exercise-validator';

// Exercise Variety Generator
export {
  ExerciseVarietyGenerator,
  exerciseVarietyGenerator
} from './exercise-variety-generator';
export type {
  VarietyGenerationRequest,
  VarietyGenerationResult,
  ExerciseVariationStrategy,
  DiversityMetrics
} from './exercise-variety-generator';

// Practice Transition Manager
export {
  PracticeTransitionManager
} from './practice-transition-manager';
export type {
  TransitionContext,
  TransitionStrategy,
  TransitionTiming
} from './practice-transition-manager';

// Project Challenge Generator
export {
  ProjectChallengeGenerator,
  DEFAULT_PROJECT_CHALLENGE_GENERATOR_CONFIG,
  projectChallengeGenerator
} from './project-challenge-generator';
export type {
  ProjectFile,
  ProjectStructure,
  CodePattern,
  PracticeOpportunity,
  ProjectChallengeRequest,
  ProjectChallenge
} from './project-challenge-generator';

// Workspace Integration
export {
  WorkspaceIntegration,
  DEFAULT_WORKSPACE_CONFIG,
  workspaceIntegration
} from './workspace-integration';
export type {
  WorkspaceConfig,
  FileAnalysisOptions,
  ImportExport,
  FunctionInfo,
  ClassInfo,
  CodeMetrics,
  AnalysisResult
} from './workspace-integration';

// Natural Prompt Generator
export {
  NaturalPromptGenerator,
  DEFAULT_PROMPT_GENERATION_CONFIG,
  naturalPromptGenerator
} from './natural-prompt-generator';
export type {
  NaturalPromptRequest,
  NaturalPromptResponse,
  PromptTemplate,
  PromptGenerationConfig
} from './natural-prompt-generator';

// Natural Language Converter
export {
  NaturalLanguageConverter,
  DEFAULT_NATURAL_LANGUAGE_CONVERTER_CONFIG,
  naturalLanguageConverter
} from './natural-language-converter';
export type {
  ConversionRequest,
  ConversionResult,
  NaturalExercise,
  ConversionTemplate,
  NaturalLanguageConverterConfig
} from './natural-language-converter';

// Performance Optimizer
export {
  PerformanceOptimizer,
  DEFAULT_PERFORMANCE_CONFIG,
  performanceOptimizer
} from './performance-optimizer';
export type {
  PerformanceMetrics,
  PerformanceThresholds,
  CacheEntry,
  OptimizationStrategy,
  PerformanceConfig
} from './performance-optimizer';

// Memory-Optimized Workspace
export {
  MemoryOptimizedWorkspaceAnalyzer,
  DEFAULT_MEMORY_OPTIMIZED_CONFIG,
  DEFAULT_LARGE_PROJECT_CONFIG,
  memoryOptimizedWorkspaceAnalyzer
} from './memory-optimized-workspace';
export type {
  MemoryOptimizedConfig,
  FileAnalysisChunk,
  MemoryStats,
  LargeProjectConfig
} from './memory-optimized-workspace';

// User Feedback System
export {
  UserFeedbackSystem,
  DEFAULT_FEEDBACK_CONFIG,
  userFeedbackSystem
} from './user-feedback-system';
export type {
  UserFeedback,
  FeedbackAnalysis,
  AdaptiveImprovement,
  FeedbackConfig
} from './user-feedback-system';