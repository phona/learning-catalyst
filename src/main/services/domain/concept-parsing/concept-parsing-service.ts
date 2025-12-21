import { randomUUID, createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
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
import { ChatOpenAI } from '@langchain/openai';
import {
  executeExtractionWorkflow,
  type ExtractionProgressCallback,
} from './extraction-workflow';

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
  /** Maximum characters of content to feed to LLM per segment.
   * -1 = unlimited (default, backward compatible)
   * 300 = fast processing (limited context)
   * 1000 = balanced (good context, efficient)
   */
  maxCharPerConcept?: number;
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
  content: string;
  order: number;
};

type ConceptParsingDeps = {
  providerFactory: ProviderFactory;
  vectorDatabase?: VectorDatabase;
  loggerService: { child: (meta: Record<string, unknown>) => ILogger };
  // DI support for testing and flexibility
  fileSystem?: {
    readFile: (path: string, encoding: string) => Promise<string>;
    writeFile: (path: string, data: string, encoding: string) => Promise<void>;
    mkdir: (path: string, options: { recursive: boolean }) => Promise<void>;
    readdir: (path: string) => Promise<string[]>;
    rm: (path: string, options: { recursive: boolean; force: boolean }) => Promise<void>;
  };
  jobStoreDir?: string;
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
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
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
    totalTokens?: number;
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
  maxCharPerConcept: -1,
  vectorize: true,
  options: {
    confidenceThreshold: 0.6,
    maxConceptsPerSegment: 32,
    maxConcurrentSegments: 3,
  },
};

/**
 * Stage 1 Deduplication: Lightweight name-based deduplication within parsing batch
 * Merges concepts with similar names to reduce duplicates before KB check
 */
