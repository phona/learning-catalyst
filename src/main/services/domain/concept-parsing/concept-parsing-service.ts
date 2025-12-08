import { randomUUID, createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import type { ILogger } from '../../types';
import {
  createPreparsedMaterial,
  previewToPromptPayload,
  extractMarkdownHeadings,
} from '../content/content-preview';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { VectorDatabase } from '../knowledge/vector/vector-database';
import type { ProviderFactory } from '@/main/services/agent/provider-factory';
import type {
  ConceptParsingResult,
  ParsedConcept,
  ParsedRelationship,
} from '@/shared/types/electron-api/knowledge-api';
import {
  createSegmentExtractChain,
  SEGMENT_EXTRACTION_TEMPLATE,
  formatInstructions,
} from './prompts';

export interface ConceptParsingMaterial {
  id: string;
  title: string;
  content: string;
  format?: 'markdown' | 'text';
  filePath?: string;
  metadata?: Record<string, unknown>;
}

export interface ConceptParsingSettings {
  userId?: string;
  splitByHeading?: boolean;
  splitByParagraph?: boolean;
  includeCodeBlocks?: boolean;
  maxSegmentChars?: number;
  minSegmentChars?: number;
  vectorize?: boolean;
  jobId?: string;
  resume?: boolean;
  options?: {
    confidenceThreshold?: number;
    maxConceptsPerSegment?: number;
    maxConcurrentSegments?: number;
  };
  maxHeadingDepth?: number;
}

type ConceptSegment = {
  id: string;
  title: string;
  content: string;
  order: number;
};

type ConceptParsingDeps = {
  providerFactory: ProviderFactory;
  vectorDatabase?: VectorDatabase;
  loggerService: { child: (meta: Record<string, unknown>) => ILogger };
};

type ExtractedConcept = {
  name: string;
  description?: string;
  type?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  confidence?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

type ExtractedRelationship = {
  from: string;
  to: string;
  type?: string;
  strength?: number;
  confidence?: number;
  description?: string;
  metadata?: Record<string, unknown>;
};

type SegmentExtractionSchema = {
  summary: string;
  focusAreas: string[];
  nodes: ExtractedConcept[];
  relationships: ExtractedRelationship[];
  recommendations: string[];
};

type SegmentJobStatus = 'pending' | 'done' | 'failed';

type SegmentJobRecord = {
  hash: string;
  segmentId: string;
  materialId: string;
  title: string;
  status: SegmentJobStatus;
  result?: {
    concepts: ParsedConcept[];
    relationships: ParsedRelationship[];
    promptTokens?: number;
    completionTokens?: number;
    processingTime?: number;
  };
  error?: string;
  updatedAt: string;
};

type ConceptParsingJobState = {
  jobId: string;
  createdAt: string;
  updatedAt: string;
  settingsSnapshot: Partial<ConceptParsingSettings>;
  totalSegments: number;
  segments: Record<string, SegmentJobRecord>;
};

const toLogError = (error: unknown) => {
  if (error instanceof Error) {
    const extra: Record<string, unknown> = {};
    for (const key of Object.keys(error as any)) {
      if (key !== 'name' && key !== 'message' && key !== 'stack') {
        extra[key] = (error as any)[key];
      }
    }
    return { message: error.message, name: error.name, stack: error.stack, ...extra };
  }
  if (error && typeof error === 'object') {
    try {
      return { ...(error as any) };
    } catch {
      return { message: String(error) };
    }
  }
  return { message: String(error) };
};

const DEFAULT_SETTINGS: ConceptParsingSettings = {
  splitByHeading: true,
  splitByParagraph: true,
  includeCodeBlocks: true,
  maxSegmentChars: 1200,
  minSegmentChars: 80,
  vectorize: true,
  options: {
    confidenceThreshold: 0.6,
    maxConceptsPerSegment: 32,
    maxConcurrentSegments: 3,
  },
};

const resolveJobStoreDir = (): string => {
  if (process.env.CONCEPT_PARSE_JOB_DIR) {
    return process.env.CONCEPT_PARSE_JOB_DIR;
  }
  try {
    return path.join(app.getPath('userData'), 'concept-parse-jobs');
  } catch {
    return path.join(process.cwd(), '.concept-parse-jobs');
  }
};

const ensureDir = async (dir: string): Promise<void> => {
  await fs.mkdir(dir, { recursive: true });
};

const loadJobState = async (jobId: string): Promise<ConceptParsingJobState | null> => {
  const dir = resolveJobStoreDir();
  const file = path.join(dir, `${jobId}.json`);
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as ConceptParsingJobState;
  } catch {
    return null;
  }
};

const saveJobState = async (state: ConceptParsingJobState): Promise<void> => {
  const dir = resolveJobStoreDir();
  await ensureDir(dir);
  const file = path.join(dir, `${state.jobId}.json`);
  const payload = JSON.stringify(state, null, 2);
  await fs.writeFile(file, payload, 'utf8');
};

const hashSegment = (segment: ConceptSegment): string =>
  createHash('sha256').update(segment.title || '').update('\n').update(segment.content).digest('hex');

const bucketizeConfidence = (value: number): string => {
  const clamped = Math.min(1, Math.max(0, value));
  return (Math.floor(clamped * 10) / 10).toFixed(1);
};

const normalizeDifficulty = (value: number): number => {
  const rounded = Math.round(value);
  if (rounded <= 1) return 1;
  if (rounded >= 5) return 5;
  return rounded;
};

const difficultyFromLabel = (label?: ExtractedConcept['difficulty']): number => {
  switch (label) {
  case 'beginner':
    return 2;
  case 'intermediate':
    return 3;
  case 'advanced':
    return 4;
  default:
    return 3;
  }
};

const shouldSkipSegment = (segment: ConceptSegment, settings: ConceptParsingSettings): boolean => {
  const minChars = settings.minSegmentChars ?? 64;
  const length = segment.content.trim().length;
  if (length < minChars) {
    return true;
  }
  if (!settings.includeCodeBlocks && segment.content.includes('```')) {
    return true;
  }
  return false;
};

const createSegmentsFromText = (
  content: string,
  settings: ConceptParsingSettings,
  format?: 'markdown' | 'text',
  filePath?: string,
): ConceptSegment[] => {
  const normalized = (content ?? '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const lines = normalized.split('\n');
  const segments: ConceptSegment[] = [];
  let current: Omit<ConceptSegment, 'order'> = {
    id: randomUUID(),
    title: 'Introduction',
    content: '',
  };

  const clampDepth = (d?: number) => {
    if (!d && d !== 0) return undefined;
    return Math.max(1, Math.min(6, d));
  };
  const maxDepth = clampDepth(settings.maxHeadingDepth);

  const isMarkdown = format === 'markdown' || (filePath ?? '').toLowerCase().endsWith('.md');
  const mdHeadings = isMarkdown ? extractMarkdownHeadings(normalized) : [];
  if (isMarkdown && mdHeadings.length) {
    const included = mdHeadings.filter((h) =>
      maxDepth === undefined ? true : h.level <= maxDepth,
    );
    if (included.length) {
      let label = 'Introduction';
      let start = 1;
      for (const h of included) {
        const end = h.startLine - 1;
        const prev = lines
          .slice(start - 1, Math.max(start - 1, end))
          .join('\n')
          .trim();
        if (prev) {
          segments.push({ id: randomUUID(), title: label, content: prev, order: segments.length });
        }
        label = h.label || 'Section';
        start = h.startLine;
      }
      const tail = lines
        .slice(start - 1)
        .join('\n')
        .trim();
      if (tail) {
        segments.push({ id: randomUUID(), title: label, content: tail, order: segments.length });
      }
      return segments
        .filter((segment) => !shouldSkipSegment(segment, settings))
        .map((segment, index) => ({ ...segment, order: index }));
    }
  }

  lines.forEach((line) => {
    current.content += `${line}\n`;
  });

  if (current.content.trim()) {
    segments.push({ ...current, content: current.content.trim(), order: segments.length });
  }

  if (segments.length <= 1 && settings.splitByParagraph !== false) {
    const paragraphs = normalized
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
    if (paragraphs.length > 1) {
      return paragraphs.map((paragraph, index) => ({
        id: randomUUID(),
        title: `Paragraph ${index + 1}`,
        content: paragraph,
        order: index,
      }));
    }
  }

  return segments
    .filter((segment) => !shouldSkipSegment(segment, settings))
    .map((segment, index) => ({ ...segment, order: index }));
};

const chunkSegmentsWithLangChain = async (
  segments: ConceptSegment[],
  maxChars: number,
): Promise<ConceptSegment[]> => {
  if (!maxChars) return segments.map((s, i) => ({ ...s, order: i }));
  const overlap = Math.max(0, Math.floor(maxChars * 0.1));
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: maxChars,
    chunkOverlap: overlap,
  });
  const out: ConceptSegment[] = [];
  for (const [idx, seg] of segments.entries()) {
    if (seg.content.length <= maxChars) {
      out.push({ ...seg, order: out.length });
      continue;
    }
    const chunks = await splitter.splitText(seg.content);
    let part = 1;
    for (const chunk of chunks) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;
      out.push({
        id: randomUUID(),
        title: `${seg.title} (part ${part})`,
        content: trimmed,
        order: out.length,
      });
      part += 1;
    }
  }
  return out;
};

