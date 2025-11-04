/**
 * Concept Processing Pipeline
 *
 * This is the main orchestrator that coordinates all concept parsing components:
 * markdown parsing, AI extraction, rule-based extraction, deduplication, and validation.
 * It provides a unified interface for processing learning materials into structured concepts.
 */

// Temporary Document interface until LangChain imports are fixed
interface Document {
  pageContent: string;
  metadata: Record<string, any>;
}

import { MarkdownParser } from './markdown-parser';
import { AIConceptExtractor } from './ai-extractor';
import { RuleBasedExtractor } from './rule-extractor';
import { ConceptDeduplicator } from './deduplicator';
import { LangChainProviderAdapter } from './langchain-adapter';
import {
  LearningMaterial,
  Concept,
  ProposedRelationship,
  ParsingJob,
  ParsingStage,
  ParsingResult,
  ParsingStatistics,
  ParsingError,
  ConceptParsingResponse
} from '@/types/concept-parsing';

export interface PipelineConfig {
  // Processing options
  enableAIExtraction: boolean;
  enableRuleExtraction: boolean;
  enableDeduplication: boolean;
  enableValidation: boolean;

  // AI extraction settings
  aiModels?: string[];
  aiConfidenceThreshold: number;
  maxConceptsPerDocument: number;

  // Rule extraction settings
  enableCustomRules: boolean;
  customRulesPath?: string;

  // Deduplication settings
  deduplicationThreshold: number;
  preserveHighQualityDuplicates: boolean;

  // Validation settings
  strictValidation: boolean;
  minQualityScore: number;

  // Performance settings
  enableParallelProcessing: boolean;
  maxConcurrency: number;
  timeout: number;
}

export interface ProcessingOptions {
  materialId: string;
  title?: string;
  content?: string;
  filePath?: string;
  format?: 'markdown' | 'text' | 'html';
  metadata?: Record<string, any>;
  onProgress?: (stage: ParsingStage, progress: number) => void;
  onError?: (error: ParsingError) => void;
}

export interface PipelineResult {
  success: boolean;
  material?: LearningMaterial;
  concepts: Concept[];
  relationships: ProposedRelationship[];
  statistics: ParsingStatistics;
  errors: ParsingError[];
  warnings: string[];
  processingTime: number;
  job?: ParsingJob;
}

export class ConceptProcessingPipeline {
  private markdownParser: MarkdownParser;
  private aiExtractor?: AIConceptExtractor;
  private ruleExtractor: RuleBasedExtractor;
  private deduplicator: ConceptDeduplicator;
  private config: PipelineConfig;

  constructor(
    aiModels?: LangChainProviderAdapter[],
    config?: Partial<PipelineConfig>
  ) {
    this.config = {
      enableAIExtraction: true,
      enableRuleExtraction: true,
      enableDeduplication: true,
      enableValidation: true,
      aiConfidenceThreshold: 0.6,
      maxConceptsPerDocument: 50,
      enableCustomRules: false,
      deduplicationThreshold: 0.8,
      preserveHighQualityDuplicates: true,
      strictValidation: false,
      minQualityScore: 0.3,
      enableParallelProcessing: true,
      maxConcurrency: 4,
      timeout: 300000, // 5 minutes
      ...config
    };

    // Initialize components
    this.markdownParser = new MarkdownParser();
    this.ruleExtractor = new RuleBasedExtractor();
    this.deduplicator = new ConceptDeduplicator({
      similarityThreshold: this.config.deduplicationThreshold
    });

    if (aiModels && aiModels.length > 0) {
      this.aiExtractor = new AIConceptExtractor(aiModels);
    }
  }