const deduplicateWithinBatch = (
  concepts: ParsedConcept[],
  relationships: ParsedRelationship[],
): {
  deduplicatedConcepts: ParsedConcept[];
  deduplicatedRelationships: ParsedRelationship[];
  duplicatesMerged: number;
  relationshipsSkipped: number;
} => {
  const deduplicatedConcepts: ParsedConcept[] = [];
  const canonicalMap = new Map<string, ParsedConcept>();
  const duplicatesMergedMap = new Map<string, string[]>(); // canonicalId -> duplicateIds

  // Helper: Calculate string similarity using Jaccard index
  const calculateStringSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    // Token-based Jaccard similarity
    const tokens1 = new Set(s1.split(/\s+/).filter((t) => t.length > 2));
    const tokens2 = new Set(s2.split(/\s+/).filter((t) => t.length > 2));

    const intersection = new Set(Array.from(tokens1).filter((x) => tokens2.has(x)));
    const union = new Set(Array.from(tokens1).concat(Array.from(tokens2)));

    return union.size === 0 ? 0 : intersection.size / union.size;
  };

  // First pass: Find canonical concepts
  for (const concept of concepts) {
    const canonicalName = concept.name.toLowerCase().trim();

    // Check if this concept is already a duplicate of an existing canonical
    let foundCanonical = false;
    for (const [canonicalId, canonical] of Array.from(canonicalMap.entries())) {
      const similarity = calculateStringSimilarity(concept.name, canonical.name);

      // Threshold for name similarity (0.85 catches "AI" vs "AI Systems")
      if (similarity >= 0.85) {
        // Mark as duplicate
        if (!duplicatesMergedMap.has(canonicalId)) {
          duplicatesMergedMap.set(canonicalId, []);
        }
        duplicatesMergedMap.get(canonicalId)!.push(concept.id);

        // Optionally merge metadata into canonical
        const existingMetadata = canonical.metadata ?? {};
        const newMetadata = {
          ...existingMetadata,
          mergedFrom: [
            ...(Array.isArray(existingMetadata.mergedFrom) ? existingMetadata.mergedFrom : []),
            concept.id,
          ],
          mergeCount: (existingMetadata.mergeCount as number) ?? 0 + 1,
          lastMergedAt: new Date().toISOString(),
        };

        // Update canonical with merged metadata
        canonical.metadata = newMetadata;
        foundCanonical = true;
        break;
      }
    }

    // If not a duplicate, make it a canonical concept
    if (!foundCanonical) {
      canonicalMap.set(concept.id, { ...concept });
    }
  }

  // Build deduplicated concepts array
  for (const [canonicalId, canonical] of Array.from(canonicalMap.entries())) {
    const duplicates = duplicatesMergedMap.get(canonicalId) ?? [];
    if (duplicates.length > 0) {
      // Add merge info to metadata
      deduplicatedConcepts.push({
        ...canonical,
        metadata: {
          ...canonical.metadata,
          mergedFrom: duplicates,
          mergeCount: duplicates.length,
          deduplicated: true,
        },
      });
    } else {
      deduplicatedConcepts.push(canonical);
    }
  }

  // Update relationships to point to canonical IDs
  const deduplicatedRelationships: ParsedRelationship[] = [];
  const conceptIdMap = new Map<string, string>(); // oldId -> canonicalId

  // Build mapping of old IDs to canonical IDs
  for (const [canonicalId, canonical] of Array.from(canonicalMap.entries())) {
    conceptIdMap.set(canonicalId, canonicalId);
    const duplicates = duplicatesMergedMap.get(canonicalId) ?? [];
    for (const dupId of duplicates) {
      conceptIdMap.set(dupId, canonicalId);
    }
  }

  // Update relationships to use canonical concept IDs
  const relationshipsWithCanonicalIds: ParsedRelationship[] = [];
  for (const rel of relationships) {
    const newSourceId = conceptIdMap.get(rel.sourceId) ?? rel.sourceId;
    const newTargetId = conceptIdMap.get(rel.targetId) ?? rel.targetId;

    // Skip relationships where source == target (self-loop from duplicate merge)
    if (newSourceId === newTargetId) {
      continue;
    }

    relationshipsWithCanonicalIds.push({
      ...rel,
      sourceId: newSourceId,
      targetId: newTargetId,
    });
  }

  // NEW: Deduplicate relationships by (sourceId, targetId, type)
  // Keep the relationship with the highest confidence/strength score
  const relationshipKey = (r: ParsedRelationship): string =>
    `${r.sourceId}->${r.targetId}->${r.type}`;

  const uniqueRelationships = new Map<string, ParsedRelationship>();

  for (const rel of relationshipsWithCanonicalIds) {
    const key = relationshipKey(rel);
    const existing = uniqueRelationships.get(key);

    if (!existing) {
      // First relationship between these concepts
      uniqueRelationships.set(key, rel);
    } else {
      // Duplicate found - keep the one with higher score
      // Score = (confidence × 0.7) + (strength × 0.3)
      const existingScore =
        (existing.confidence ?? 0.5) * 0.7 + (existing.strength ?? 0.5) * 0.3;
      const currentScore =
        (rel.confidence ?? 0.5) * 0.7 + (rel.strength ?? 0.5) * 0.3;

      if (currentScore > existingScore) {
        uniqueRelationships.set(key, rel);
      }
    }
  }

  // Build final deduplicated relationships array
  for (const rel of Array.from(uniqueRelationships.values())) {
    deduplicatedRelationships.push(rel);
  }

  const duplicatesMerged = concepts.length - deduplicatedConcepts.length;
  const relationshipsSkipped =
    relationshipsWithCanonicalIds.length - deduplicatedRelationships.length;

  return {
    deduplicatedConcepts,
    deduplicatedRelationships,
    duplicatesMerged,
    relationshipsSkipped,
  };
};