/**
 * Merge adjacent short segments to reduce the number of LLM calls while keeping order.
 * Titles are concatenated with " / " to preserve context hints.
 */
const coalesceSegments = (
  segments: ConceptSegment[],
  maxChars: number,
  minChars: number,
): ConceptSegment[] => {
  if (!maxChars || segments.length <= 1) return segments;

  const merged: ConceptSegment[] = [];
  let buffer: ConceptSegment | null = null;

  const flush = () => {
    if (buffer) {
      buffer.order = merged.length;
      merged.push(buffer);
      buffer = null;
    }
  };

  for (const seg of segments) {
    if (!buffer) {
      buffer = { ...seg };
      continue;
    }

    const combinedLength = buffer.content.length + 1 + seg.content.length;
    if (combinedLength <= maxChars || buffer.content.length < minChars || seg.content.length < minChars) {
      buffer = {
        id: buffer.id,
        title: `${buffer.title} / ${seg.title}`,
        content: `${buffer.content}\n\n${seg.content}`,
        order: buffer.order,
      };
    } else {
      flush();
      buffer = { ...seg };
    }
  }

  flush();
  return merged;
};

const addSegmentToVector = async (
  segment: ConceptSegment,
  material: ConceptParsingMaterial,
  providerFactory: ProviderFactory,
  vectorDatabase?: VectorDatabase,
  logger?: ILogger,
) => {
  if (!vectorDatabase) return;

  try {
    const preview = createPreparsedMaterial(segment.content, {
      filePath: material.filePath ?? material.title,
      sourceLabel: material.title,
    });

    const embeddingModel = await providerFactory.getEmbeddingModel();
    const embedding = await embeddingModel.embed(segment.content);

    await vectorDatabase.addDocumentWithEmbedding(
      {
        id: `${material.id}:${segment.id}`,
        content: segment.content,
        metadata: {
          materialId: material.id,
          segmentId: segment.id,
          segmentTitle: segment.title,
          previewStats: preview.stats,
          source: 'concept-parsing',
          format: material.format ?? 'markdown',
        },
      },
      embedding,
    );
  } catch (error) {
    logger?.warn(
      'Concept parsing vector insertion failed',
      error instanceof Error ? error : undefined,
      {
        segmentId: segment.id,
        materialId: material.id,
        details: toLogError(error),
      },
    );
  }
};