  /**
   * Process learning material from content
   */
  async processContent(options: ProcessingOptions): Promise<PipelineResult> {
    const startTime = Date.now();
    const errors: ParsingError[] = [];
    const warnings: string[] = [];

    // Create parsing job
    const job = this.createParsingJob(options);

    try {
      if (options.onProgress) {
        options.onProgress(job.stages[0], 0);
      }

      // Stage 1: Content Parsing
      const material = await this.parseContent(options, job);
      if (!material) {
        throw new Error('Failed to parse content');
      }

      // Stage 2: Concept Extraction
      const extractionResult = await this.extractConcepts(material, job, options);

      // Stage 3: Deduplication and Validation
      const finalConcepts = await this.processConcepts(extractionResult.concepts, job, options);

      // Stage 4: Learning Material Assembly
      const finalMaterial = await this.assembleLearningMaterial(
        material,
        finalConcepts,
        extractionResult.relationships,
        job
      );

      // Stage 5: Final Statistics
      const statistics = this.createFinalStatistics(
        finalMaterial,
        finalConcepts,
        extractionResult.relationships,
        Date.now() - startTime,
        job
      );

      // Update job status
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = {
        concepts: finalConcepts,
        relationships: extractionResult.relationships,
        learningPath: finalMaterial.learningPath,
        assessments: finalMaterial.assessments,
        statistics,
        errors: errors.map(e => e.message)
      };

      return {
        success: true,
        material: finalMaterial,
        concepts: finalConcepts,
        relationships: extractionResult.relationships,
        statistics,
        errors,
        warnings,
        processingTime: Date.now() - startTime,
        job
      };

    } catch (error) {
      const parsingError: ParsingError = {
        type: 'parsing',
        message: (error as Error).message,
        severity: 'critical',
        context: 'Pipeline processing failed',
        stack: (error as Error).stack,
        timestamp: new Date()
      };

      errors.push(parsingError);
      job.status = 'failed';
      job.errorMessage = parsingError.message;

      if (options.onError) {
        options.onError(parsingError);
      }

      return {
        success: false,
        concepts: [],
        relationships: [],
        statistics: {
          totalConcepts: 0,
          validConcepts: 0,
          totalRelationships: 0,
          confidenceDistribution: {},
          difficultyDistribution: {},
          typeDistribution: {},
          processingTime: Date.now() - startTime,
          modelUsage: {}
        },
        errors,
        warnings,
        processingTime: Date.now() - startTime,
        job
      };
    }
  }

  /**
   * Process multiple materials in parallel
   */
  async processBatch(
    optionsList: ProcessingOptions[],
    onProgress?: (index: number, total: number, result: PipelineResult) => void
  ): Promise<PipelineResult[]> {
    if (!this.config.enableParallelProcessing) {
      // Sequential processing
      const results: PipelineResult[] = [];
      for (let i = 0; i < optionsList.length; i++) {
        const result = await this.processContent(optionsList[i]);
        results.push(result);
        if (onProgress) {
          onProgress(i, optionsList.length, result);
        }
      }
      return results;
    }

    // Parallel processing with concurrency limit
    const results: PipelineResult[] = [];
    const semaphore = new Semaphore(this.config.maxConcurrency);
    const promises = optionsList.map(async (options, index) => {
      await semaphore.acquire();
      try {
        const result = await this.processContent(options);
        if (onProgress) {
          onProgress(index, optionsList.length, result);
        }
        return result;
      } finally {
        semaphore.release();
      }
    });

    return Promise.all(promises);
  }

  /**
   * Parse content into learning material structure
   */
  private async parseContent(
    options: ProcessingOptions,
    job: ParsingJob
  ): Promise<LearningMaterial | null> {
    const stage = job.stages.find(s => s.name === 'content_parsing')!;
    stage.status = 'processing';
    stage.startedAt = new Date();

    try {
      if (!options.content) {
        throw new Error('No content provided for parsing');
      }

      let material: LearningMaterial;
      const materialId = options.materialId;

      if (options.format === 'markdown' || options.format === undefined) {
        const result = await this.markdownParser.parseMarkdown(
          options.content,
          materialId,
          options.title
        );
        material = result.material;
      } else {
        // For other formats, create basic material structure
        material = this.createBasicMaterial(options);
      }

      // Update stage progress
      stage.status = 'completed';
      stage.completedAt = new Date();
      stage.progress = 1;

      // Update overall job progress
      job.progress = 0.2;
      if (options.onProgress) {
        options.onProgress(stage, 20);
      }

      return material;

    } catch (error) {
      stage.status = 'failed';
      stage.errorMessage = (error as Error).message;
      throw error;
    }
  }

