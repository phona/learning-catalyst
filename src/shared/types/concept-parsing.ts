/**
 * Concept Parsing and Management System Types
 *
 * This file defines the complete type system for the AI-powered concept
 * parsing and adaptive learning platform.
 */

import { RelationshipType } from './relationship-types';

export interface Concept {
  id: string;
  name: string;
  description?: string;
  type: 'topic' | 'skill' | 'fact' | 'procedure' | 'principle';
  difficulty: 1 | 2 | 3 | 4 | 5;
  confidence: number; // 0-1, AI extraction confidence
  evidence: ConceptEvidence[];
  relationships: ProposedRelationship[];
  metadata: ConceptMetadata;
  extractedAt: Date;
  sourceMaterialId?: string;
}

export interface ConceptEvidence {
  text: string;
  context: string;
  position: {
    start: number;
    end: number;
    line?: number;
  };
  confidence: number;
  sourceType: 'ai' | 'rule' | 'manual';
  modelId?: string;
}

export interface ProposedRelationship {
  sourceConceptId?: string;
  sourceConceptName?: string;
  targetConceptId?: string;
  targetConceptName?: string;
  type: RelationshipType;
  strength: number; // 0-1
  confidence: number; // 0-1
  description?: string;
  evidence: ConceptEvidence[];
}

export interface ConceptMetadata {
  tags: string[];
  learningObjectives: string[];
  estimatedTime?: number; // minutes
  prerequisites: string[]; // concept IDs or names
  relatedTopics: string[];
  difficulty: number; // 1-5
  domain?: string;
  language?: string;
  extractionMethod: 'ai' | 'rule' | 'manual' | 'hybrid';
  extractedBy: string[]; // model IDs or rule names
  validatedAt?: Date;
  validationScore?: number;
}

export interface LearningMaterial {
  id: string;
  title: string;
  type: 'markdown' | 'pdf' | 'video' | 'course';
  content: string;
  sections: LearningSection[];
  concepts: Concept[];
  learningPath: LearningPath;
  assessments: Assessment[];
  estimatedDuration: number;
  difficultyLevel: number;
  tags: string[];
  metadata: Record<string, any>;
  processedAt: Date;
}

export interface LearningSection {
  id: string;
  title: string;
  content: string;
  type: 'introduction' | 'concept' | 'example' | 'exercise' | 'summary';
  order: number;
  concepts: string[]; // concept IDs
  prerequisites: string[]; // concept IDs
  estimatedTime: number;
  metadata: Record<string, any>;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  estimatedDuration: number;
  difficulty: number;
  modules: LearningModule[];
  prerequisites: string[];
  targetMastery: number;
  adaptations: PathAdaptation[];
  progress: PathProgress;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  concepts: string[];
  order: number;
  isOptional: boolean;
  estimatedTime: number;
  difficulty: number;
  resources: LearningResource[];
  assessments: string[]; // assessment IDs
  completionCriteria: CompletionCriteria;
}

export interface LearningResource {
  id: string;
  title: string;
  type: 'text' | 'video' | 'interactive' | 'exercise' | 'document';
  content: string;
  url?: string;
  estimatedTime: number;
  difficulty: number;
  concepts: string[];
}

export interface CompletionCriteria {
  type: 'time' | 'assessment' | 'practice' | 'mixed';
  threshold: number; // minimum score, time in minutes, or practice count
  assessments: string[];
  required: boolean;
}

export interface PathAdaptation {
  id: string;
  userId: string;
  type: 'difficulty' | 'pace' | 'content' | 'prerequisite';
  originalValue: any;
  adaptedValue: any;
  reason: string;
  appliedAt: Date;
  performance: PerformanceMetric[];
}

export interface PathProgress {
  userId: string;
  currentModule: string;
  completedModules: string[];
  currentConcept: string;
  masteredConcepts: string[];
  timeSpent: number;
  assessmentScores: AssessmentScore[];
  lastAccess: Date;
  completionRate: number;
  masteryLevel: number;
}

export interface AdaptivePath {
  id: string;
  userId: string;
  topic: string;
  currentLevel: number;
  targetLevel: number;
  modules: LearningModule[];
  adaptations: PathAdaptation[];
  progress: PathProgress;
}

export interface Assessment {
  id: string;
  title: string;
  type: 'quiz' | 'exercise' | 'project' | 'practical';
  description: string;
  questions: Question[];
  difficulty: number;
  timeLimit?: number;
  passingScore: number;
  concepts: string[];
  prerequisites: string[];
  metadata: Record<string, any>;
}

export interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'coding' | 'essay';
  question: string;
  options?: string[]; // for multiple choice
  correctAnswer: any;
  explanation?: string;
  hints: string[];
  difficulty: number;
  concepts: string[];
  timeLimit?: number;
  points: number;
}

export interface AssessmentScore {
  assessmentId: string;
  userId: string;
  score: number;
  maxScore: number;
  percentage: number;
  timeSpent: number;
  attempts: number;
  completedAt: Date;
  feedback: string;
  conceptMastery: Record<string, number>;
}

