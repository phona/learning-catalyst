/**
 * Concept Parsing Module - Main Export
 *
 * This module provides comprehensive concept extraction and processing capabilities
 * for educational content using AI and rule-based approaches.
 */

// Core types and interfaces
export type {
  Concept,
  ConceptEvidence,
  ProposedRelationship,
  ConceptMetadata,
  LearningMaterial,
  LearningSection,
  LearningPath,
  AdaptivePath,
  Assessment,
  Question,
  LearnerProfile,
  ParsingJob,
  ParsingResult,
  ParsingStatistics,
  AIExtractionConfig,
  ModelConfig,
  LangChainConfig,
  ConceptParsingResponse,
  LearningRecommendation
} from '@/types/concept-parsing';

// Error types
export {
  ConceptParsingError,
  AIExtractionError,
  ValidationError
} from '@/types/concept-parsing';

// Main pipeline
export { ConceptProcessingPipeline } from './pipeline';
export type { PipelineConfig, ProcessingOptions, PipelineResult } from './pipeline';

// Individual components
export { MarkdownParser } from './markdown-parser';
export type { MarkdownParseOptions, ParsedSection } from './markdown-parser';

export { AIConceptExtractor } from './ai-extractor';
export type {
  ExtractionResult,
  ModelExtractionResult,
  ConceptExtractionPrompt
} from './ai-extractor';

export { RuleBasedExtractor } from './rule-extractor';
export type {
  ExtractionRule,
  RuleAction,
  ExtractionContext,
  ConceptMatch,
  RelationshipMatch,
  RuleExtractionResult
} from './rule-extractor';

export { ConceptDeduplicator } from './deduplicator';
export type {
  DeduplicationConfig,
  DuplicateGroup,
  ValidationResult,
  ConceptCluster,
  DeduplicationResult,
  DeduplicationStatistics
} from './deduplicator';

// LangChain integration
export { LangChainProviderAdapter, LangChainModelFactory, LangChainUtils } from './langchain-adapter';

// Factory function for easy initialization
import { ConceptProcessingPipeline, type PipelineConfig } from './pipeline';
import { LangChainModelFactory } from './langchain-adapter';
import { AIProvider } from '@/types/ai';
import { type Concept, type ProposedRelationship, type ParsingStatistics } from '@/types/concept-parsing';

/**
 * Create a complete concept parsing pipeline with AI provider integration
 */
export async function createConceptPipeline(
  aiProviders: AIProvider[],
  config?: {
    pipelineConfig?: Partial<PipelineConfig>;
    modelSelection?: string[];
    autoInitialize?: boolean;
  }
): Promise<ConceptProcessingPipeline> {
  const {
    pipelineConfig = {},
    modelSelection = [],
    autoInitialize = true
  } = config || {};

  // Create LangChain adapters for AI providers
  const modelPromises = aiProviders.map(async provider => {
    const info = {
      name: provider.name,
      provider: provider.name,
      modelId: provider.config.name || `${provider.name}-default`,
      weight: 1.0,
      capabilities: []
    };

    return await LangChainModelFactory.createModel(
      provider,
      provider.name,
      info.modelId,
      info
    );
  });

  const models = await Promise.all(modelPromises);

  // Filter by model selection if provided
  const selectedModels = modelSelection.length > 0
    ? models.filter(model => modelSelection.includes(model.getModelInfo().modelId))
    : models;

  // Create pipeline
  const pipeline = new ConceptProcessingPipeline(selectedModels, pipelineConfig);

  return pipeline;
}

/**
 * Quick concept extraction from content
 */
export async function extractConceptsFromContent(
  content: string,
  options?: {
    title?: string;
    format?: 'markdown' | 'text';
    aiProviders?: AIProvider[];
    config?: Partial<PipelineConfig>;
  }
): Promise<{
  concepts: Concept[];
  relationships: ProposedRelationship[];
  statistics: ParsingStatistics;
  success: boolean;
  errors: string[];
}> {
  const {
    title = 'Extracted Content',
    format = 'markdown',
    aiProviders = [],
    config = {}
  } = options || {};

  let pipeline: ConceptProcessingPipeline;

  if (aiProviders.length > 0) {
    pipeline = await createConceptPipeline(aiProviders, { pipelineConfig: config });
  } else {
    pipeline = new ConceptProcessingPipeline(undefined, config);
  }

  const materialId = `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const result = await pipeline.processContent({
    materialId,
    title,
    content,
    format
  });

  return {
    concepts: result.concepts,
    relationships: result.relationships,
    statistics: result.statistics,
    success: result.success,
    errors: result.errors.map(e => e.message)
  };
}

// Version information
export const VERSION = '1.0.0';
export const MODULE_NAME = 'concept-parsing';

// Default configurations
export const DEFAULT_PIPELINE_CONFIG: Partial<PipelineConfig> = {
  enableAIExtraction: true,
  enableRuleExtraction: true,
  enableDeduplication: true,
  enableValidation: true,
  aiConfidenceThreshold: 0.6,
  maxConceptsPerDocument: 50,
  deduplicationThreshold: 0.8,
  strictValidation: false,
  minQualityScore: 0.3,
  enableParallelProcessing: true,
  maxConcurrency: 4,
  timeout: 300000
};

export const DEFAULT_DEDUPLICATION_CONFIG = {
  similarityThreshold: 0.8,
  exactMatchThreshold: 0.95,
  semanticThreshold: 0.7,
  minEvidenceCount: 1,
  minConfidenceScore: 0.3,
  maxConceptNameLength: 100,
  requireDescription: false,
  prohibitedTerms: [
    'test', 'example', 'placeholder', 'todo', 'fixme',
    'click here', 'learn more', 'read more', 'undefined'
  ],
  requiredFields: ['name', 'type', 'difficulty']
};

export const DEFAULT_MARKDOWN_CONFIG = {
  chunkSize: 1000,
  chunkOverlap: 200,
  minChunkSize: 200,
  maxChunkSize: 4000,
  preserveFormatting: true,
  extractMetadata: true,
  includeCodeBlocks: true,
  sectionHeaders: [
    'introduction', 'overview', 'getting started',
    'concept', 'theory', 'background',
    'example', 'demo', 'illustration',
    'exercise', 'practice', 'lab',
    'summary', 'conclusion', 'recap'
  ]
};

// Utility functions
export * as ConceptUtils from './utils/concept-utils';
export * as ValidationUtils from './utils/validation-utils';
export * as FormatUtils from './utils/format-utils';

// Re-export main class as default
export { ConceptProcessingPipeline as default } from './pipeline';