  /**
   * Extract concepts using AI and rule-based methods
   */
  private async extractConcepts(
    material: LearningMaterial,
    job: ParsingJob,
    options: ProcessingOptions
  ): Promise<{ concepts: Concept[]; relationships: ProposedRelationship[] }> {
    const stage = job.stages.find(s => s.name === 'concept_extraction')!;
    stage.status = 'processing';
    stage.startedAt = new Date();

    const allConcepts: Concept[] = [];
    const allRelationships: ProposedRelationship[] = [];
    const errors: string[] = [];

    try {
      // Create documents from material sections
      const documents = this.createDocumentsFromMaterial(material);

      // AI Extraction
      if (this.config.enableAIExtraction && this.aiExtractor) {
        try {
          const aiResult = await this.aiExtractor.extractFromDocuments(documents, {
            models: this.config.aiModels,
            minConfidence: this.config.aiConfidenceThreshold,
            maxConcepts: this.config.maxConceptsPerDocument
          });

          allConcepts.push(...aiResult.concepts);
          allRelationships.push(...aiResult.relationships);

          // Update progress
          stage.progress = 0.4;
          job.progress = 0.4;
          if (options.onProgress) {
            options.onProgress(stage, 40);
          }

        } catch (error) {
          errors.push(`AI extraction failed: ${(error as Error).message}`);
          console.warn('AI extraction failed:', error);
        }
      }

      // Rule-based Extraction
      if (this.config.enableRuleExtraction) {
        try {
          const ruleResult = await this.ruleExtractor.extractFromContent(material.content);

          // Convert rule results to Concept format
          const ruleConcepts = ruleResult.concepts;
          const ruleRelationships = ruleResult.relationships;

          allConcepts.push(...ruleConcepts);
          allRelationships.push(...ruleRelationships);

          // Update progress
          stage.progress = 0.8;
          job.progress = 0.6;
          if (options.onProgress) {
            options.onProgress(stage, 60);
          }

        } catch (error) {
          errors.push(`Rule extraction failed: ${(error as Error).message}`);
          console.warn('Rule extraction failed:', error);
        }
      }

      // Filter by maximum concepts limit
      const sortedConcepts = allConcepts.sort((a, b) => b.confidence - a.confidence);
      const limitedConcepts = sortedConcepts.slice(0, this.config.maxConceptsPerDocument);

      stage.status = 'completed';
      stage.completedAt = new Date();
      stage.progress = 1;
      stage.result = { conceptCount: limitedConcepts.length, errors };

      return {
        concepts: limitedConcepts,
        relationships: allRelationships
      };

    } catch (error) {
      stage.status = 'failed';
      stage.errorMessage = (error as Error).message;
      throw error;
    }
  }

  /**
   * Process concepts (deduplication and validation)
   */
  private async processConcepts(
    concepts: Concept[],
    job: ParsingJob,
    options: ProcessingOptions
  ): Promise<Concept[]> {
    const stage = job.stages.find(s => s.name === 'concept_processing')!;
    stage.status = 'processing';
    stage.startedAt = new Date();

    try {
      let processedConcepts = concepts;

      // Deduplication
      if (this.config.enableDeduplication) {
        const deduplicationResult = await this.deduplicator.deduplicateConcepts(concepts);
        processedConcepts = deduplicationResult.uniqueConcepts;

        // Update progress
        stage.progress = 0.5;
        job.progress = 0.7;
        if (options.onProgress) {
          options.onProgress(stage, 70);
        }
      }

      // Validation
      if (this.config.enableValidation) {
        const validationResult = await this.deduplicator.validateConcepts(processedConcepts);
        processedConcepts = validationResult;

        // Filter by quality score
        if (this.config.strictValidation) {
          // Create validation results for all concepts
          const validationResults = await Promise.all(
            processedConcepts.map(async c => ({
              concept: c,
              validation: await this.deduplicator.validateConcept(c)
            }))
          );

          // Filter based on validation results
          processedConcepts = validationResults
            .filter(({ validation }) => validation.isValid && validation.score >= this.config.minQualityScore)
            .map(({ concept }) => concept);
        }
      }

      stage.status = 'completed';
      stage.completedAt = new Date();
      stage.progress = 1;
      stage.result = { processedCount: processedConcepts.length };

      // Update progress
      job.progress = 0.8;
      if (options.onProgress) {
        options.onProgress(stage, 80);
      }

      return processedConcepts;

    } catch (error) {
      stage.status = 'failed';
      stage.errorMessage = (error as Error).message;
      throw error;
    }
  }

