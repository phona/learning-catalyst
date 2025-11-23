import { randomUUID } from 'node:crypto';
import type { ModelConfig } from '../../ai/ai-types';
import type { ILogger } from '../../types';
import type { AiService } from '@/main/services/ai/ai-service';
import { createPreparsedMaterial, previewToPromptPayload } from '../content/content-preview';
import { createStructuredJsonRunner } from '../shared/structured-json-runner';
import type { VectorDatabase } from '../knowledge/vector/vector-database';
import type { DomainAgent } from '@/main/services/agent/domain-agent';
import type {
  ConceptParsingResult,
  ParsedConcept,
  ParsedRelationship,
} from '@/shared/types/electron-api/knowledge-api';

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

  lines.forEach((line) => {
    const trimmed = line.trim();
    const isHeading = settings.splitByHeading !== false && /^#{1,6}\s+/.test(trimmed);
    if (isHeading && current.content.trim()) {
      segments.push({ ...current, content: current.content.trim(), order: segments.length });
      current = {
        id: randomUUID(),
        title: trimmed.replace(/^#{1,6}\s+/, '').trim() || 'Section',
        content: `${trimmed}\n`,
      };
      return;
    }

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

  const maxChars = settings.maxSegmentChars ?? 0;
  if (maxChars > 0) {
    return segments
      .flatMap((segment, index) => chunkSegment(segment, maxChars, index))
      .filter((segment) => !shouldSkipSegment(segment, settings));
  }

  return segments
    .filter((segment) => !shouldSkipSegment(segment, settings))
    .map((segment, index) => ({ ...segment, order: index }));
};

const chunkSegment = (
  segment: ConceptSegment,
  maxChars: number,
  baseOrder: number,
): ConceptSegment[] => {
  if (!maxChars || segment.content.length <= maxChars) {
    return [{ ...segment, order: baseOrder }];
  }

  const chunks: ConceptSegment[] = [];
  let pointer = 0;
  let part = 1;

  while (pointer < segment.content.length) {
    const chunkContent = segment.content.slice(pointer, pointer + maxChars).trim();
    if (!chunkContent) break;
    chunks.push({
      id: randomUUID(),
      title: `${segment.title} (part ${part})`,
      content: chunkContent,
      order: baseOrder + chunks.length,
    });
    pointer += maxChars;
    part += 1;
  }

  return chunks.length ? chunks : [{ ...segment, order: baseOrder }];
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
    logger?.warn('Concept parsing vector insertion failed', error);
  }
};

const buildSegmentFallback = (
  segment: ConceptSegment,
  material: ConceptParsingMaterial,
): SegmentExtractionSchema => {
  const descriptionPreview = segment.content.slice(0, 300);
  return {
    summary: `Segment from ${material.title}: ${descriptionPreview}`,
    focusAreas: [segment.title],
    nodes: [
      {
        name: segment.title,
        description: descriptionPreview,
        type: 'concept',
        difficulty: 'intermediate',
        confidence: 0.5,
        tags: ['segment'],
        metadata: {
          generatedBy: 'concept-parsing:fallback',
        },
      },
    ],
    relationships: [],
    recommendations: ['Review the segment and assign a concept label if needed.'],
  };
};

const SEGMENT_SYSTEM_PROMPT = `You are a knowledge curator. Given a document segment, return JSON with summary, focusAreas (string[]), nodes (name,type,difficulty,confidence,tags,description,metadata), relationships (from,to,type,strength,confidence,description,metadata), and recommendations (string[]). Keep the JSON tidy and only include nodes that are actual concepts or skills discussed in the text.`;

export const createConceptParsingService = ({
  aiService,
  domainAgent,
  vectorDatabase,
  loggerService,
}: ConceptParsingDeps) => {
  const serviceLogger = loggerService.child({ service: 'concept-parsing' });
  const presetId = 'knowledge.extraction';
  let modelConfig: ModelConfig;

  try {
    modelConfig = aiService.getModelPreset(presetId);
  } catch {
    serviceLogger.warn('knowledge extraction preset missing, falling back to default');
    modelConfig = aiService.getModelPreset('default');
  }

  const { runStructuredJson } = createStructuredJsonRunner({
    aiService,
    domainAgent,
    logger: serviceLogger,
    modelConfig,
  });

  const extractSegment = async (
    segment: ConceptSegment,
    material: ConceptParsingMaterial,
  ): Promise<SegmentExtractionSchema> => {
    const preview = createPreparsedMaterial(segment.content, {
      filePath: material.filePath ?? material.title,
      sourceLabel: material.title,
    });
    const previewPayload = previewToPromptPayload(preview);
    const fallback = buildSegmentFallback(segment, material);

    return runStructuredJson<SegmentExtractionSchema>({
      systemPrompt: SEGMENT_SYSTEM_PROMPT,
      input: previewPayload,
      fallbackPrompt: `Segment title: ${segment.title}\nPreview JSON:\n${previewPayload}`,
      fallback,
      context: `concept-parsing-segment-${segment.id}`,
    });
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
      const segments = createSegmentsFromText(material.content, normalizedSettings);
      processedSegments += segments.length;

      for (const segment of segments) {
        if (shouldSkipSegment(segment, normalizedSettings)) {
          continue;
        }

        const start = Date.now();

        try {
          const extraction = await extractSegment(segment, material);
          const segmentConcepts = extraction.nodes.slice(0, maxPerSegment);

          if (normalizedSettings.vectorize !== false) {
            await addSegmentToVector(segment, material, vectorDatabase, serviceLogger);
          }

          const mappedNodes = segmentConcepts.map((node) => mapConcept(node, segment, material));
          const nameToId = new Map<string, string>();
          mappedNodes.forEach((node) => {
            nameToId.set(node.name.toLowerCase(), node.id);
          });

          const mappedRelationships = extraction.relationships
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
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`Segment ${segment.id} (${material.title ?? material.id}): ${message}`);
          serviceLogger.warn('Concept parsing segment failed', {
            materialId: material.id,
            segmentId: segment.id,
            error: message,
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
      aiModel: modelConfig.model,
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
  };
};

export type ConceptParsingService = ReturnType<typeof createConceptParsingService>;
