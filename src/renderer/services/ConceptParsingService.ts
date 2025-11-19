/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */

import type {
  Concept,
  ProposedRelationship,
  ParsingJob,
  ParsingResult
} from '@/shared/types/concept-parsing';

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

export interface ConceptParsingService {
  parseLocalFiles(request: FileParsingRequest): Promise<ParsingJob>;
  getJobStatus(jobId: string): ParsingJob | undefined;
  getActiveJobs(): ParsingJob[];
  cancelJob(jobId: string): boolean;
}

export const createConceptParsingService = (): ConceptParsingService => {
  const activeJobs = new Map<string, ParsingJob>();
  const DEFAULT_OPTIONS: ParsingOptions = {
    confidenceThreshold: 0.6,
    maxConceptsPerFile: 50,
    includeRelationships: true,
    extractLearningPaths: true,
    extractAssessments: false
  };

  const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  const initializeParsingStages = () => [
    { name: 'file-collection', status: 'pending' as const, progress: 0 },
    { name: 'content-analysis', status: 'pending' as const, progress: 0 },
    { name: 'concept-extraction', status: 'pending' as const, progress: 0 },
    { name: 'relationship-analysis', status: 'pending' as const, progress: 0 },
    { name: 'validation', status: 'pending' as const, progress: 0 },
    { name: 'compilation', status: 'pending' as const, progress: 0 }
  ];

  const updateStageProgress = (job: ParsingJob, progress: number) => {
    const stageIndex = Math.min(Math.floor(progress * job.stages.length), job.stages.length - 1);
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
  };

  const updateJobProgress = async (job: ParsingJob, progress: number, message: string) => {
    job.progress = progress;
    job.lastUpdate = message;
    updateStageProgress(job, progress);
  };

  const generateJob = (): ParsingJob => ({
    id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    materialId: `discovery-${Date.now()}`,
    status: 'pending',
    progress: 0,
    stages: initializeParsingStages(),
    startedAt: new Date()
  });

  const parseLocalFiles = async (request: FileParsingRequest): Promise<ParsingJob> => {
    const job = generateJob();
    activeJobs.set(job.id, job);

    processParsingJob(job.id, request).catch((error) => {
      console.error('Parsing job failed:', error);
      const failedJob = activeJobs.get(job.id);
      if (failedJob) {
        failedJob.status = 'failed';
        failedJob.errorMessage = error instanceof Error ? error.message : String(error);
        failedJob.completedAt = new Date();
      }
    });

    return job;
  };

  const getJobStatus = (jobId: string) => activeJobs.get(jobId);
  const getActiveJobs = () => Array.from(activeJobs.values());
  const cancelJob = (jobId: string) => {
    const job = activeJobs.get(jobId);
    if (job && job.status !== 'completed' && job.status !== 'failed') {
      job.status = 'failed';
      job.errorMessage = 'Job cancelled by user';
      job.completedAt = new Date();
      return true;
    }
    return false;
  };

  const collectFiles = async (request: FileParsingRequest): Promise<string[]> => {
    const files: string[] = [...request.filePaths];
    for (const dirPath of request.directoryPaths) {
      try {
        const items = await window.electronAPI.readDirectory(dirPath, true, 10);
        files.push(
          ...items.filter(i => i.isFile && i.isMarkdown).map(i => i.path)
        );
      } catch (error) {
        throw new Error(`Failed to scan directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    return [...new Set(files)];
  };

  const preValidateFiles = async (filePaths: string[]): Promise<string[]> => {
    const validFiles: string[] = [];
    for (const filePath of filePaths) {
      try {
        if (!(await window.electronAPI.existsFile(filePath))) continue;
        const content = await window.electronAPI.readFile(filePath);
        if (!content?.trim()) continue;
        if (!containsMarkdownPatterns(content)) continue;
        if (content.length < 50 || content.length > 100000) continue;
        validFiles.push(filePath);
      } catch (error) {
        console.warn(`Failed to validate file ${filePath}:`, error);
      }
    }
    return validFiles;
  };

  const containsMarkdownPatterns = (content: string) => {
    const patterns = [
      /^#{1,6}\s+/m,
      /```[\s\S]*?```/,
      /`[^`]+`/,
      /^[-*+]\s+/m,
      /\*\*[^*]+\*\*/,
      /\*[^*]+\*/,
      /\[([^\]]+)\]\([^)]+\)/,
      /^\|.*\|.*\|/m
    ];
    return patterns.some(pattern => pattern.test(content));
  };

  const generateBasicLearningPath = (concepts: Concept[]) => ({
    id: generateId(),
    title: 'Learning Path from Discovery',
    description: 'Generated from extracted concepts',
    estimatedDuration: concepts.length * 15,
    difficulty: concepts.length ? concepts.reduce((sum, c) => sum + c.difficulty, 0) / concepts.length : 3,
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
  });

  const processParsingJob = async (jobId: string, request: FileParsingRequest) => {
    const job = activeJobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      await updateJobProgress(job, 0.1, 'Collecting files...');
      const files = await collectFiles(request);
      if (!files.length) throw new Error('No files found to parse.');

      await updateJobProgress(job, 0.3, 'Validating files...');
      const validFiles = await preValidateFiles(files);
      if (!validFiles.length) throw new Error('No valid markdown files found.');

      await updateJobProgress(job, 0.5, 'Reading file contents...');
      const payload = await Promise.all(validFiles.map(async (filePath) => {
        const content = await window.electronAPI.readFile(filePath);
        return {
          fileName: filePath.split(/[\\/]/).pop() || '',
          filePath,
          content,
          title: filePath.split(/[\\/]/).pop()?.replace(/\.(md|markdown)$/, '').replace(/[-_]/g, ' ') || ''
        };
      }));

      await updateJobProgress(job, 0.6, 'Extracting concepts...');
      const parsingResult = await window.electronAPI.knowledge.parseConcepts({
        files: payload,
        options: {
          confidenceThreshold: request.options.confidenceThreshold,
          maxConceptsPerFile: request.options.maxConceptsPerFile
        }
      });

      if (!parsingResult.success) {
        throw new Error(`Concept parsing failed: ${parsingResult.errors.join(', ')}`);
      }

      await updateJobProgress(job, 0.9, 'Finalizing results...');
      const concepts = parsingResult.concepts.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        type: c.type as 'topic' | 'skill' | 'fact' | 'procedure' | 'principle',
        confidence: c.confidence,
        difficulty: Math.max(1, Math.min(5, Math.round(c.difficulty))) as 1 | 2 | 3 | 4 | 5,
        evidence: c.evidence,
        relationships: [],
        extractedAt: new Date(),
        metadata: c.metadata
      }));

      const finalResult: ParsingResult = {
        concepts,
        relationships: parsingResult.relationships.map((r) => ({
          sourceId: r.sourceId,
          targetId: r.targetId,
          type: r.type,
          strength: r.strength,
          confidence: r.confidence,
          description: r.description
        })),
        learningPath: generateBasicLearningPath(concepts),
        assessments: [],
        statistics: parsingResult.statistics,
        errors: parsingResult.errors.map((error) => ({
          type: 'parsing',
          message: error,
          severity: 'medium',
          timestamp: new Date()
        }))
      };

      job.result = finalResult;
      job.progress = 1;
      job.status = 'completed';
      job.completedAt = new Date();
      job.lastUpdate = 'Completed';
    } catch (error) {
      if (job) {
        job.status = 'failed';
        job.errorMessage = error instanceof Error ? error.message : 'Unknown error';
        job.completedAt = new Date();
      }
      console.error('Concept parsing job failed:', error);
    }
  };

  return {
    parseLocalFiles,
    getJobStatus,
    getActiveJobs,
    cancelJob
  };
};
