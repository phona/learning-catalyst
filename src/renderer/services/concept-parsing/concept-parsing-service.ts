import type {
  ParsingJob,
  Concept,
  ConceptEvidence,
  ProposedRelationship,
} from '@/shared/types/concept-parsing';
import type { ElectronAPI } from '@/shared/types/electron-api';
import type {
  ConceptParsingResult,
  ParsedConcept,
  ParsedRelationship,
} from '@/shared/types/electron-api/knowledge-api';
import type { ConfigurationService } from '../configuration/configuration-service';

export interface ConceptParsingServiceOptions {
  confidenceThreshold?: number;
  maxConceptsPerFile?: number;
  includeRelationships?: boolean;
  aiProvider?: string;
  aiModel?: string;
  jobId?: string;
  resume?: boolean;
}

interface ActiveJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  result?: ConceptParsingResult;
  errorMessage?: string;
}

export const createConceptParsingService = (
  apiClient: ElectronAPI,
  configService?: ConfigurationService,
): {
  parseContent: (
    content: string,
    options?: ConceptParsingServiceOptions,
  ) => Promise<ConceptParsingResult>;
  ingestParsedResult: (
    result: ConceptParsingResult,
    plan?: ConceptIngestionPlan,
    options?: {
      userId?: string;
      materialId?: string;
      sessionId?: string;
      source?: string;
    },
  ) => Promise<KnowledgeIngestionResult>;
  parseFiles: (filePaths: string[], options?: ConceptParsingServiceOptions) => Promise<ParsingJob>;
  parseDirectories: (
    directoryPaths: string[],
    options?: ConceptParsingServiceOptions,
  ) => Promise<ParsingJob>;
  getJobStatus: (jobId: string) => ParsingJob | undefined;
  listActiveJobs: () => ParsingJob[];
  cancelJob: (jobId: string) => boolean;
  clearSavedJobs: () => Promise<number>;
  getLastJobId: () => string | null;
  getLastFiles: () => string[];
} => {
  const activeJobs = new Map<string, ActiveJob>();
  const progressIntervals = new Map<string, ReturnType<typeof setInterval>>();
  const LAST_JOB_KEY = 'conceptParsing.lastJobId';
  const LAST_FILES_KEY = 'conceptParsing.lastFiles';

  const generateJobId = (): string =>
    `job-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  const transformParsedConceptToConcept = (parsed: ParsedConcept): Concept => {
    const evidence: ConceptEvidence[] = parsed.evidence.map((e) => ({
      text: e.text,
      context: '',
      position: { start: 0, end: 0 },
      confidence: e.relevance,
      sourceType: 'ai' as const,
    }));

    return {
      id: parsed.id,
      name: parsed.name,
      description: parsed.description,
      type: (parsed.type as 'topic' | 'skill' | 'fact' | 'procedure' | 'principle') || 'topic',
      difficulty: Math.max(1, Math.min(5, Math.round(parsed.difficulty))) as 1 | 2 | 3 | 4 | 5,
      confidence: parsed.confidence,
      evidence,
      relationships: [],
      extractedAt: new Date(),
      metadata: {
        tags: [],
        learningObjectives: [],
        prerequisites: [],
        relatedTopics: [],
        difficulty: Math.max(1, Math.min(5, Math.round(parsed.difficulty))),
        extractionMethod: 'ai' as const,
        extractedBy: [],
      },
    };
  };

  const validateContent = (content: string): { isValid: boolean; error?: string } => {
    if (!content?.trim()) {
      return { isValid: false, error: 'Content is empty' };
    }

    if (content.length < 50) {
      return { isValid: false, error: 'Content too short (minimum 50 characters)' };
    }

    if (content.length > 100000) {
      return { isValid: false, error: 'Content too long (maximum 100,000 characters)' };
    }

    return { isValid: true };
  };

  const containsMarkdownPatterns = (content: string): boolean => {
    const patterns = [
      /^#{1,6}\s+/m,
      /```[\s\S]*?```/,
      /`[^`]+`/,
      /^[-*+]\s+/m,
      /\*\*[^*]+\*\*/,
      /\*[^*]+\*/,
      /\[([^\]]+)\]\([^)]+\)/,
      /^\|.*\|.*\|/m,
    ];

    return patterns.some((pattern) => pattern.test(content));
  };

  const parseContent = async (
    content: string,
    options: ConceptParsingServiceOptions = {},
  ): Promise<ConceptParsingResult> => {
    const validation = validateContent(content);
    if (!validation.isValid) {
      throw new Error(`Content validation failed: ${validation.error}`);
    }

    const result = await apiClient.knowledge.parseConcepts({
      content,
      jobId: options.jobId,
      resume: options.resume,
      options: {
        confidenceThreshold: options.confidenceThreshold ?? 0.6,
        maxConceptsPerFile: options.maxConceptsPerFile ?? 50,
      },
    });

    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Concept parsing failed');
    }

    return result.data;
  };

  const ingestParsedResult = async (
    result: ConceptParsingResult,
    plan?: ConceptIngestionPlan,
    options?: {
      userId?: string;
      materialId?: string;
      sessionId?: string;
      source?: string;
    },
  ): Promise<KnowledgeIngestionResult> => {
    const ingestion = await apiClient.knowledge.ingestConcepts({
      result,
      plan,
      options,
    });
    if (!ingestion.success || !ingestion.data) {
      throw new Error(ingestion.error?.message ?? 'Concept ingestion failed');
    }
    return ingestion.data;
  };

  const parseFiles = async (
    filePaths: string[],
    options: ConceptParsingServiceOptions = {},
  ): Promise<ParsingJob> => {
    const jobId = options.jobId ?? generateJobId();
    const job: ParsingJob = {
      id: jobId,
      materialId: `files-${Date.now()}`,
      status: 'pending',
      progress: 0,
      startedAt: new Date(),
      stages: [
        { name: 'file-collection', status: 'pending', progress: 0 },
        { name: 'content-analysis', status: 'pending', progress: 0 },
        { name: 'concept-extraction', status: 'pending', progress: 0 },
        { name: 'relationship-analysis', status: 'pending', progress: 0 },
        { name: 'validation', status: 'pending', progress: 0 },
        { name: 'compilation', status: 'pending', progress: 0 },
      ],
    };

    activeJobs.set(jobId, {
      id: jobId,
      status: 'pending',
      progress: 0,
      startedAt: new Date(),
    });

    processFileParsingJob(jobId, filePaths, options).catch((error) => {
      const activeJob = activeJobs.get(jobId);
      if (activeJob) {
        activeJob.status = 'failed';
        activeJob.errorMessage = error instanceof Error ? error.message : String(error);
        activeJob.completedAt = new Date();
      }
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();
    });

    return job;
  };

  const parseDirectories = async (
    directoryPaths: string[],
    options: ConceptParsingServiceOptions = {},
  ): Promise<ParsingJob> => {
    const jobId = options.jobId ?? generateJobId();
    const job: ParsingJob = {
      id: jobId,
      materialId: `directories-${Date.now()}`,
      status: 'pending',
      progress: 0,
      startedAt: new Date(),
      stages: [
        { name: 'file-collection', status: 'pending', progress: 0 },
        { name: 'content-analysis', status: 'pending', progress: 0 },
        { name: 'concept-extraction', status: 'pending', progress: 0 },
        { name: 'relationship-analysis', status: 'pending', progress: 0 },
        { name: 'validation', status: 'pending', progress: 0 },
        { name: 'compilation', status: 'pending', progress: 0 },
      ],
    };

    activeJobs.set(jobId, {
      id: jobId,
      status: 'pending',
      progress: 0,
      startedAt: new Date(),
    });

    processDirectoryParsingJob(jobId, directoryPaths, options).catch((error) => {
      const activeJob = activeJobs.get(jobId);
      if (activeJob) {
        activeJob.status = 'failed';
        activeJob.errorMessage = error instanceof Error ? error.message : String(error);
        activeJob.completedAt = new Date();
      }
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();
    });

    return job;
  };

  const getJobStatus = (jobId: string): ParsingJob | undefined => {
    const activeJob = activeJobs.get(jobId);
    if (!activeJob) {
      return undefined;
    }

    return {
      id: activeJob.id,
      materialId: `material-${jobId}`,
      status: activeJob.status,
      progress: activeJob.progress,
      startedAt: activeJob.startedAt,
      completedAt: activeJob.completedAt,
      errorMessage: activeJob.errorMessage,
      stages: [
        { name: 'file-collection', status: 'pending', progress: 0 },
        { name: 'content-analysis', status: 'pending', progress: 0 },
        { name: 'concept-extraction', status: 'pending', progress: 0 },
        { name: 'relationship-analysis', status: 'pending', progress: 0 },
        { name: 'validation', status: 'pending', progress: 0 },
        { name: 'compilation', status: 'pending', progress: 0 },
      ],
      result: activeJob.result
        ? (() => {
          const conceptNameById = new Map(
            activeJob.result.concepts.map((c) => [c.id, c.name] as const),
          );
          return {
            concepts: activeJob.result.concepts.map(transformParsedConceptToConcept),
            relationships: activeJob.result.relationships.map((rel) =>
              transformParsedRelationshipToProposed(rel, conceptNameById),
            ),
          learningPath: {
            id: 'default',
            title: 'Learning Path',
            description: 'Generated learning path',
            estimatedDuration: 60,
            difficulty: 3,
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
              masteryLevel: 0,
            },
          },
          assessments: [],
          statistics: {
            totalConcepts: activeJob.result.statistics.totalConcepts,
            validConcepts: activeJob.result.statistics.validConcepts,
            totalRelationships: activeJob.result.statistics.totalRelationships,
            confidenceDistribution: activeJob.result.statistics.confidenceDistribution,
            difficultyDistribution: activeJob.result.statistics.difficultyDistribution,
            typeDistribution: activeJob.result.statistics.typeDistribution,
            processingTime: activeJob.result.statistics.processingTime,
            modelUsage: activeJob.result.statistics.modelUsage,
          },
          errors: activeJob.result.errors.map((error) => ({
            type: 'parsing' as const,
            message: error,
            severity: 'medium' as const,
            timestamp: new Date(),
          })),
          };
        })()
        : undefined,
    };
  };

  const transformParsedRelationshipToProposed = (
    parsed: ParsedRelationship,
    conceptNameById: Map<string, string>,
  ): ProposedRelationship => {
    return {
      sourceConceptId: parsed.sourceId,
      sourceConceptName: conceptNameById.get(parsed.sourceId),
      targetConceptId: parsed.targetId,
      targetConceptName: conceptNameById.get(parsed.targetId),
      type: parsed.type as
        | 'prerequisite'
        | 'related'
        | 'contains'
        | 'example'
        | 'application'
        | 'contrasts',
      strength: parsed.strength,
      confidence: parsed.confidence,
      description: parsed.description,
      evidence: [], // Provide empty evidence array as it's required but not available in ParsedRelationship
    };
  };

  const listActiveJobs = (): ParsingJob[] => {
    return Array.from(activeJobs.values()).map((activeJob) => ({
      id: activeJob.id,
      materialId: `material-${activeJob.id}`,
      status: activeJob.status,
      progress: activeJob.progress,
      startedAt: activeJob.startedAt,
      completedAt: activeJob.completedAt,
      errorMessage: activeJob.errorMessage,
      stages: [
        { name: 'file-collection', status: 'pending', progress: 0 },
        { name: 'content-analysis', status: 'pending', progress: 0 },
        { name: 'concept-extraction', status: 'pending', progress: 0 },
        { name: 'relationship-analysis', status: 'pending', progress: 0 },
        { name: 'validation', status: 'pending', progress: 0 },
        { name: 'compilation', status: 'pending', progress: 0 },
      ],
      result: activeJob.result
        ? (() => {
          const conceptNameById = new Map(
            activeJob.result.concepts.map((c) => [c.id, c.name] as const),
          );
          return {
            concepts: activeJob.result.concepts.map(transformParsedConceptToConcept),
            relationships: activeJob.result.relationships.map((rel) =>
              transformParsedRelationshipToProposed(rel, conceptNameById),
            ),
          learningPath: {
            id: 'default',
            title: 'Learning Path',
            description: 'Generated learning path',
            estimatedDuration: 60,
            difficulty: 3,
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
              masteryLevel: 0,
            },
          },
          assessments: [],
          statistics: {
            totalConcepts: activeJob.result.statistics.totalConcepts,
            validConcepts: activeJob.result.statistics.validConcepts,
            totalRelationships: activeJob.result.statistics.totalRelationships,
            confidenceDistribution: activeJob.result.statistics.confidenceDistribution,
            difficultyDistribution: activeJob.result.statistics.difficultyDistribution,
            typeDistribution: activeJob.result.statistics.typeDistribution,
            processingTime: activeJob.result.statistics.processingTime,
            modelUsage: activeJob.result.statistics.modelUsage,
          },
          errors: activeJob.result.errors.map((error) => ({
            type: 'parsing' as const,
            message: error,
            severity: 'medium' as const,
            timestamp: new Date(),
          })),
          };
        })()
        : undefined,
    }));
  };

  const cancelJob = (jobId: string): boolean => {
    const activeJob = activeJobs.get(jobId);
    if (!activeJob) {
      return false;
    }

    if (activeJob.status === 'completed' || activeJob.status === 'failed') {
      return false;
    }

    activeJob.status = 'failed';
    activeJob.errorMessage = 'Job cancelled by user';
    activeJob.completedAt = new Date();

    return true;
  };

  const processFileParsingJob = async (
    jobId: string,
    filePaths: string[],
    options: ConceptParsingServiceOptions,
  ): Promise<void> => {
    const activeJob = activeJobs.get(jobId);
    if (!activeJob) return;

    try {
      activeJob.status = 'processing';
      activeJob.progress = 0.1;

      const files: Array<{ fileName: string; filePath: string; content: string; title?: string }> =
        [];

      for (const filePath of filePaths) {
        try {
          const fileExists = await apiClient.existsFile(filePath);
          if (!fileExists) {
            console.warn(`File not found: ${filePath}`);
            continue;
          }

          const content = await apiClient.readFile(filePath);
          const validation = validateContent(content);

          if (!validation.isValid) {
            console.warn(`Invalid file content ${filePath}: ${validation.error}`);
            continue;
          }

          if (!containsMarkdownPatterns(content)) {
            console.warn(`File does not contain markdown patterns: ${filePath}`);
            continue;
          }

          const fileName = filePath.split(/[\\/]/).pop() ?? '';
          files.push({
            fileName,
            filePath,
            content,
            title: fileName.replace(/\.(md|markdown)$/, '').replace(/[-_]/g, ' '),
          });

          // Reflect progress through file collection (up to 40%)
          const collectedRatio = files.length / Math.max(filePaths.length, 1);
          activeJob.progress = Math.min(0.4, 0.1 + collectedRatio * 0.3);
        } catch (error) {
          console.warn(`Failed to process file ${filePath}:`, error);
        }
      }

      if (files.length === 0) {
        throw new Error('No valid files found to process');
      }

      activeJob.progress = 0.6;

      // While parseConcepts runs, gently tick progress toward 0.9 so UI doesn’t look frozen
      const heartbeat = setInterval(() => {
        if (!activeJob || activeJob.status !== 'processing') {
          clearInterval(heartbeat);
          progressIntervals.delete(jobId);
          return;
        }
        if (activeJob.progress < 0.9) {
          activeJob.progress = Math.min(0.9, activeJob.progress + 0.02);
        }
      }, 500);
      progressIntervals.set(jobId, heartbeat);

      const parsingResult = await apiClient.knowledge.parseConcepts({
        files,
        jobId,
        resume: options.resume,
        options: {
          confidenceThreshold: options.confidenceThreshold ?? 0.6,
          maxConceptsPerFile: options.maxConceptsPerFile ?? 50,
        },
      });

      if (!parsingResult.success || !parsingResult.data) {
        const err = parsingResult.error?.message ?? 'Concept parsing failed';
        throw new Error(err);
      }

      const interval = progressIntervals.get(jobId);
      if (interval) {
        clearInterval(interval);
        progressIntervals.delete(jobId);
      }

      activeJob.progress = 1.0;
      activeJob.status = 'completed';
      activeJob.result = parsingResult.data;
      activeJob.completedAt = new Date();
      try {
        const storage = window?.localStorage;
        storage?.setItem(LAST_JOB_KEY, parsingResult.data.metadata?.jobId ?? jobId);
        storage?.setItem(LAST_FILES_KEY, JSON.stringify(filePaths));
      } catch {
        // ignore
      }
    } catch (error) {
      const interval = progressIntervals.get(jobId);
      if (interval) {
        clearInterval(interval);
        progressIntervals.delete(jobId);
      }

      activeJob.status = 'failed';
      activeJob.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      activeJob.completedAt = new Date();
      console.error('File parsing job failed:', error);
    }
  };

  const processDirectoryParsingJob = async (
    jobId: string,
    directoryPaths: string[],
    options: ConceptParsingServiceOptions,
  ): Promise<void> => {
    const activeJob = activeJobs.get(jobId);
    if (!activeJob) return;

    try {
      activeJob.status = 'processing';
      activeJob.progress = 0.1;

      const markdownFiles: string[] = [];

      for (const directoryPath of directoryPaths) {
        try {
          const items = await apiClient.readDirectory(directoryPath, true, 10);
          for (const item of items) {
            if (item?.isFile === true && item?.isMarkdown === true) {
              markdownFiles.push(item.path);
            }
          }
        } catch (error) {
          console.warn(`Failed to scan directory ${directoryPath}:`, error);
        }
      }

      if (markdownFiles.length === 0) {
        throw new Error('No markdown files found in specified directories');
      }

      return processFileParsingJob(jobId, markdownFiles, options);
    } catch (error) {
      activeJob.status = 'failed';
      activeJob.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      activeJob.completedAt = new Date();
      console.error('Directory parsing job failed:', error);
    }
  };

  return {
    parseContent,
    ingestParsedResult,
    parseFiles,
    parseDirectories,
    getJobStatus,
    listActiveJobs,
    cancelJob,
    clearSavedJobs: async () => {
      const res = await apiClient.knowledge.clearParsingJobs();
      if (!res.success || !res.data) {
        throw new Error(res.error?.message ?? 'Failed to clear parsing cache');
      }
      try {
        window?.localStorage?.removeItem(LAST_JOB_KEY);
        window?.localStorage?.removeItem(LAST_FILES_KEY);
      } catch {}
      return res.data.removed;
    },
    getLastJobId: () => {
      try {
        return window?.localStorage?.getItem(LAST_JOB_KEY) ?? null;
      } catch {
        return null;
      }
    },
    getLastFiles: () => {
      try {
        const raw = window?.localStorage?.getItem(LAST_FILES_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as string[]) : [];
      } catch {
        return [];
      }
    },
  };
};

export type ConceptParsingService = ReturnType<typeof createConceptParsingService>;
