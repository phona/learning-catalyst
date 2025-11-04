/**
 * Concept Parsing Service
 *
 * This service handles the parsing of local markdown files to extract concepts,
 * relationships, and learning materials using AI and rule-based approaches.
 *
 * This service now leverages the comprehensive concept-parsing module for
 * advanced parsing capabilities including deduplication, validation, and
 * LangChain integration.
 */

import type {
  Concept,
  ConceptEvidence,
  ProposedRelationship,
  LearningMaterial,
  ParsingJob,
  ParsingResult,
  ParsingStatistics,
  ConceptParsingResponse,
  ValidationError
} from '@/types/concept-parsing';
import {
  ConceptParsingError,
  AIExtractionError
} from '@/types/concept-parsing';
import type { FileSystemItem } from '@/types/filesystem';
import type { Message, ChatOptions } from '@/types/ai';
import type { Session } from '@/types/session';
import { ModelFactory } from '@/services/ModelFactory';
import type { AppConfig } from '@/types/config';
import type { ConfigService } from '@/services/configService';

// Import the concept parsing module
import {
  createConceptPipeline,
  extractConceptsFromContent,
  ConceptProcessingPipeline,
  type PipelineConfig,
  type ProcessingOptions,
  type PipelineResult
} from '@/modules/concept-parsing';
import { LangChainModelFactory } from '@/modules/concept-parsing/langchain-adapter';
import type { AIProvider } from '@/types/ai';

export interface ParsingOptions {
  confidenceThreshold: number;
  maxConceptsPerFile: number;
  includeRelationships: boolean;
  extractLearningPaths?: boolean;
  extractAssessments?: boolean;
}

export interface FileParsingRequest {
  filePaths: string[];
  directoryPaths: string[];
  options: ParsingOptions;
  userId: string;
}

export interface FileParsingResult {
  filePath: string;
  success: boolean;
  concepts: Concept[];
  relationships: ProposedRelationship[];
  errors: string[];
  processingTime: number;
}

export class ConceptParsingService {
  private activeJobs: Map<string, ParsingJob> = new Map();
  private pipeline: ConceptProcessingPipeline | null = null;
  private readonly DEFAULT_OPTIONS: ParsingOptions = {
    confidenceThreshold: 0.6,
    maxConceptsPerFile: 50,
    includeRelationships: true,
    extractLearningPaths: true,
    extractAssessments: false
  };

  constructor(
    private readonly agentManager: AgentManager,
    private readonly configService: ConfigService
  ) {}

  /**
   * Initialize the concept parsing pipeline
   */
  private async initializePipeline(options: ParsingOptions): Promise<void> {
    if (this.pipeline) {
      return; // Already initialized
    }

    const globalConfig = await this.getGlobalAIConfig();

    const pipelineConfig: Partial<PipelineConfig> = {
      enableAIExtraction: true, // Always use AI
      enableRuleExtraction: false, // Remove rule-based extraction
      enableDeduplication: true,
      enableValidation: true,
      aiConfidenceThreshold: options.confidenceThreshold,
      maxConceptsPerDocument: options.maxConceptsPerFile,
      enableParallelProcessing: true,
      maxConcurrency: 3,
      timeout: 300000
    };

    try {
      await this.ensureAIProviderInitialized();
      const providerInfo = await this.agentManager.getProviderInfo();

      if (providerInfo) {
          console.log(`Creating concept pipeline with global AI config: Provider: ${providerInfo.type} | Model: ${globalConfig.model} | Temperature: ${globalConfig.temperature} | Max Tokens: ${globalConfig.maxTokens}`);

          // Create LangChain adapter for the AI provider
          const adapter = ModelFactory.createModel(
              providerInfo.type,
              {
                  type: providerInfo.type,
                  model: globalConfig.model,
                  temperature: globalConfig.temperature,
                  max_tokens: globalConfig.maxTokens
              }
          );

          this.pipeline = new ConceptProcessingPipeline([adapter], pipelineConfig);
        } else {
          throw new Error('AI provider not initialized');
        }
    } catch (error) {
      console.error('Failed to initialize AI pipeline:', error);
      throw new Error(`AI provider initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please configure AI provider in settings.`);
    }
  }