export interface PerformanceMetric {
  conceptId: string;
  metric: 'accuracy' | 'speed' | 'retention' | 'application';
  value: number;
  timestamp: Date;
  context: string;
}

export interface LearnerProfile {
  id: string;
  userId: string;
  currentLevel: Record<string, number>; // concept domain -> mastery level
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading' | 'mixed';
  preferences: LearnerPreferences;
  goals: LearningGoal[];
  strengths: string[]; // concept IDs
  weaknesses: string[]; // concept IDs
  progressHistory: ProgressEntry[];
  statistics: LearnerStatistics;
  updatedAt: Date;
}

export interface LearnerPreferences {
  pace: 'slow' | 'moderate' | 'fast' | 'adaptive';
  difficulty: 'easy' | 'progressive' | 'challenging';
  contentTypes: ('text' | 'video' | 'interactive' | 'practice')[];
  sessionLength: number; // minutes
  preferredTimes: string[]; // time ranges
  language: string;
  feedbackLevel: 'minimal' | 'moderate' | 'detailed';
}

export interface LearningGoal {
  id: string;
  title: string;
  description: string;
  targetConcepts: string[];
  targetMastery: number;
  deadline?: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  createdAt: Date;
}

export interface ProgressEntry {
  date: Date;
  conceptsStudied: string[];
  timeSpent: number;
  assessmentsCompleted: string[];
  masteryGains: Record<string, number>;
  activities: LearningActivity[];
}

export interface LearningActivity {
  type: 'study' | 'practice' | 'assessment' | 'review';
  conceptId: string;
  duration: number;
  score?: number;
  engagement: number; // 1-5
  notes?: string;
  timestamp: Date;
}

export interface LearnerStatistics {
  totalTimeSpent: number;
  conceptsMastered: number;
  conceptsInProgress: number;
  averageSessionTime: number;
  averageMasteryLevel: number;
  strengthAreas: string[];
  improvementAreas: string[];
  learningVelocity: number; // concepts per week
  retentionRate: number;
  lastCalculated: Date;
}

// Parsing Pipeline Types

export interface ParsingJob {
  id: string;
  materialId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-1
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  stages: ParsingStage[];
  result?: ParsingResult;
}

export interface ParsingStage {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  result?: any;
}

export interface ParsingResult {
  concepts: Concept[];
  relationships: ProposedRelationship[];
  learningPath: LearningPath;
  assessments: Assessment[];
  statistics: ParsingStatistics;
  errors: ParsingError[];
}

export interface ParsingStatistics {
  totalConcepts: number;
  validConcepts: number;
  totalRelationships: number;
  confidenceDistribution: Record<string, number>;
  difficultyDistribution: Record<number, number>;
  typeDistribution: Record<string, number>;
  processingTime: number;
  modelUsage: Record<string, number>;
}

export interface ParsingError {
  type: 'parsing' | 'extraction' | 'validation' | 'generation';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: string;
  stack?: string;
  timestamp: Date;
}

// AI Extraction Types

export interface ParsingOptions {
  useAI: boolean;
  confidenceThreshold: number;
  maxConceptsPerFile: number;
  includeRelationships: boolean;
  modelProvider?: string;
  extractLearningPaths?: boolean;
  extractAssessments?: boolean;
  // Global AI configuration override options
  temperature?: number;
  maxTokens?: number;
  enableThinking?: boolean;
}

export interface AIExtractionConfig {
  models: ModelConfig[];
  rules: RuleConfig[];
  validation: ValidationConfig;
  thresholds: ExtractionThresholds;
}

export interface ModelConfig {
  name: string;
  provider: string;
  modelId: string;
  weight: number;
  capabilities: string[];
  costPerToken?: number;
  maxTokens?: number;
  temperature?: number;
}

export interface RuleConfig {
  name: string;
  pattern: string;
  type: 'concept' | 'relationship' | 'metadata';
  confidence: number;
  enabled: boolean;
  description: string;
}

export interface ValidationConfig {
  minConfidence: number;
  maxConcepts: number;
  requiredFields: string[];
  prohibitedPatterns: string[];
  consistencyChecks: boolean;
  duplicateDetection: boolean;
}

export interface ExtractionThresholds {
  conceptConfidence: number;
  relationshipStrength: number;
  descriptionMinLength: number;
  maxConceptNameLength: number;
  maxRelationshipsPerConcept: number;
  minEvidenceCount: number;
}

// LangChain Integration Types

export interface LangChainConfig {
  documentLoaders: DocumentLoaderConfig[];
  textSplitters: TextSplitterConfig[];
  embeddings: EmbeddingConfig[];
  chains: ChainConfig[];
  memory: MemoryConfig;
}

export interface DocumentLoaderConfig {
  type: 'text' | 'pdf' | 'markdown' | 'html' | 'json';
  options: Record<string, any>;
  enabled: boolean;
}