const addRelationshipToVector = async (
  relationship: ParsedRelationship,
  concepts: Map<string, ParsedConcept>,
  material: ConceptParsingMaterial,
  providerFactory: ProviderFactory,
  vectorDatabase?: VectorDatabase,
  logger?: ILogger,
) => {
  if (!vectorDatabase) return;

  const sourceConcept = concepts.get(relationship.sourceId);
  const targetConcept = concepts.get(relationship.targetId);

  if (!sourceConcept || !targetConcept) {
    return;
  }

  const relationshipText = [
    `Relationship: ${sourceConcept.name}`,
    `Type: ${relationship.type}`,
    `Target: ${targetConcept.name}`,
    relationship.description ? `Description: ${relationship.description}` : '',
    `Strength: ${relationship.strength}`,
    `Context: ${sourceConcept.type} to ${targetConcept.type}`,
  ]
    .filter(Boolean)
    .join(' | ');

  const embeddingModel = await providerFactory.getEmbeddingModel();
  const embedding = await embeddingModel.embed(relationshipText);

  await vectorDatabase.addDocumentWithEmbedding(
    {
      id: `rel:${relationship.type}:${relationship.sourceId}:${relationship.targetId}`,
      content: relationshipText,
      metadata: {
        type: 'relationship',
        relationshipType: relationship.type,
        sourceId: relationship.sourceId,
        targetId: relationship.targetId,
        sourceName: sourceConcept.name,
        targetName: targetConcept.name,
        strength: relationship.strength,
        confidence: relationship.confidence,
        materialId: material.id,
        source: 'concept-parsing',
      },
    },
    embedding,
  );
};