  /**
   * Parse local markdown files to extract concepts
   */
  async parseLocalFiles(request: FileParsingRequest): Promise<ParsingJob> {
    const jobId = this.generateJobId();
    const job: ParsingJob = {
      id: jobId,
      materialId: `discovery-${Date.now()}`,
      status: 'pending',
      progress: 0,
      stages: this.initializeParsingStages(),
      startedAt: new Date()
    };

    this.activeJobs.set(jobId, job);

    // Start parsing in background
    this.processParsingJob(jobId, request).catch(error => {
      console.error('Parsing job failed:', error);
      const failedJob = this.activeJobs.get(jobId);
      if (failedJob) {
        failedJob.status = 'failed';
        failedJob.errorMessage = error.message;
        failedJob.completedAt = new Date();
      }
    });

    return job;
  }

  /**
   * Get parsing job status
   */
  getJobStatus(jobId: string): ParsingJob | undefined {
    return this.activeJobs.get(jobId);
  }

  /**
   * Get all active jobs
   */
  getActiveJobs(): ParsingJob[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Cancel a parsing job
   */
  cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (job && job.status !== 'completed' && job.status !== 'failed') {
      job.status = 'failed';
      job.errorMessage = 'Job cancelled by user';
      job.completedAt = new Date();
      return true;
    }
    return false;
  }