const createFileSystem = (deps?: ConceptParsingDeps) => {
  const fsImpl = deps?.fileSystem ?? {
    readFile: async (path: string, encoding: string) => (await fs.readFile(path, { encoding: encoding as BufferEncoding })).toString(),
    writeFile: async (path: string, data: string, encoding: string) => fs.writeFile(path, data, { encoding: encoding as BufferEncoding }),
    mkdir: async (path: string, options: { recursive: boolean }) => fs.mkdir(path, options),
    readdir: async (path: string) => fs.readdir(path),
    rm: async (path: string, options: { recursive: boolean; force: boolean }) => fs.rm(path, options),
  };

  const resolveJobStoreDir = (): string => {
    if (deps?.jobStoreDir) {
      return deps.jobStoreDir;
    }
    if (process.env.CONCEPT_PARSE_JOB_DIR) {
      return process.env.CONCEPT_PARSE_JOB_DIR;
    }
    // Use workspace path (from env var or cwd), then .catalyst subdirectory
    // This matches the pattern used by SQLite and Qdrant
    const workspacePath = process.env.WORKSPACE_PATH || process.cwd();
    const catalystDir = path.join(workspacePath, '.catalyst');
    return path.join(catalystDir, 'concept-parse-jobs');
  };

  const ensureDir = async (dir: string): Promise<void> => {
    await fsImpl.mkdir(dir, { recursive: true });
  };

  const loadJobState = async (jobId: string): Promise<ConceptParsingJobState | null> => {
    const dir = resolveJobStoreDir();
    const file = path.join(dir, `${jobId}.json`);
    try {
      const raw = await fsImpl.readFile(file, 'utf8');
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
    await fsImpl.writeFile(file, payload, 'utf8');
  };

  const clearJobCache = async (): Promise<{ removed: number }> => {
    const dir = resolveJobStoreDir();
    const entries = await fsImpl.readdir(dir).catch(() => []);
    await fsImpl.rm(dir, { recursive: true, force: true });
    await fsImpl.mkdir(dir, { recursive: true });
    return { removed: entries.length };
  };

  return {
    resolveJobStoreDir,
    ensureDir,
    loadJobState,
    saveJobState,
    clearJobCache,
    fsImpl,
  };
};

const hashSegment = (segment: ConceptSegment): string =>
  createHash('sha256').update(segment.content).digest('hex');

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

/**
 * Merge adjacent segments to reduce LLM calls while respecting maxCharPerConcept.
 *
 * This optimization combines small consecutive segments into fewer, larger segments.
 * Each merged segment's content includes all original headings, preserving context
 * for the LLM while reducing API calls.
 *
 * @param segments - Raw segments from createSegmentsFromText()
 * @param maxCharPerConcept - Maximum characters per merged segment (-1 = unlimited)
 * @returns Merged segments ready for LLM processing
 *
 * @example
 * // Without merging: 5 segments → 5 LLM calls
 * // With merging (limit=500): 5 segments → 2-3 LLM calls
 */
const mergeSegments = (
  segments: ConceptSegment[],
  maxCharPerConcept: number,
): ConceptSegment[] => {
  if (segments.length <= 1 || maxCharPerConcept === 0) {
    return segments.map((s, i) => ({ ...s, order: i }));
  }

  const merged: ConceptSegment[] = [];
  let current: ConceptSegment = segments[0];

  for (let i = 1; i < segments.length; i++) {
    const next = segments[i];
    const combinedLength = current.content.length + 1 + next.content.length;

    // Merge if unlimited (-1) or combined size is within limit
    if (maxCharPerConcept === -1 || combinedLength <= maxCharPerConcept) {
      current = {
        id: current.id,
        content: `${current.content}\n${next.content}`,
        order: merged.length,
      };
    } else {
      // Can't merge, push current and start new
      merged.push(current);
      current = next;
    }
  }

  merged.push(current);

  return merged;
};

/**
 * Apply context limit to segment content for LLM processing.
 *
 * This function enforces a hard limit on how much content the LLM sees per segment.
 * If unlimited (-1), returns full content. If content exceeds limit, truncates to first N chars.
 *
 * @param content - Raw segment content
 * @param maxCharPerConcept - Maximum characters to feed to LLM (-1 = unlimited)
 * @returns Limited content for LLM processing
 *
 * @example
 * // Unlimited: 2000 chars → 2000 chars
 * // Limited (300): 2000 chars → 300 chars
 */
const applyContextLimit = (
  content: string,
  maxCharPerConcept: number,
): string => {
  if (maxCharPerConcept === -1) {
    return content;
  }

  if (content.length > maxCharPerConcept) {
    return content.substring(0, maxCharPerConcept);
  }

  return content;
};

const createSegmentsFromText = async (
  content: string,
  settings: ConceptParsingSettings,
  format?: 'markdown' | 'text',
  filePath?: string,
): Promise<ConceptSegment[]> => {
  const normalized = (content ?? '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const lines = normalized.split('\n');
  const segments: ConceptSegment[] = [];

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
      const maxChars = settings.maxSegmentChars ?? 0;

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: maxChars || 1200,
        chunkOverlap: Math.max(0, Math.floor((maxChars || 1200) * 0.1)),
      });

      for (const h of included) {
        const startLine = h.startLine;
        const nextHeading = included.find(next => next.startLine > h.startLine);
        // Include heading line (startLine - 1) but exclude next heading to prevent duplication
        const endLine = nextHeading ? nextHeading.startLine - 1 : lines.length;

        const contentBlock = lines.slice(startLine - 1, endLine).join('\n').trim();

        const chunks = contentBlock.length > (maxChars || 1200)
          ? await splitter.splitText(contentBlock)
          : [contentBlock];

        chunks.forEach((chunk) => {
          if (chunk.trim()) {
            segments.push({
              id: randomUUID(),
              content: chunk,
              order: segments.length,
            });
          }
        });
      }

      return segments.filter((segment) => segment.content.trim());
    }
  }

  throw new Error('Content must be in markdown format with headings');
};