export const createConceptParsingService = ({
  providerFactory,
  vectorDatabase,
  loggerService,
}: ConceptParsingDeps) => {
  const serviceLogger = loggerService.child({ service: 'concept-parsing' });
  let currentProviderFactory = providerFactory;

  const extractSegment = async (
    segment: ConceptSegment,
    material: ConceptParsingMaterial,
  ): Promise<SegmentExtractionSchema> => {
    const startTs = Date.now();
    const preview = createPreparsedMaterial(segment.content, {
      filePath: material.filePath ?? material.title,
      sourceLabel: material.title,
    });
    const previewPayload = previewToPromptPayload(preview);
    const lines = segment.content.split(/\r?\n/).length;
    const modelEntry = await currentProviderFactory.getModel();
    serviceLogger.info('Segment extraction start', {
      segmentId: segment.id,
      segmentTitle: segment.title,
      chars: segment.content.length,
      lines,
      promptLength: previewPayload.length,
      previewStats: preview.stats,
      provider: modelEntry.settings.providerName,
      model: modelEntry.settings.model,
    });
    try {
      const chain = createSegmentExtractChain(modelEntry.model as any);
      const result = (await chain.invoke({
        preview_payload: previewPayload,
      })) as SegmentExtractionSchema;
      // const durationMs = Date.now() - startTs;
      // serviceLogger.info('Segment extraction end', {
      //   segmentId: segment.id,
      //   segmentTitle: segment.title,
      //   durationMs,
      //   nodes: (result.nodes ?? []).length,
      //   relationships: (result.relationships ?? []).length,
      //   summaryLength: (result.summary ?? '').length,
      // });
      return result;
    } catch (error) {
      const durationMs = Date.now() - startTs;
      serviceLogger.error('Segment extraction error', toLogError(error), {
        segmentId: segment.id,
        segmentTitle: segment.title,
        durationMs,
        promptLength: previewPayload.length,
        chars: segment.content.length,
        lines,
      });
      throw error;
    }
  };

  const mapConcept = (
    concept: ExtractedConcept,
    segment: ConceptSegment,
    material: ConceptParsingMaterial,
  ): ParsedConcept => {
    const confidence = Math.min(
      1,
      Math.max(0, concept.confidence ?? Number(concept.metadata?.confidence ?? 0.55)),
    );
    const difficulty = normalizeDifficulty(difficultyFromLabel(concept.difficulty));
    const typeLabel = concept.type?.trim() || 'concept';

    return {
      id: randomUUID(),
      name: concept.name,
      description: concept.description ?? segment.content.slice(0, 200),
      type: typeLabel,
      confidence,
      difficulty,
      evidence: [
        {
          type: 'segment',
          text: segment.content.slice(0, 300),
          relevance: Math.min(1, confidence + 0.15),
        },
      ],
      metadata: {
        ...concept.metadata,
        tags: concept.tags ?? [],
        segmentId: segment.id,
        segmentTitle: segment.title,
        materialId: material.id,
      },
    };
  };

  const mapRelationship = (
    relationship: ExtractedRelationship,
    nameToId: Map<string, string>,
  ): ParsedRelationship | null => {
    const sourceId = nameToId.get(relationship.from?.toLowerCase() ?? '');
    const targetId = nameToId.get(relationship.to?.toLowerCase() ?? '');
    if (!sourceId || !targetId) {
      return null;
    }
    const strength = Math.min(1, Math.max(0, relationship.strength ?? 0.5));
    const confidence = Math.min(
      1,
      Math.max(0, relationship.confidence ?? Number(relationship.metadata?.confidence ?? 0.5)),
    );

    return {
      sourceId,
      targetId,
      type: relationship.type ?? 'related',
      strength,
      confidence,
      description: relationship.description,
    };
  };

  const parseMaterials = async (
    materials: ConceptParsingMaterial[],
    settings: ConceptParsingSettings = {},
  ): Promise<ConceptParsingResult> => {
    if (!materials.length) {
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
          processingTime: 0,
          modelUsage: {},
        },
        errors: ['No materials provided for concept parsing.'],
        metadata: {
          processingTime: 0,
          processedAt: new Date().toISOString(),
          inputFiles: 0,
        },
      };
    }

    const normalizedSettings: ConceptParsingSettings = {
      ...DEFAULT_SETTINGS,
      ...settings,
      options: {
        ...DEFAULT_SETTINGS.options,
        ...(settings.options ?? {}),
      },
    };

    const jobId = settings.jobId ?? randomUUID();
    const resume = settings.resume ?? false;
    const nowIso = new Date().toISOString();
    const initialJobState: ConceptParsingJobState = {
      jobId,
      createdAt: nowIso,
      updatedAt: nowIso,
      settingsSnapshot: {
        maxSegmentChars: normalizedSettings.maxSegmentChars,
        minSegmentChars: normalizedSettings.minSegmentChars,
        maxHeadingDepth: normalizedSettings.maxHeadingDepth,
        vectorize: normalizedSettings.vectorize,
        options: {
          maxConcurrentSegments: normalizedSettings.options?.maxConcurrentSegments,
        },
      },
      totalSegments: 0,
      segments: {},
    };

    const jobState =
      (resume ? await loadJobState(jobId) : null) ?? initialJobState;

    const isCompatible = (state: ConceptParsingJobState): boolean => {
      const snap = state.settingsSnapshot ?? {};
      const opt = (snap as any).options ?? {};
      return (
        (snap.maxSegmentChars ?? DEFAULT_SETTINGS.maxSegmentChars) ===
          normalizedSettings.maxSegmentChars &&
        (snap.minSegmentChars ?? DEFAULT_SETTINGS.minSegmentChars) ===
          normalizedSettings.minSegmentChars &&
        (snap.maxHeadingDepth ?? DEFAULT_SETTINGS.maxHeadingDepth) ===
          normalizedSettings.maxHeadingDepth &&
        (opt.maxConcurrentSegments ?? DEFAULT_SETTINGS.options?.maxConcurrentSegments) ===
          normalizedSettings.options?.maxConcurrentSegments
      );
    };

    if (resume && jobState !== initialJobState && !isCompatible(jobState)) {
      serviceLogger.warn('Resume requested but settings changed; starting fresh job', {
        jobId,
      });
      jobState.segments = {};
      jobState.totalSegments = 0;
      jobState.settingsSnapshot = initialJobState.settingsSnapshot;
    }

    const threshold = normalizedSettings.options?.confidenceThreshold ?? 0.6;
    const maxPerSegment = normalizedSettings.options?.maxConceptsPerSegment ?? 32;

    const concepts: ParsedConcept[] = [];
    const relationships: ParsedRelationship[] = [];
    const errors: string[] = [];
    const confidenceDistribution: Record<string, number> = {};
    const difficultyDistribution: Record<number, number> = {};
    const typeDistribution: Record<string, number> = {};
    let totalConcepts = 0;
    let validConcepts = 0;
    let totalRelationships = 0;
    let processingTime = 0;
    let processedSegments = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let llmCalls = 0;

    for (const material of materials) {
      let segments = createSegmentsFromText(
        material.content,
        normalizedSettings,
        material.format,
        material.filePath,
      );
      const maxChars = normalizedSettings.maxSegmentChars ?? 0;
      const minChars = normalizedSettings.minSegmentChars ?? 64;

      // Merge adjacent short segments to reduce number of LLM calls, then chunk if still long
      segments = coalesceSegments(segments, maxChars, minChars);
      if (maxChars > 0) {
        segments = await chunkSegmentsWithLangChain(segments, maxChars);
      }
      processedSegments += segments.length;
      serviceLogger.debug('Segments prepared', { materialId: material.id, count: segments.length });

      const runnableSegments: Array<{ segment: ConceptSegment; material: ConceptParsingMaterial; hash: string }> = [];
      const filtered = segments.filter((segment) => !shouldSkipSegment(segment, normalizedSettings));

      for (const segment of filtered) {
        const hash = hashSegment(segment);
        const existing = jobState.segments[hash];
        jobState.segments[hash] = {
          hash,
          segmentId: segment.id,
          materialId: material.id,
          title: segment.title,
          status: existing?.status ?? 'pending',
          result: existing?.result,
          error: existing?.error,
          updatedAt: existing?.updatedAt ?? nowIso,
        };

        if (existing?.status === 'done' && existing.hash === hash && existing.result) {
          const mappedNodes = existing.result.concepts ?? [];
          const mappedRelationships = existing.result.relationships ?? [];
          const segPrompt = existing.result.promptTokens ?? Math.ceil(segment.content.length / 4);
          const segCompletion =
            existing.result.completionTokens ?? mappedNodes.length * 60;
          const segDuration = existing.result.processingTime ?? 0;

          mappedNodes.forEach((node) => {
            totalConcepts += 1;
            const bucket = bucketizeConfidence(node.confidence);
            confidenceDistribution[bucket] = (confidenceDistribution[bucket] ?? 0) + 1;
            difficultyDistribution[node.difficulty] =
              (difficultyDistribution[node.difficulty] ?? 0) + 1;
            typeDistribution[node.type] = (typeDistribution[node.type] ?? 0) + 1;
            if (node.confidence >= threshold) {
              validConcepts += 1;
            }
          });

          totalRelationships += mappedRelationships.length;
          concepts.push(...mappedNodes);
          relationships.push(...mappedRelationships);
          promptTokens += segPrompt;
          completionTokens += segCompletion;
          processingTime += segDuration;
          continue;
        }

        runnableSegments.push({ segment, material, hash });
      }

      const maxConcurrent =
        normalizedSettings.options?.maxConcurrentSegments && normalizedSettings.options.maxConcurrentSegments > 0
          ? normalizedSettings.options.maxConcurrentSegments
          : DEFAULT_SETTINGS.options?.maxConcurrentSegments ?? 2;

      let cursor = 0;
      const worker = async (): Promise<void> => {
        while (cursor < runnableSegments.length) {
          const idx = cursor;
          cursor += 1;
          const { segment, material: segMaterial, hash } = runnableSegments[idx];
          const start = Date.now();

          try {
            const extraction = await extractSegment(segment, segMaterial);
            llmCalls += 1;
            serviceLogger.info('Segment extraction successful', extraction);
            const segmentConcepts = (extraction.nodes ?? []).slice(0, maxPerSegment);

            await addSegmentToVector(segment, segMaterial, providerFactory, vectorDatabase, serviceLogger);

            const segPromptTokens = Math.ceil(segment.content.length / 4);
            promptTokens += segPromptTokens;

            const mappedNodes = segmentConcepts.map((node) =>
              mapConcept(node, segment, segMaterial),
            );
            const nameToId = new Map<string, string>();
            mappedNodes.forEach((node) => {
              nameToId.set(node.name.toLowerCase(), node.id);
            });

            const mappedRelationships = (extraction.relationships ?? [])
              .map((relationship) => mapRelationship(relationship, nameToId))
              .filter(Boolean) as ParsedRelationship[];

            // Store relationships in vector database
            const conceptsMap = new Map(mappedNodes.map(node => [node.id, node]));
            await Promise.all(
              mappedRelationships.map(rel =>
                addRelationshipToVector(rel, conceptsMap, segMaterial, providerFactory, vectorDatabase, serviceLogger)
              )
            );

            mappedNodes.forEach((node) => {
              totalConcepts += 1;
              const bucket = bucketizeConfidence(node.confidence);
              confidenceDistribution[bucket] = (confidenceDistribution[bucket] ?? 0) + 1;
              difficultyDistribution[node.difficulty] =
                (difficultyDistribution[node.difficulty] ?? 0) + 1;
              typeDistribution[node.type] = (typeDistribution[node.type] ?? 0) + 1;
              if (node.confidence >= threshold) {
                validConcepts += 1;
              }
            });

            totalRelationships += mappedRelationships.length;

            concepts.push(...mappedNodes);
            relationships.push(...mappedRelationships);

            const segCompletionTokens = mappedNodes.length * 60;
            completionTokens += segCompletionTokens;
            const duration = Date.now() - start;
            processingTime += duration;

            jobState.segments[hash] = {
              hash,
              segmentId: segment.id,
              materialId: segMaterial.id,
              title: segment.title,
              status: 'done',
              result: {
                concepts: mappedNodes,
                relationships: mappedRelationships,
                promptTokens: segPromptTokens,
                completionTokens: segCompletionTokens,
                processingTime: duration,
              },
              updatedAt: new Date().toISOString(),
            };
            jobState.updatedAt = new Date().toISOString();
            await saveJobState(jobState);
          } catch (error) {
            errors.push(
              `[${segment.title}] ${error instanceof Error ? error.message : String(error)}`,
            );
            jobState.segments[hash] = {
              hash,
              segmentId: segment.id,
              materialId: segMaterial.id,
              title: segment.title,
              status: 'failed',
              error: error instanceof Error ? error.message : String(error),
              updatedAt: new Date().toISOString(),
            };
            jobState.updatedAt = new Date().toISOString();
            await saveJobState(jobState);
            serviceLogger.error('Concept segment processing failed', error, {
              segmentId: segment.id,
              segmentTitle: segment.title,
              details: JSON.stringify(error),
            });
            processingTime += Date.now() - start;
          }
        }
      };

      const workerCount = Math.min(maxConcurrent, Math.max(1, runnableSegments.length));
      await Promise.all(Array.from({ length: workerCount }, () => worker()));
    }

    jobState.totalSegments = Object.keys(jobState.segments).length;
    jobState.updatedAt = new Date().toISOString();
    await saveJobState(jobState);

    const metadata = {
      processingTime,
      processedAt: new Date().toISOString(),
      inputFiles: materials.length,
      aiProvider: 'langchain',
      jobId,
      segmentsProcessed: Object.values(jobState.segments).filter((s) => s.status === 'done')
        .length,
      segmentsTotal: Object.keys(jobState.segments).length || processedSegments,
      resumed: resume && jobState !== initialJobState,
    } as const;

    serviceLogger.info('Concept parsing completed', {
      materials: materials.length,
      segments: processedSegments,
      concepts: totalConcepts,
      relationships: totalRelationships,
      errors: errors.length,
    });

    return {
      success: errors.length === 0,
      concepts,
      relationships,
      statistics: {
        totalConcepts,
        validConcepts,
        totalRelationships,
        confidenceDistribution,
        difficultyDistribution,
        typeDistribution,
        processingTime,
        modelUsage: {
          'concept.parsing': llmCalls,
        },
        tokenUsage: {
          total: promptTokens + completionTokens,
          prompt: promptTokens,
          completion: completionTokens,
          estimated: true,
        },
      },
      errors,
      metadata,
    };
  };

  return {
    parseMaterials,
    rebuild: async () => {},
    clearJobCache: async (): Promise<{ removed: number }> => {
      const dir = resolveJobStoreDir();
      try {
        const entries = await fs.readdir(dir).catch(() => []);
        await fs.rm(dir, { recursive: true, force: true });
        await fs.mkdir(dir, { recursive: true });
        return { removed: entries.length };
      } catch (error) {
        serviceLogger.warn('Failed to clear concept parse job cache', toLogError(error));
        throw error;
      }
    },
  };
};

export type ConceptParsingService = ReturnType<typeof createConceptParsingService>;
