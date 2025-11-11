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
} from '@/shared/types/concept-parsing';
import {
  ConceptParsingError,
  AIExtractionError
} from '@/shared/types/concept-parsing';
import type { FileSystemItem } from '@/shared/types/filesystem';
import type { Message, ChatOptions } from '@/shared/types/ai';
import type { Session } from '@/shared/types/session';
import type { AppConfig } from '@/shared/types/config';
import type { ConfigurationService } from '@/renderer/services/configuration/configuration-service';

// No main process imports - using high-level API instead

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
  private readonly DEFAULT_OPTIONS: ParsingOptions = {
    confidenceThreshold: 0.6,
    maxConceptsPerFile: 50,
    includeRelationships: true,
    extractLearningPaths: true,
    extractAssessments: false
  };

  constructor(
    private readonly configService: ConfigurationService
  ) {}

  // No pipeline initialization needed - using high-level knowledge API

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

      // Collect all files to process
      await this.updateJobProgress(job, 0.1, 'Collecting files...');
      const allFiles = await this.collectFiles(request);

      if (allFiles.length === 0) {
        throw new Error('No valid markdown files found to parse. Please check that selected files exist and contain markdown content.');
      }

      await this.updateJobProgress(job, 0.2, `Found ${allFiles.length} files to process`);

      // Pre-validate files
      await this.updateJobProgress(job, 0.3, 'Validating files...');
      const validFiles = await this.preValidateFiles(allFiles);

      if (validFiles.length === 0) {
        throw new Error('No files passed validation. Files may be empty, unreadable, or not contain markdown content.');
      }

      // Prepare files for API call
      await this.updateJobProgress(job, 0.4, 'Reading file contents...');
      const filesForAPI = [];
      for (const filePath of validFiles) {
        const content = await window.electronAPI.readFile(filePath);
        const fileName = filePath.split(/[\/\\]/).pop() || '';
        filesForAPI.push({
          fileName,
          filePath,
          content,
          title: fileName.replace(/\.(md|markdown)$/, '').replace(/[-_]/g, ' ')
        });
      }

      // Call knowledge API for concept parsing
      await this.updateJobProgress(job, 0.5, 'Extracting concepts using AI...');

      const parsingResult = await window.electronAPI.knowledge.parseConcepts({
        files: filesForAPI,
        options: {
          confidenceThreshold: request.options.confidenceThreshold,
          maxConceptsPerFile: request.options.maxConceptsPerFile
        }
      });

      if (!parsingResult.success) {
        throw new Error(`Concept parsing failed: ${parsingResult.errors.join(', ')}`);
      }

      await this.updateJobProgress(job, 0.9, 'Finalizing results...');

      // Validate final results
      if (!parsingResult.concepts || parsingResult.concepts.length === 0) {
        throw new Error('No concepts were extracted from the files. The files may not contain recognizable concept patterns. Try selecting files with markdown headers or technical content.');
      }

      await this.updateJobProgress(job, 0.95, `Finalizing: ${parsingResult.concepts.length} concepts extracted`);

      // Convert API result to ParsingResult format
      const finalResult = {
        concepts: parsingResult.concepts.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          type: c.type,
          confidence: c.confidence,
          difficulty: c.difficulty,
          evidence: c.evidence,
          metadata: c.metadata
        })),
        relationships: parsingResult.relationships.map(r => ({
          sourceId: r.sourceId,
          targetId: r.targetId,
          type: r.type,
          strength: r.strength,
          confidence: r.confidence,
          description: r.description
        })),
        learningPath: this.generateBasicLearningPath(parsingResult.concepts),
        assessments: [], // TODO: Implement assessment generation
        statistics: parsingResult.statistics,
        errors: parsingResult.errors.map((error, index) => ({
          type: 'parsing' as const,
          message: error,
          severity: 'medium' as const,
          timestamp: new Date()
        }))
      };

      // Complete job successfully
      job.result = finalResult;
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

  // Unused methods removed - using knowledge API instead

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