/**
 * Store final concepts in Qdrant with their actual concept IDs
 * This should be called AFTER concepts are extracted and mapped
 */
const addConceptsToVector = async (
  concepts: ParsedConcept[],
  providerFactory: ProviderFactory,
  vectorDatabase?: VectorDatabase,
  logger?: ILogger,
) => {
  if (!vectorDatabase || concepts.length === 0) return;

  try {
    const embeddingModel = await providerFactory.getEmbeddingModel();
    const startTime = Date.now();

    // FAST: Batch all concept texts and generate embeddings at once
    const conceptTexts = concepts.map(concept => `${concept.name}\n\n${concept.description}`);
    const embeddings = await embeddingModel.embedBatch(conceptTexts);

    // FAST: Prepare all documents for batch insertion
    const documentsWithEmbeddings = concepts.map((concept, index) => ({
      doc: {
        id: `concept:${concept.id}`,
        content: conceptTexts[index],
        metadata: {
          conceptId: concept.id,  // ← PURE SEPARATION: Only conceptId in Qdrant
        },
      },
      embedding: Array.isArray(embeddings[index]) ? embeddings[index] : embeddings[index] as number[],
    }));

    // FAST: Store all documents in a single batch operation
    await vectorDatabase.addDocumentBatch(documentsWithEmbeddings);

    const durationMs = Date.now() - startTime;
    logger?.debug(
      'Concepts vector storage completed',
      {
        conceptCount: concepts.length,
        durationMs,
        avgTimePerConcept: durationMs / concepts.length,
      },
    );
  } catch (error) {
    logger?.warn(
      'Concept vector storage failed',
      error instanceof Error ? error : undefined,
      {
        conceptCount: concepts.length,
        details: toLogError(error),
      },
    );
  }
};