  /**
   * Assemble final learning material
   */
  private async assembleLearningMaterial(
    baseMaterial: LearningMaterial,
    concepts: Concept[],
    relationships: ProposedRelationship[],
    job: ParsingJob
  ): Promise<LearningMaterial> {
    const stage = job.stages.find(s => s.name === 'material_assembly')!;
    stage.status = 'processing';
    stage.startedAt = new Date();

    try {
      // Create learning modules from concepts
      const modules = this.createLearningModules(concepts);

      // Update learning path
      const learningPath = {
        ...baseMaterial.learningPath,
        modules,
        estimatedDuration: modules.reduce((sum, m) => sum + m.estimatedTime, 0),
        difficulty: modules.length > 0
          ? Math.round(modules.reduce((sum, m) => sum + m.difficulty, 0) / modules.length)
          : baseMaterial.learningPath.difficulty
      };

      // Update sections with concept references
      const sections = baseMaterial.sections.map(section => ({
        ...section,
        concepts: concepts.filter(c =>
          this.isConceptInSection(c, section.content)
        ).map(c => c.id)
      }));

      const finalMaterial: LearningMaterial = {
        ...baseMaterial,
        concepts,
        sections,
        learningPath,
        // Basic assessments can be generated here
        assessments: this.createBasicAssessments(concepts)
      };

      stage.status = 'completed';
      stage.completedAt = new Date();
      stage.progress = 1;

      return finalMaterial;

    } catch (error) {
      stage.status = 'failed';
      stage.errorMessage = (error as Error).message;
      throw error;
    }
  }

  /**
   * Create documents from material sections
   */
  private createDocumentsFromMaterial(material: LearningMaterial): Document[] {
    return material.sections.map(section => ({
      pageContent: section.content,
      metadata: {
        sectionId: section.id,
        sectionTitle: section.title,
        sectionType: section.type,
        sectionOrder: section.order,
        materialId: material.id,
        materialTitle: material.title
      }
    }));
  }

  /**
   * Create basic material structure for non-markdown content
   */
  private createBasicMaterial(options: ProcessingOptions): LearningMaterial {
    const materialId = options.materialId;
    const title = options.title || 'Learning Material';

    return {
      id: materialId,
      title,
      type: 'markdown', // Default type
      content: options.content || '',
      sections: [{
        id: `section_${materialId}_0`,
        title,
        content: options.content || '',
        type: 'introduction',
        order: 0,
        concepts: [],
        prerequisites: [],
        estimatedTime: 30,
        metadata: {}
      }],
      concepts: [],
      learningPath: {
        id: `path_${materialId}`,
        title: `${title} Learning Path`,
        description: `Learning path for ${title}`,
        estimatedDuration: 30,
        difficulty: 3,
        modules: [],
        prerequisites: [],
        targetMastery: 4,
        adaptations: [],
        progress: {
          userId: '',
          currentModule: '',
          completedModules: [],
          currentConcept: '',
          masteredConcepts: [],
          timeSpent: 0,
          assessmentScores: [],
          lastAccess: new Date(),
          completionRate: 0,
          masteryLevel: 0
        }
      },
      assessments: [],
      estimatedDuration: 30,
      difficultyLevel: 3,
      tags: [],
      metadata: options.metadata || {},
      processedAt: new Date()
    };
  }

