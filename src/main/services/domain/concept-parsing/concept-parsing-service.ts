import { randomUUID } from 'node:crypto';
import type { ILogger } from '../../types';
import type { AiService } from '@/main/services/ai/ai-service';
import {
  createPreparsedMaterial,
  previewToPromptPayload,
  extractMarkdownHeadings,
} from '../content/content-preview';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { VectorDatabase } from '../knowledge/vector/vector-database';
import type { DomainAgent } from '@/main/services/agent/domain-agent';
import type {
  ConceptParsingResult,
  ParsedConcept,
  ParsedRelationship,
} from '@/shared/types/electron-api/knowledge-api';
import { createSegmentExtractChain, SEGMENT_EXTRACTION_TEMPLATE, formatInstructions } from './prompts';

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
  options?: {
    confidenceThreshold?: number;
    maxConceptsPerSegment?: number;
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
  aiService: AiService;
  domainAgent: DomainAgent;
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
  maxSegmentChars: 1400,
  minSegmentChars: 120,
  vectorize: true,
  options: {
    confidenceThreshold: 0.6,
    maxConceptsPerSegment: 32,
  },
};

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

const addSegmentToVector = async (
  segment: ConceptSegment,
  material: ConceptParsingMaterial,
  vectorDatabase?: VectorDatabase,
  logger?: ILogger,
) => {
  if (!vectorDatabase) return;

  try {
    const preview = createPreparsedMaterial(segment.content, {
      filePath: material.filePath ?? material.title,
      sourceLabel: material.title,
    });

    await vectorDatabase.addDocument({
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
    });
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

export const createConceptParsingService = ({
  aiService,
  domainAgent,
  vectorDatabase,
  loggerService,
}: ConceptParsingDeps) => {
  const serviceLogger = loggerService.child({ service: 'concept-parsing' });
  const segmentExtractChain = createSegmentExtractChain(domainAgent.chatModel);

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
    serviceLogger.info('Segment extraction start', {
      segmentId: segment.id,
      segmentTitle: segment.title,
      chars: segment.content.length,
      lines,
      promptLength: previewPayload.length,
      previewStats: preview.stats,
      model: JSON.stringify(domainAgent.chatModel),
    });
    try {
      const result = (await segmentExtractChain.invoke({
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
        model: JSON.stringify(domainAgent.chatModel),
      });
      const timeoutMs = (domainAgent.chatModel as any)?.timeout;
      const isTimeout =
        (error as any)?.name === 'TimeoutError' ||
        String((error as any)?.message ?? '')
          .toLowerCase()
          .includes('timeout');
      serviceLogger.info('Timeout diagnostics', { isTimeout, durationMs, timeoutMs });
      serviceLogger.info('Prompt payload', {
        preview_payload: previewPayload,
        segment_content: segment.content,
        preview: preview,
      });
      serviceLogger.info('Segment context', {
        head: segment.content.slice(0, 500),
        length: segment.content.length,
      });
      const client = (domainAgent.chatModel as any)?.client as any;
      serviceLogger.info('Model endpoint', {
        baseURL: client?.baseURL,
        model: (domainAgent.chatModel as any)?.model,
        maxTokens: (domainAgent.chatModel as any)?.maxTokens,
        temperature: (domainAgent.chatModel as any)?.temperature,
      });
      try {
        const originMessages = await SEGMENT_EXTRACTION_TEMPLATE.formatMessages({
          preview_payload: previewPayload,
          format_instructions: formatInstructions,
        });
        const originSystem = (originMessages[0] as any)?.content ?? '';
        const originUser = (originMessages[1] as any)?.content ?? '';
        serviceLogger.info('Origin prompt system', { content: originSystem });
        serviceLogger.info('Origin prompt user', { content: originUser });
        const originRaw = await (domainAgent.chatModel as any).invoke(originMessages as any);
        const originText = typeof originRaw === 'string' ? originRaw : (originRaw as any)?.content ?? '';
        serviceLogger.info('Origin LLM response', { content: originText });
      } catch {}
      try {
        if (isTimeout) {
          const minimalPayload = JSON.stringify({
            source: preview.source,
            outline: (preview.outline ?? []).slice(0, 2),
            snippets: (preview.snippets ?? [])
              .slice(0, 1)
              .map((s: any) => ({ label: s.label, excerpt: String(s.excerpt ?? '').slice(0, 280), startLine: s.startLine })),
          });
          serviceLogger.info('Retry with minimal payload', { length: minimalPayload.length });
          const retryResult = (await segmentExtractChain.invoke({ preview_payload: minimalPayload })) as SegmentExtractionSchema;
          serviceLogger.info('Segment extraction end', {
            segmentId: segment.id,
            segmentTitle: segment.title,
            durationMs: Date.now() - startTs,
            nodes: (retryResult.nodes ?? []).length,
            relationships: (retryResult.relationships ?? []).length,
            summaryLength: (retryResult.summary ?? '').length,
          });
          return retryResult;
        }
        const fallbackTemplate = ChatPromptTemplate.fromMessages([
          ['system', 'Extract structured concepts and relationships strictly as JSON.'],
          ['user', '{preview_payload}'],
        ]);
        const messages = await fallbackTemplate.formatMessages({ preview_payload: previewPayload });
        const raw = await (domainAgent.chatModel as any).invoke(messages as any);
        const text = typeof raw === 'string' ? raw : (raw as any)?.content ?? '';
        const cleaned = String(text).replace(/```json/gi, '').replace(/```/g, '').trim();
        if (!cleaned) {
          throw error;
        }
        const parsed = JSON.parse(cleaned);
        const normalized: SegmentExtractionSchema = {
          summary: String(parsed.summary ?? ''),
          focusAreas: Array.isArray(parsed.focusAreas) ? parsed.focusAreas : [],
          nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
          relationships: Array.isArray(parsed.relationships) ? parsed.relationships : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        };
        serviceLogger.info('Segment extraction end', {
          segmentId: segment.id,
          segmentTitle: segment.title,
          durationMs: Date.now() - startTs,
          nodes: (normalized.nodes ?? []).length,
          relationships: (normalized.relationships ?? []).length,
          summaryLength: (normalized.summary ?? '').length,
        });
        return normalized;
      } catch (fallbackError) {
        serviceLogger.error('Segment extraction fallback failed', toLogError(fallbackError), {
          segmentId: segment.id,
          segmentTitle: segment.title,
        });
        throw error;
      }
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

    for (const material of materials) {
      let segments = createSegmentsFromText(
        material.content,
        normalizedSettings,
        material.format,
        material.filePath,
      );
      const maxChars = normalizedSettings.maxSegmentChars ?? 0;
      if (maxChars > 0) {
        segments = await chunkSegmentsWithLangChain(segments, maxChars);
      }
      processedSegments += segments.length;
      serviceLogger.debug('Segments prepared', { materialId: material.id, count: segments.length });

      for (const segment of segments) {
        if (shouldSkipSegment(segment, normalizedSettings)) {
          continue;
        }

        const start = Date.now();

        try {
          const extraction = await extractSegment(segment, material);
          serviceLogger.info('Segment extraction successful', extraction);
          const segmentConcepts = (extraction.nodes ?? []).slice(0, maxPerSegment);

          if (normalizedSettings.vectorize !== false) {
            await addSegmentToVector(segment, material, vectorDatabase, serviceLogger);
          }

          const mappedNodes = segmentConcepts.map((node) => mapConcept(node, segment, material));
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
        } catch (error) {
          errors.push(
            `[${segment.title}] ${error instanceof Error ? error.message : String(error)}`,
          );
          serviceLogger.error('Concept segment processing failed', error, {
            segmentId: segment.id,
            segmentTitle: segment.title,
            model: JSON.stringify(domainAgent.chatModel),
            details: JSON.stringify(error),
          });
        } finally {
          processingTime += Date.now() - start;
        }
      }
    }

    const metadata = {
      processingTime,
      processedAt: new Date().toISOString(),
      inputFiles: materials.length,
      aiProvider: 'langchain',
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
          'concept.parsing': processedSegments,
        },
      },
      errors,
      metadata,
    };
  };

  return {
    parseMaterials,
    rebuild: async (agent?: DomainAgent) => {
      if (agent) {
        domainAgent = agent;
      }
    },
  };
};

export type ConceptParsingService = ReturnType<typeof createConceptParsingService>;