export const createConceptParsingService = (deps: ConceptParsingDeps) => {
  const { providerFactory, vectorDatabase, loggerService, fileSystem, jobStoreDir } = deps;
  const serviceLogger = loggerService.child({ service: 'concept-parsing' });
  let currentProviderFactory = providerFactory;

  // Create file system abstraction with DI support
  const fsApi = createFileSystem(deps);

  const extractSegment = async (
    segment: ConceptSegment,
    material: ConceptParsingMaterial,
    maxCharPerConcept: number,
    progressCallback?: ExtractionProgressCallback,
  ): Promise<SegmentExtractionSchema> => {
    const startTs = Date.now();

    const limitedContent = applyContextLimit(segment.content, maxCharPerConcept);
    const preview = createPreparsedMaterial(limitedContent, {
      filePath: material.filePath ?? material.title,
      sourceLabel: material.title,
    });
    const previewPayload = previewToPromptPayload(preview);
    const lines = limitedContent.split(/\r?\n/).length;
    const model = await currentProviderFactory.getModel();

    if (!model || typeof model !== 'object') {
      throw new Error(`Invalid model type: ${typeof model}. Expected ChatOpenAI instance.`);
    }

    const payloadSize = previewPayload.length;
    serviceLogger.info('Segment extraction start', {
      segmentId: segment.id,
      segmentTitle: segment.content.split('\n')[0].substring(0, 50),
      originalChars: segment.content.length,
      limitedChars: limitedContent.length,
      lines,
      promptLength: payloadSize,
      previewStats: preview.stats,
      promptToContentRatio: (payloadSize / Math.max(1, limitedContent.length)).toFixed(2),
    });
    try {
      // DEBUG: Log model configuration for concept parsing
      const modelConfig = (model as any)?.config || {};
      serviceLogger.debug('[CONCEPT-PARSING] Model config', {
        segmentId: segment.id,
        modelName: modelConfig.modelName || modelConfig.model,
        timeoutMs: modelConfig.timeout,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
        maxRetries: modelConfig.maxRetries,
        invocationStart: new Date().toISOString(),
      });

      serviceLogger.info('[CONCEPT-PARSING] LangChain invoke starting', {
        segmentId: segment.id,
        payloadSize,
        timestamp: new Date().toISOString(),
      });

      const chainInvokeStart = Date.now();

      serviceLogger.info('[CONCEPT-PARSING] Starting LangGraph workflow', {
        segmentId: segment.id,
        contentLength: limitedContent.length,
        timestamp: new Date().toISOString(),
      });

      const workflowResult = await executeExtractionWorkflow(
        limitedContent,
        model as ChatOpenAI,
        serviceLogger,
        2,
        progressCallback,
      );

      const chainInvokeDuration = Date.now() - chainInvokeStart;

      serviceLogger.info('[CONCEPT-PARSING] LangGraph workflow completed', {
        segmentId: segment.id,
        success: workflowResult.success,
        attempts: workflowResult.attempt,
        chainInvokeDurationMs: chainInvokeDuration,
        chainInvokeDurationSec: (chainInvokeDuration / 1000).toFixed(2),
        completionTime: new Date().toISOString(),
        metrics: workflowResult.metrics,
        tokenUsage: workflowResult.tokenUsage,
      });

      if (!workflowResult.success) {
        throw new Error(workflowResult.error || 'Extraction failed');
      }

      // Convert to expected format for return
      const result = workflowResult.result!;
      const typedResult: SegmentExtractionSchema = {
        summary: result.summary,
        focusAreas: result.focusAreas,
        nodes: result.nodes.map(node => ({
          name: node.name,
          description: node.description ?? undefined,
          type: node.type ?? undefined,
          difficulty: node.difficulty ?? undefined,
          confidence: node.confidence ?? undefined,
          tags: node.tags ?? undefined,
          metadata: node.metadata ?? undefined,
        })),
        relationships: result.relationships.map(rel => ({
          from: rel.from,
          to: rel.to,
          type: rel.type ?? undefined,
          strength: rel.strength ?? undefined,
          confidence: rel.confidence ?? undefined,
          description: rel.description ?? undefined,
          metadata: rel.metadata ?? undefined,
        })),
        recommendations: result.recommendations,
      };

      const durationMs = Date.now() - startTs;
      const segmentTitle = segment.content.split('\n')[0].replace(/^#+\s*/, '').substring(0, 50);
      serviceLogger.info('Segment extraction completed', {
        segmentId: segment.id,
        segmentTitle,
        attempts: workflowResult.attempt,
        durationMs,
        nodes: typedResult.nodes.length,
        relationships: typedResult.relationships.length,
        avgTimePerNode: durationMs / Math.max(1, typedResult.nodes.length),
        tokenUsage: workflowResult.tokenUsage,
      });

      // Return both the typed result and token usage
      return {
        ...typedResult,
        tokenUsage: workflowResult.tokenUsage,
      };
    } catch (error) {
      const durationMs = Date.now() - startTs;
      const segmentTitle = segment.content.split('\n')[0].replace(/^#+\s*/, '').substring(0, 50);
      serviceLogger.error('Segment extraction error', toLogError(error), {
        segmentId: segment.id,
        segmentTitle,
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
        segmentTitle: segment.content.split('\n')[0].substring(0, 50),
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
    progressCallback?: ExtractionProgressCallback,
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
      (resume ? await fsApi.loadJobState(jobId) : null) ?? initialJobState;

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
      const rawSegments = await createSegmentsFromText(
        material.content,
        normalizedSettings,
        material.format,
        material.filePath,
      );

      const maxCharPerConcept = normalizedSettings.maxCharPerConcept ?? -1;
      const mergedSegments = mergeSegments(rawSegments, maxCharPerConcept);
      processedSegments += mergedSegments.length;

      serviceLogger.debug('Segments prepared', {
        materialId: material.id,
        rawCount: rawSegments.length,
        mergedCount: mergedSegments.length,
        maxCharPerConcept,
      });

      const runnableSegments: Array<{ segment: ConceptSegment; material: ConceptParsingMaterial; hash: string }> = [];
      const filtered = mergedSegments.filter((segment) => !shouldSkipSegment(segment, normalizedSettings));

      for (const segment of filtered) {
        const hash = hashSegment(segment);
        const existing = jobState.segments[hash];
        jobState.segments[hash] = {
          hash,
          segmentId: segment.id,
          materialId: material.id,
          title: segment.content.split('\n')[0].substring(0, 50),
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

      console.log(runnableSegments);
      let cursor = 0;
      const worker = async (): Promise<void> => {
        while (cursor < runnableSegments.length) {
          const idx = cursor;
          cursor += 1;
          const { segment, material: segMaterial, hash } = runnableSegments[idx];
          const start = Date.now();

          try {
            const extraction = await extractSegment(segment, segMaterial, maxCharPerConcept, progressCallback);
            llmCalls += 1;
            serviceLogger.info('Segment extraction successful', extraction);
            const segmentConcepts = (extraction.nodes ?? []).slice(0, maxPerSegment);

            // Use actual token counts from extraction result (native LangChain tracking)
            const tokenUsage = extraction.tokenUsage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
            promptTokens += tokenUsage.promptTokens;
            completionTokens += tokenUsage.completionTokens;

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

            // Token aggregation is already done above from extraction.tokenUsage
            const duration = Date.now() - start;
            processingTime += duration;
            const segmentTitle = segment.content.split('\n')[0].replace(/^#+\s*/, '').substring(0, 50);

            jobState.segments[hash] = {
              hash,
              segmentId: segment.id,
              materialId: segMaterial.id,
              title: segmentTitle,
              status: 'done',
              result: {
                concepts: mappedNodes,
                relationships: mappedRelationships,
                promptTokens: tokenUsage.promptTokens, // ← Use actual counts
                completionTokens: tokenUsage.completionTokens, // ← Use actual counts
                totalTokens: tokenUsage.totalTokens, // ← Add total
                processingTime: duration,
              },
              updatedAt: new Date().toISOString(),
            };
            jobState.updatedAt = new Date().toISOString();
            await fsApi.saveJobState(jobState);
          } catch (error) {
            const segmentTitle = segment.content.split('\n')[0].replace(/^#+\s*/, '').substring(0, 50);
            errors.push(
              `[${segmentTitle}] ${error instanceof Error ? error.message : String(error)}`,
            );
            jobState.segments[hash] = {
              hash,
              segmentId: segment.id,
              materialId: segMaterial.id,
              title: segmentTitle,
              status: 'failed',
              error: error instanceof Error ? error.message : String(error),
              updatedAt: new Date().toISOString(),
            };
            jobState.updatedAt = new Date().toISOString();
            await fsApi.saveJobState(jobState);
            serviceLogger.error('Concept segment processing failed', error, {
              segmentId: segment.id,
              segmentTitle,
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
    await fsApi.saveJobState(jobState);

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

    // Stage 1: In-batch deduplication (lightweight, name-based)
    const deduplicationResult = deduplicateWithinBatch(concepts, relationships);
    const {
      deduplicatedConcepts,
      deduplicatedRelationships,
      duplicatesMerged,
      relationshipsSkipped = 0,
    } = deduplicationResult;

    if (duplicatesMerged > 0 || relationshipsSkipped > 0) {
      serviceLogger.info('In-batch deduplication completed', {
        duplicatesMerged,
        relationshipsSkipped,
        originalConcepts: totalConcepts,
        originalRelationships: relationships.length,
        deduplicatedConcepts: deduplicatedConcepts.length,
        deduplicatedRelationships: deduplicatedRelationships.length,
      });
    }

    // Store final concepts in Qdrant with their actual IDs
    // This happens AFTER deduplication, so we store the canonical concepts
    await addConceptsToVector(deduplicatedConcepts, providerFactory, vectorDatabase, serviceLogger);

    return {
      success: errors.length === 0,
      concepts: deduplicatedConcepts,
      relationships: deduplicatedRelationships,
      statistics: {
        totalConcepts: deduplicatedConcepts.length,
        validConcepts,
        totalRelationships: deduplicatedRelationships.length,
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
          estimated: false, // ← Now using native LangChain token tracking!
        },
        // Deduplication stats - ENHANCED
        deduplication: {
          duplicatesMerged,
          relationshipsSkipped,
          deduplicationStrategy: 'in_batch_name_similarity',
          originalCounts: {
            concepts: totalConcepts,
            relationships: relationships.length,
          },
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
      return fsApi.clearJobCache();
    },
  };
};

export type ConceptParsingService = ReturnType<typeof createConceptParsingService>;