  private async processParsingJob(jobId: string, request: FileParsingRequest): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    try {
      job.status = 'processing';
      await this.updateJobProgress(job, 0.05, 'Starting file collection...');

      // Always validate AI provider since we only support AI extraction
      await this.updateJobProgress(job, 0.07, 'Validating AI provider...');
      const providerInfo = await this.agentManager.getProviderInfo();
      if (!providerInfo) {
        throw new Error('AI provider not configured. Please configure an AI provider in Settings > AI Providers.');
      }

      // Collect all files to process
      await this.updateJobProgress(job, 0.1, 'Collecting files...');
      const allFiles = await this.collectFiles(request);

      if (allFiles.length === 0) {
        throw new Error('No valid markdown files found to parse. Please check that selected files exist and contain markdown content.');
      }

      await this.updateJobProgress(job, 0.15, `Found ${allFiles.length} files to process`);

      // Pre-validate files
      await this.updateJobProgress(job, 0.2, 'Validating files...');
      const validFiles = await this.preValidateFiles(allFiles);

      if (validFiles.length === 0) {
        throw new Error('No files passed validation. Files may be empty, unreadable, or not contain markdown content.');
      }

      // Process files in batches
      const results: FileParsingResult[] = [];
      const batchSize = 3; // Smaller batch size for better progress tracking
      let totalConceptsExtracted = 0;

      for (let i = 0; i < validFiles.length; i += batchSize) {
        const batch = validFiles.slice(i, i + batchSize);

        await this.updateJobProgress(job, 0.2 + (i / validFiles.length) * 0.7,
          `Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(validFiles.length/batchSize)} (${i}/${validFiles.length} files)...`);

        const batchResults = await this.processFileBatch(batch, request.options);
        results.push(...batchResults);

        // Count concepts extracted so far
        totalConceptsExtracted += batchResults.reduce((sum, result) => sum + result.concepts.length, 0);

        await this.updateJobProgress(job, 0.2 + ((i + batch.length) / validFiles.length) * 0.7,
          `Processed ${i + batch.length}/${validFiles.length} files, ${totalConceptsExtracted} concepts found...`);
      }

      // Compile final results
      await this.updateJobProgress(job, 0.9, 'Compiling results...');
      const parsingResult = await this.compileResults(results, request);

      // Validate final results
      if (!parsingResult.concepts || parsingResult.concepts.length === 0) {
        throw new Error('No concepts were extracted from the files. The files may not contain recognizable concept patterns. Try selecting files with markdown headers or technical content.');
      }

      await this.updateJobProgress(job, 0.95, `Finalizing: ${parsingResult.concepts.length} concepts extracted`);

      // Complete job successfully
      job.result = parsingResult;
      job.status = 'completed';
      job.progress = 1.0;
      job.completedAt = new Date();

      console.log(`Concept parsing completed successfully: ${parsingResult.concepts.length} concepts from ${validFiles.length} files`);

    } catch (error) {
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      console.error('Concept parsing job failed:', job.errorMessage);
      throw error;
    }
  }

  private async collectFiles(request: FileParsingRequest): Promise<string[]> {
    const allFiles: string[] = [];

    // Add individual files
    allFiles.push(...request.filePaths);

    // Scan directories for markdown files
    for (const dirPath of request.directoryPaths) {
      try {
        const items = await window.electronAPI.readDirectory(dirPath, true, 10);
        const markdownFiles = items
          .filter(item => item.isFile && item.isMarkdown)
          .map(item => item.path);
        allFiles.push(...markdownFiles);
      } catch (error) {
        console.warn(`Failed to scan directory ${dirPath}:`, error);
        throw new Error(`Failed to scan directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Remove duplicates and validate files
    const uniqueFiles = [...new Set(allFiles)];
    const validFiles = [];

    for (const filePath of uniqueFiles) {
      try {
        const exists = await window.electronAPI.existsFile(filePath);
        if (exists) {
          validFiles.push(filePath);
        } else {
          console.warn(`File does not exist: ${filePath}`);
        }
      } catch (error) {
        console.warn(`Cannot access file ${filePath}:`, error);
        throw new Error(`Cannot access file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return validFiles;
  }

  private async preValidateFiles(filePaths: string[]): Promise<string[]> {
    const validFiles = [];

    for (const filePath of filePaths) {
      try {
        // Check if file exists and is readable
        const exists = await window.electronAPI.existsFile(filePath);
        if (!exists) {
          console.warn(`File does not exist: ${filePath}`);
          continue;
        }

        // Read file content and validate
        const content = await window.electronAPI.readFile(filePath);

        // Check if content is meaningful
        if (!content || content.trim().length === 0) {
          console.warn(`File is empty: ${filePath}`);
          continue;
        }

        // Check if file contains markdown patterns
        const hasMarkdownContent = this.containsMarkdownPatterns(content);
        if (!hasMarkdownContent) {
          console.warn(`File does not contain recognizable markdown content: ${filePath}`);
          continue;
        }

        // Check if file is reasonable size (not too large, not too small)
        if (content.length < 50) {
          console.warn(`File too small for meaningful concept extraction: ${filePath} (${content.length} characters)`);
          continue;
        }

        if (content.length > 100000) { // 100KB limit
          console.warn(`File too large for processing: ${filePath} (${content.length} characters)`);
          continue;
        }

        validFiles.push(filePath);
        console.log(`File validated: ${filePath} (${content.length} characters)`);

      } catch (error) {
        console.warn(`Failed to validate file ${filePath}:`, error);
        // Continue with other files instead of failing the entire job
      }
    }

    return validFiles;
  }

  private containsMarkdownPatterns(content: string): boolean {
    // Check for common markdown patterns that might contain concepts
    const markdownPatterns = [
      /^#{1,6}\s+/m, // Headers
      /```[\s\S]*?```/, // Code blocks
      /`[^`]+`/, // Inline code
      /^[-*+]\s+/m, // Lists
      /\*\*[^*]+\*\*/, // Bold text
      /\*[^*]+\*/, // Italic text
      /\[([^\]]+)\]\([^)]+\)/, // Links
      /^\|.*\|.*\|/m, // Tables
    ];

    return markdownPatterns.some(pattern => pattern.test(content));
  }

  private async processFileBatch(filePaths: string[], options: ParsingOptions): Promise<FileParsingResult[]> {
    const results: FileParsingResult[] = [];

    for (const filePath of filePaths) {
      const startTime = Date.now();
      try {
        const result = await this.parseSingleFile(filePath, options);
        results.push({
          filePath,
          success: true,
          concepts: result.concepts,
          relationships: result.relationships,
          errors: [],
          processingTime: Date.now() - startTime
        });
      } catch (error) {
        results.push({
          filePath,
          success: false,
          concepts: [],
          relationships: [],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          processingTime: Date.now() - startTime
        });
      }
    }

    return results;
  }

  private async parseSingleFile(filePath: string, options: ParsingOptions): Promise<ParsingResult> {
    try {
      // Initialize pipeline if not already done
      await this.initializePipeline(options);

      if (!this.pipeline) {
        throw new Error('Failed to initialize concept parsing pipeline');
      }

      // Read file content
      const content = await window.electronAPI.readFile(filePath);
      const fileName = filePath.split(/[\/\\]/).pop() || '';

      // Create processing options for the module
      const processingOptions: ProcessingOptions = {
        materialId: `file_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        title: fileName,
        content,
        filePath,
        format: 'markdown',
        onProgress: (stage, progress) => {
          // Progress tracking could be implemented here if needed
          console.log(`Processing ${fileName}: ${stage.name} - ${Math.round(progress * 100)}%`);
        }
      };

      // Use the concept parsing module
      const pipelineResult: PipelineResult = await this.pipeline.processContent(processingOptions);

      if (!pipelineResult.success) {
        throw new Error(`Pipeline processing failed: ${pipelineResult.errors.map(e => e.message).join(', ')}`);
      }

      // Convert pipeline result to ParsingResult format
      return {
        concepts: pipelineResult.concepts,
        relationships: pipelineResult.relationships,
        learningPath: pipelineResult.material?.learningPath || this.generateBasicLearningPath(pipelineResult.concepts),
        assessments: pipelineResult.material?.assessments || [],
        statistics: pipelineResult.statistics,
        errors: pipelineResult.errors.map(e => ({
          type: e.type as any,
          message: e.message,
          severity: e.severity as any,
          timestamp: e.timestamp
        }))
      };

    } catch (error) {
      throw new ConceptParsingError(
        `Failed to parse file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'parsing',
        filePath,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Ensure AI provider is initialized with global configuration
   */
  private async ensureAIProviderInitialized(): Promise<void> {
    const globalConfig = await this.getGlobalAIConfig();
    const config = await this.configService.getConfig();

    // Check if provider is already initialized and matches global config
    const currentProviderInfo = await this.agentManager.getProviderInfo();
    if (currentProviderInfo && currentProviderInfo.type === globalConfig.provider) {
      console.log(`AI provider '${globalConfig.provider}' already initialized`);
      return;
    }

    // Get provider configuration from global config
    const providerConfig = config.ai.providers?.[globalConfig.provider as keyof typeof config.ai.providers];

    try {
      console.log(`AI provider '${globalConfig.provider}' configuration ready`);
      // AgentManager handles model initialization automatically
      console.log(`AI provider '${globalConfig.provider}' available through AgentManager`);
    } catch (error) {
      throw new Error(`Failed to prepare AI provider '${globalConfig.provider}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Navigate to settings page for AI configuration
   */
  public static navigateToSettings(): void {
    window.location.hash = '/settings';
  }

  /**
   * Get global AI configuration for concept parsing
   */
  private async getGlobalAIConfig(): Promise<{
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
    enableThinking: boolean;
  }> {
    // Get current config from configService
    const config = await this.configService.getConfig();

    if (!config?.ai) {
      throw new Error('AI configuration is required but not available');
    }

    const chatConfig = config.ai.model_types.chat;
    const globalConfig = {
      provider: chatConfig.default_provider,
      model: chatConfig.default_model,
      temperature: chatConfig.settings.temperature || 0.7,
      maxTokens: chatConfig.settings.max_tokens || 2000,
      enableThinking: chatConfig.capabilities.thinking || false
    };

    // Validate that all required fields are present
    if (!globalConfig.provider || !globalConfig.model) {
      throw new Error('Incomplete AI configuration provided to ConceptParsingService');
    }

    console.log('Global AI Config:', `${globalConfig.provider}/${globalConfig.model}`);
    console.log('Full global AI config details:', globalConfig);

    return globalConfig;
  }

  private async compileResults(results: FileParsingResult[], request: FileParsingRequest): Promise<ParsingResult> {
    const allConcepts: Concept[] = [];
    const allRelationships: ProposedRelationship[] = [];
    const allErrors: string[] = [];
    let totalProcessingTime = 0;

    // Aggregate results
    for (const result of results) {
      if (result.success) {
        allConcepts.push(...result.concepts);
        allRelationships.push(...result.relationships);
      } else {
        allErrors.push(...result.errors);
      }
      totalProcessingTime += result.processingTime;
    }

    // Remove duplicate concepts (by name)
    const uniqueConcepts = this.deduplicateConcepts(allConcepts);

    // Generate statistics
    const statistics: ParsingStatistics = {
      totalConcepts: allConcepts.length,
      validConcepts: uniqueConcepts.length,
      totalRelationships: allRelationships.length,
      confidenceDistribution: this.calculateConfidenceDistribution(uniqueConcepts),
      difficultyDistribution: this.calculateDifficultyDistribution(uniqueConcepts),
      typeDistribution: this.calculateTypeDistribution(uniqueConcepts),
      processingTime: totalProcessingTime,
      modelUsage: true ? { 'AI': results.length } : {}
    };

    return {
      concepts: uniqueConcepts,
      relationships: allRelationships,
      learningPath: this.generateBasicLearningPath(uniqueConcepts),
      assessments: [], // TODO: Implement assessment generation
      statistics,
      errors: allErrors.map((error, index) => ({
        type: 'parsing' as const,
        message: error,
        severity: 'medium' as const,
        timestamp: new Date()
      }))
    };
  }

  private deduplicateConcepts(concepts: Concept[]): Concept[] {
    const seen = new Map<string, Concept>();

    for (const concept of concepts) {
      const key = concept.name.toLowerCase();
      if (!seen.has(key) || concept.confidence > seen.get(key)!.confidence) {
        seen.set(key, concept);
      }
    }

    return Array.from(seen.values());
  }

  private generateBasicLearningPath(concepts: Concept[]): any {
    // Use the concept parsing module's learning path generation
    // This is a simplified fallback version
    return {
      id: this.generateId(),
      title: 'Learning Path from Discovery',
      description: 'Generated from extracted concepts',
      estimatedDuration: concepts.length * 15, // 15 minutes per concept
      difficulty: concepts.length > 0 ? concepts.reduce((sum, c) => sum + c.difficulty, 0) / concepts.length : 3,
      modules: [],
      prerequisites: [],
      targetMastery: 0.8,
      adaptations: [],
      progress: {
        userId: 'current-user',
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
    };
  }

  private calculateConfidenceDistribution(concepts: Concept[]): Record<string, number> {
    const distribution: Record<string, number> = {
      'high': 0,
      'medium': 0,
      'low': 0
    };

    concepts.forEach(concept => {
      if (concept.confidence >= 0.8) distribution.high++;
      else if (concept.confidence >= 0.6) distribution.medium++;
      else distribution.low++;
    });

    return distribution;
  }

  private calculateDifficultyDistribution(concepts: Concept[]): Record<number, number> {
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    concepts.forEach(concept => {
      distribution[concept.difficulty]++;
    });

    return distribution;
  }

  private calculateTypeDistribution(concepts: Concept[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    concepts.forEach(concept => {
      distribution[concept.type] = (distribution[concept.type] || 0) + 1;
    });

    return distribution;
  }

  private initializeParsingStages(): any[] {
    return [
      { name: 'file-collection', status: 'pending' as const, progress: 0 },
      { name: 'content-analysis', status: 'pending' as const, progress: 0 },
      { name: 'concept-extraction', status: 'pending' as const, progress: 0 },
      { name: 'relationship-analysis', status: 'pending' as const, progress: 0 },
      { name: 'validation', status: 'pending' as const, progress: 0 },
      { name: 'compilation', status: 'pending' as const, progress: 0 }
    ];
  }

  private async updateJobProgress(job: ParsingJob, progress: number, message: string): Promise<void> {
    job.progress = progress;

    // Update individual stage progress
    const stageIndex = Math.floor(progress * job.stages.length);
    if (stageIndex < job.stages.length) {
      const stage = job.stages[stageIndex];
      if (stage.status === 'pending') {
        stage.status = 'processing';
        stage.startedAt = new Date();
      }
      stage.progress = (progress * job.stages.length) % 1;

      if (stage.progress >= 1) {
        stage.status = 'completed';
        stage.completedAt = new Date();
      }
    }
  }

  private generateJobId(): string {
    return `job-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  private generateConceptId(): string {
    return `concept-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}