  /**
   * Create learning modules from concepts
   */
  private createLearningModules(concepts: Concept[]): any[] {
    // Group concepts by difficulty and type
    const groups = this.groupConcepts(concepts);

    return groups.map((group, index) => ({
      id: `module_${Date.now()}_${index}`,
      title: this.generateModuleTitle(group),
      description: this.generateModuleDescription(group),
      concepts: group.map(c => c.id),
      order: index,
      isOptional: group.every(c => c.difficulty <= 2),
      estimatedTime: group.reduce((sum, c) => sum + this.estimateConceptTime(c), 0),
      difficulty: Math.round(group.reduce((sum, c) => sum + c.difficulty, 0) / group.length),
      resources: [],
      assessments: [],
      completionCriteria: {
        type: 'mixed' as const,
        threshold: 70,
        assessments: [],
        required: true
      }
    }));
  }

  /**
   * Group concepts by difficulty and type
   */
  private groupConcepts(concepts: Concept[]): Concept[][] {
    const groups: Concept[][] = [];
    const maxGroupSize = 5;
    const maxDifficultyRange = 2;

    // Sort concepts by difficulty
    const sortedConcepts = [...concepts].sort((a, b) => a.difficulty - b.difficulty);

    let currentGroup: Concept[] = [];

    for (const concept of sortedConcepts) {
      if (currentGroup.length === 0) {
        currentGroup.push(concept);
      } else {
        const avgDifficulty = currentGroup.reduce((sum, c) => sum + c.difficulty, 0) / currentGroup.length;
        const difficultyDiff = Math.abs(concept.difficulty - avgDifficulty);

        if (currentGroup.length < maxGroupSize && difficultyDiff <= maxDifficultyRange) {
          currentGroup.push(concept);
        } else {
          groups.push(currentGroup);
          currentGroup = [concept];
        }
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Generate module title from concepts
   */
  private generateModuleTitle(concepts: Concept[]): string {
    if (concepts.length === 1) {
      return concepts[0].name;
    }

    const primaryConcept = concepts.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    const types = [...new Set(concepts.map(c => c.type))];
    const avgDifficulty = Math.round(concepts.reduce((sum, c) => sum + c.difficulty, 0) / concepts.length);

    let title = primaryConcept.name;

    if (types.length > 1) {
      title += ` and Related Concepts`;
    } else {
      const typeLabel = {
        topic: 'Topics',
        skill: 'Skills',
        fact: 'Key Facts',
        procedure: 'Procedures',
        principle: 'Principles'
      }[types[0]] || 'Concepts';

      title += `: ${typeLabel}`;
    }

    return title;
  }

  /**
   * Generate module description
   */
  private generateModuleDescription(concepts: Concept[]): string {
    const avgDifficulty = Math.round(concepts.reduce((sum, c) => sum + c.difficulty, 0) / concepts.length);
    const descriptions = concepts
      .filter(c => c.description && c.description.length > 20)
      .map(c => c.description)
      .slice(0, 3);

    if (descriptions.length > 0) {
      return `Learn about ${concepts.map(c => c.name).join(', ')}. ${descriptions.join(' ')}`;
    }

    return `This module covers ${concepts.length} important concept${concepts.length > 1 ? 's' : ''} with an average difficulty level of ${avgDifficulty}.`;
  }

  /**
   * Estimate time needed for a concept
   */
  private estimateConceptTime(concept: Concept): number {
    const baseTime = 15; // minutes
    const difficultyMultiplier = concept.difficulty;
    const confidenceMultiplier = concept.confidence < 0.7 ? 1.5 : 1.0;

    return Math.round(baseTime * difficultyMultiplier * confidenceMultiplier);
  }

  /**
   * Check if concept is mentioned in section content
   */
  private isConceptInSection(concept: Concept, sectionContent: string): boolean {
    const content = sectionContent.toLowerCase();
    const conceptName = concept.name.toLowerCase();

    // Direct name match
    if (content.includes(conceptName)) {
      return true;
    }

    // Check in evidence
    for (const evidence of concept.evidence) {
      if (content.includes(evidence.text.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  /**
   * Resolve concept ID from name
   */
  private resolveConceptId(name: string, concepts: Concept[]): string | null {
    const concept = concepts.find(c =>
      c.name.toLowerCase() === name.toLowerCase()
    );
    return concept?.id || null;
  }

  /**
   * Create basic assessments from concepts
   */
  private createBasicAssessments(concepts: Concept[]): any[] {
    // For now, return empty array. Full assessment generation would be complex
    return [];
  }

  /**
   * Create final statistics
   */
  private createFinalStatistics(
    material: LearningMaterial,
    concepts: Concept[],
    relationships: ProposedRelationship[],
    processingTime: number,
    job: ParsingJob
  ): ParsingStatistics {
    const confidenceDistribution: Record<string, number> = {};
    const difficultyDistribution: Record<number, number> = {};
    const typeDistribution: Record<string, number> = {};

    concepts.forEach(concept => {
      const confidenceRange = this.getConfidenceRange(concept.confidence);
      confidenceDistribution[confidenceRange] = (confidenceDistribution[confidenceRange] || 0) + 1;

      difficultyDistribution[concept.difficulty] = (difficultyDistribution[concept.difficulty] || 0) + 1;
      typeDistribution[concept.type] = (typeDistribution[concept.type] || 0) + 1;
    });

    const modelUsage: Record<string, number> = {};
    concepts.forEach(concept => {
      if (concept.metadata.extractedBy) {
        concept.metadata.extractedBy.forEach(modelId => {
          modelUsage[modelId] = (modelUsage[modelId] || 0) + 1;
        });
      }
    });

    return {
      totalConcepts: concepts.length,
      validConcepts: concepts.filter(c => c.confidence >= this.config.aiConfidenceThreshold).length,
      totalRelationships: relationships.length,
      confidenceDistribution,
      difficultyDistribution,
      typeDistribution,
      processingTime,
      modelUsage
    };
  }

  /**
   * Get confidence range category
   */
  private getConfidenceRange(confidence: number): string {
    if (confidence >= 0.9) return 'very_high';
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.5) return 'medium';
    if (confidence >= 0.3) return 'low';
    return 'very_low';
  }

  /**
   * Create parsing job
   */
  private createParsingJob(options: ProcessingOptions): ParsingJob {
    return {
      id: `job_${options.materialId}_${Date.now()}`,
      materialId: options.materialId,
      status: 'pending',
      progress: 0,
      stages: [
        { name: 'content_parsing', status: 'pending', progress: 0 },
        { name: 'concept_extraction', status: 'pending', progress: 0 },
        { name: 'concept_processing', status: 'pending', progress: 0 },
        { name: 'material_assembly', status: 'pending', progress: 0 },
        { name: 'finalization', status: 'pending', progress: 0 }
      ]
    };
  }

  /**
   * Get pipeline configuration
   */
  getConfig(): PipelineConfig {
    return { ...this.config };
  }

  /**
   * Update pipeline configuration
   */
  updateConfig(newConfig: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update component configurations
    if (newConfig.deduplicationThreshold) {
      this.deduplicator.updateConfig({
        similarityThreshold: newConfig.deduplicationThreshold
      });
    }
  }

  /**
   * Get available AI models
   */
  getAvailableModels(): string[] {
    return this.aiExtractor?.getAvailableModels() || [];
  }

  /**
   * Add AI model to extractor
   */
  addAIModel(model: LangChainProviderAdapter): void {
    if (this.aiExtractor) {
      this.aiExtractor.addModel(model);
    } else {
      this.aiExtractor = new AIConceptExtractor([model]);
    }
  }

  /**
   * Remove AI model from extractor
   */
  removeAIModel(modelId: string): void {
    if (this.aiExtractor) {
      this.aiExtractor.removeModel(modelId);
    }
  }

  /**
   * Export pipeline results to API response format
   */
  exportToAPIResponse(result: PipelineResult): ConceptParsingResponse {
    return {
      success: result.success,
      data: result.material ? {
        concepts: result.concepts,
        relationships: result.relationships,
        learningPath: result.material.learningPath,
        assessments: result.material.assessments
      } : undefined,
      errors: result.errors.map(e => e.message),
      warnings: result.warnings,
      metadata: {
        processingTime: result.processingTime,
        modelUsage: result.statistics.modelUsage,
        timestamp: new Date()
      }
    };
  }
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
  private permits: number;
  private waitQueue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      resolve();
      this.permits--;
    }
  }
}

export default ConceptProcessingPipeline;