export interface TextSplitterConfig {
  type: 'recursive' | 'character' | 'token' | 'semantic';
  chunkSize: number;
  chunkOverlap: number;
  separators?: string[];
  enabled: boolean;
}

export interface EmbeddingConfig {
  provider: string;
  model: string;
  dimensions: number;
  batchSize: number;
  enabled: boolean;
}

export interface ChainConfig {
  type: 'extraction' | 'validation' | 'generation' | 'analysis';
  template: string;
  inputKeys: string[];
  outputKeys: string[];
  enabled: boolean;
}

export interface MemoryConfig {
  type: 'buffer' | 'summary' | 'knowledge-graph';
  maxTokens: number;
  returnMessages: boolean;
  enabled: boolean;
}

// API Response Types

export interface ConceptParsingResponse {
  success: boolean;
  data?: {
    concepts: Concept[];
    relationships: ProposedRelationship[];
    learningPath: LearningPath;
    assessments: Assessment[];
  };
  errors?: string[];
  warnings?: string[];
  metadata: {
    processingTime: number;
    modelUsage: Record<string, number>;
    timestamp: Date;
  };
}

export interface LearningRecommendation {
  concept: Concept;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number;
  prerequisites: Concept[];
  confidence: number;
  nextSteps: string[];
}

// Error Types

export class ConceptParsingError extends Error {
  constructor(
    message: string,
    public type: 'parsing' | 'extraction' | 'validation' | 'generation',
    public context?: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = 'ConceptParsingError';
  }
}

export class AIExtractionError extends ConceptParsingError {
  constructor(
    message: string,
    public model: string,
    public provider: string,
    context?: string,
    cause?: Error,
  ) {
    super(message, 'extraction', context, cause);
    this.name = 'AIExtractionError';
  }
}

export class ValidationError extends ConceptParsingError {
  constructor(
    message: string,
    public field: string,
    public value: any,
    context?: string,
  ) {
    super(message, 'validation', context);
    this.name = 'ValidationError';
  }
}

// Utility Types

export type ConceptStatus = 'extracted' | 'validated' | 'approved' | 'rejected' | 'pending';
export type LearningStatus = 'not_started' | 'in_progress' | 'completed' | 'mastered';
export type AssessmentType = 'diagnostic' | 'formative' | 'summative' | 'practice';
export type QuestionType =
  | 'recall'
  | 'comprehension'
  | 'application'
  | 'analysis'
  | 'synthesis'
  | 'evaluation';

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchOptions {
  query?: string;
  types?: string[];
  difficultyRange?: [number, number];
  confidenceRange?: [number, number];
  tags?: string[];
  dateRange?: [Date, Date];
  includeRelationships?: boolean;
  pagination?: PaginationOptions;
}

export interface FilterOptions {
  type?: string[];
  difficulty?: number[];
  confidence?: [number, number];
  tags?: string[];
  validated?: boolean;
  source?: string[];
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'xml' | 'yaml';
  includeRelationships?: boolean;
  includeMetadata?: boolean;
  filter?: FilterOptions;
}

export interface ImportOptions {
  format: 'json' | 'csv' | 'xml' | 'yaml';
  validateOnImport?: boolean;
  mergeStrategy?: 'skip' | 'overwrite' | 'merge' | 'append';
  updateExisting?: boolean;
}

/**
 * ============================================================================
 * CONCEPT PARSING SEGMENTATION AND EXTRACTION CONFIGURATION
 * ============================================================================
 *
 * These types define the configuration and structure for the AI-powered
 * concept parsing pipeline. The system optimizes LLM usage through intelligent
 * segment merging and context limiting.
 */

// Configuration for concept parsing operation
export interface ConceptParsingSettings {
  /** Minimum character threshold for creating a segment */
  minSegmentChars: number;

  /** Maximum character threshold for splitting content into segments */
  maxSegmentChars: number;

  /**
   * Maximum characters to feed to LLM per concept extraction call.
   * -1 = unlimited (feed entire segment to LLM)
   * 300-500 = fast processing with limited context
   * 800-1200 = balanced processing with good context
   */
  maxCharPerConcept: number;

  /** Heading depth level to include in segmentation (1=H1, 2=H1+H2, etc.) */
  includeHeadingDepth: number;

  /** Whether to vectorize extracted concepts */
  vectorize: boolean;

  /** Whether to store relationships in vector database */
  storeRelationships: boolean;

  /** Concurrency limit for parallel processing */
  concurrency: number;
}

// A segment of content extracted from source material for LLM processing
export interface ConceptSegment {
  /** Unique identifier for the segment */
  id: string;

  /**
   * Segment content with embedded markdown headings.
   * Heading structure is preserved (e.g., "# Title\nContent...").
   * LLM uses headings to identify ROOT TOPIC and relationships.
   */
  content: string;

  /** Sequential order of segment in original document */
  order: number;
}
