import type {
  ParsingJob,
  Concept,
  ConceptEvidence,
  ProposedRelationship,
  ParsingResult,
  ParsingStatistics,
  ParsingError,
} from '@/shared/types/concept-parsing';
import type { RelationshipType } from '@/shared/types/relationship-types';
import type { LearningPath } from '@/shared/types/learning';
import type { ElectronAPI } from '@/shared/types/electron-api';
import type { APIResponse } from '@/shared/types/electron-api/base';
import type {
  ConceptParsingResult,
  ParsedConcept,
  ParsedRelationship,
  ConceptIngestionPlan,
  KnowledgeIngestionResult,
} from '@/shared/types/electron-api/knowledge-api';
import type { ConfigurationService } from '../configuration/configuration-service';
import type { TimeService, IDGenerator } from '@/shared/utils';
import { createTimeService, createIdGenerator } from '@/shared/utils';
import { unwrapAPI } from '@/renderer/hooks/useElectronAPI';

export interface ConceptParsingServiceOptions {
  confidenceThreshold?: number;
  maxConceptsPerFile?: number;
  includeRelationships?: boolean;
  aiProvider?: string;
  aiModel?: string;
  jobId?: string;
  resume?: boolean;
  timeService?: TimeService;
  idGenerator?: IDGenerator;
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
  serviceOptions?: { timeService?: TimeService; idGenerator?: IDGenerator },
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

  // Use injected dependencies or defaults (real time/id generation for production)
  const timeService = serviceOptions?.timeService ?? createTimeService();
  const idGenerator = serviceOptions?.idGenerator ?? createIdGenerator();

  const generateJobId = (): string =>
    idGenerator.withPrefix('job');

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
      extractedAt: new Date(timeService.now()),
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

    // Use unwrapAPI for consistent IPC error handling
    const result = await unwrapAPI(apiClient.knowledge.parseConcepts({
      content,
      jobId: options.jobId,
      resume: options.resume,
      options: {
        confidenceThreshold: options.confidenceThreshold ?? 0.6,
        maxConceptsPerFile: options.maxConceptsPerFile ?? 50,
      },
    }));

    return result;
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
    // Use unwrapAPI for consistent IPC error handling
    const ingestion = await unwrapAPI(apiClient.knowledge.ingestConcepts({
      result,
      plan,
      options,
    }));

    return ingestion;
  };

  const parseFiles = async (
    filePaths: string[],
    options: ConceptParsingServiceOptions = {},
  ): Promise<ParsingJob> => {
    const jobId = options.jobId ?? generateJobId();
    const job: ParsingJob = {
      id: jobId,
      materialId: idGenerator.withPrefix('files'),
      status: 'pending',
      progress: 0,
      startedAt: new Date(timeService.now()),
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
      startedAt: new Date(timeService.now()),
    });

    processFileParsingJob(jobId, filePaths, options).catch((error) => {
      const activeJob = activeJobs.get(jobId);
      if (activeJob) {
        activeJob.status = 'failed';
        activeJob.errorMessage = error instanceof Error ? error.message : String(error);
        activeJob.completedAt = new Date(timeService.now());
      }
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date(timeService.now());
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
      materialId: idGenerator.withPrefix('directories'),
      status: 'pending',
      progress: 0,
      startedAt: new Date(timeService.now()),
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
      startedAt: new Date(timeService.now()),
    });

    processDirectoryParsingJob(jobId, directoryPaths, options).catch((error) => {
      const activeJob = activeJobs.get(jobId);
      if (activeJob) {
        activeJob.status = 'failed';
        activeJob.errorMessage = error instanceof Error ? error.message : String(error);
        activeJob.completedAt = new Date(timeService.now());
      }
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date(timeService.now());
    });

    return job;
  };

  const getJobStatus = (jobId: string): ParsingJob | undefined => {
    const activeJob = activeJobs.get(jobId);
    if (!activeJob) {
      return undefined;
    }

    const parsingResult: ParsingResult | undefined = activeJob.result
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
              objectives: [],
              estimated_duration: 60,
              difficulty_progression: 'linear' as const,
              prerequisites: [],
              tags: [],
              difficulty: 3,
              modules: [],
              targetMastery: 0.8,
              adaptations: [],
              progress: {
                currentModule: '',
                completedModules: [],
                currentConcept: '',
                masteredConcepts: [],
                timeSpent: 0,
                assessmentScores: [],
                lastAccess: new Date(timeService.now()),
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
              timestamp: new Date(timeService.now()),
            })),
          };
        })()
      : undefined;

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
      result: parsingResult,
    };
  };

  const transformParsedRelationshipToProposed = (
    parsed: ParsedRelationship,
    conceptNameById: Map<string, string>,
  ): ProposedRelationship => {
    // Map parsed relationship types to valid RelationshipType values
    const mapRelationshipType = (type: string): RelationshipType => {
      switch (type) {
        case 'prerequisite':
          return 'prerequisite' as RelationshipType;
        case 'related':
          return 'related_to' as RelationshipType;
        case 'contains':
          return 'part_of' as RelationshipType;
        case 'example':
          return 'example_of' as RelationshipType;
        case 'application':
          return 'applies_to' as RelationshipType;
        case 'contrasts':
          return 'contrasts_with' as RelationshipType;
        default:
          return 'related_to' as RelationshipType; // fallback
      }
    };

    return {
      sourceConceptId: parsed.sourceId,
      sourceConceptName: conceptNameById.get(parsed.sourceId),
      targetConceptId: parsed.targetId,
      targetConceptName: conceptNameById.get(parsed.targetId),
      type: mapRelationshipType(parsed.type),
      strength: parsed.strength ?? 0.5,
      confidence: parsed.confidence ?? 0.5,
      description: parsed.description,
      evidence: [], // Provide empty evidence array as it's required but not available in ParsedRelationship
    };
  };

  const listActiveJobs = (): ParsingJob[] => {
    return Array.from(activeJobs.values()).map((activeJob) => {
      const parsingResult: ParsingResult | undefined = activeJob.result
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
                objectives: [],
                estimated_duration: 60,
                difficulty_progression: 'linear' as const,
                prerequisites: [],
                tags: [],
                difficulty: 3,
                modules: [],
                targetMastery: 0.8,
                adaptations: [],
                progress: {
                  currentModule: '',
                  completedModules: [],
                  currentConcept: '',
                  masteredConcepts: [],
                  timeSpent: 0,
                  assessmentScores: [],
                  lastAccess: new Date(timeService.now()),
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
                timestamp: new Date(timeService.now()),
              })),
            };
          })()
        : undefined;

      return {
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
        result: parsingResult,
      };
    });
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
    activeJob.completedAt = new Date(timeService.now());

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
          // Use unwrapAPI for consistent IPC error handling
          // Note: Type cast needed because API definition incorrectly returns raw type
          const fileExists = await unwrapAPI(apiClient.existsFile(filePath) as unknown as Promise<APIResponse<boolean>>);
          if (!fileExists) {
            console.warn(`File not found: ${filePath}`);
            continue;
          }

          const content = await unwrapAPI(apiClient.readFile(filePath) as unknown as Promise<APIResponse<string>>);
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

      // Use unwrapAPI for consistent IPC error handling
      const parsingResult = await unwrapAPI(apiClient.knowledge.parseConcepts({
        files,
        jobId,
        resume: options.resume,
        options: {
          confidenceThreshold: options.confidenceThreshold ?? 0.6,
          maxConceptsPerFile: options.maxConceptsPerFile ?? 50,
        },
      }));

      activeJob.progress = 0.75;
      activeJob.status = 'processing';

      // Step 2: Ingest parsed concepts into SQLite database
      // Use unwrapAPI for consistent IPC error handling
      const ingestionResult = await unwrapAPI(apiClient.knowledge.ingestConcepts({
        result: parsingResult,
        options: {
          source: 'file-import',
        },
      }));

      const interval = progressIntervals.get(jobId);
      if (interval) {
        clearInterval(interval);
        progressIntervals.delete(jobId);
      }

      activeJob.progress = 1.0;
      activeJob.status = 'completed';
      activeJob.result = parsingResult;
      activeJob.completedAt = new Date(timeService.now());
      try {
        const storage = window?.localStorage;
        storage?.setItem(LAST_JOB_KEY, parsingResult.metadata?.jobId ?? jobId);
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
      activeJob.completedAt = new Date(timeService.now());
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
          // Use unwrapAPI for consistent IPC error handling
          // Note: Type cast needed because API definition incorrectly returns raw type
          const items = await unwrapAPI(apiClient.readDirectory(directoryPath, true, 10) as unknown as Promise<APIResponse<any[]>>);
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
      activeJob.completedAt = new Date(timeService.now());
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
      // Use unwrapAPI for consistent IPC error handling
      const res = await unwrapAPI(apiClient.knowledge.clearParsingJobs());
      try {
        window?.localStorage?.removeItem(LAST_JOB_KEY);
        window?.localStorage?.removeItem(LAST_FILES_KEY);
      } catch {}
      return res.removed;
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
