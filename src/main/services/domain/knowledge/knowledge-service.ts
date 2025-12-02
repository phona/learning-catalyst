import { randomUUID } from 'node:crypto';
import type { Kysely } from 'kysely';
import type { ILogger } from '../../types';
import type { ConceptRow, RelationshipRow } from '@/shared/types/database';
import type { Database as CoreDatabase } from '@/main/services/core/database/kysely-schema';
import type {
  ConceptExplorationDisplay,
  ConceptParsingResult,
  ConceptIngestionPlan,
  ConceptFieldKey,
  ConceptIngestionAction,
  KnowledgeMapDisplay,
  KnowledgeNodeDisplay,
  KnowledgeRelationshipDisplay,
  KnowledgeSearchResultDisplay,
  RelatedConcept,
  RelatedConceptsDisplay,
  SearchResult,
} from '@/shared/types/electron-api/knowledge-api';

type KnowledgeServiceDeps = {
  db: Kysely<CoreDatabase>;
  loggerService: { child: (meta: Record<string, unknown>) => ILogger };
};

export interface KnowledgeIngestionOptions {
  userId?: string;
  materialId?: string;
  sessionId?: string;
  source?: string;
}

export interface KnowledgeIngestionResult {
  conceptsInserted: number;
  conceptsUpdated: number;
  relationshipsInserted: number;
  metadata: {
    processedAt: string;
    source?: string;
  };
}

type SearchParams = {
  query?: string;
  tags?: string[];
  limit?: number;
};

const difficultyLabelFromLevel = (level: number): 'basic' | 'intermediate' | 'advanced' => {
  if (level <= 1) return 'basic';
  if (level >= 4) return 'advanced';
  return 'intermediate';
};

const normalizeConceptType = (conceptType?: string): ConceptRow['concept_type'] => {
  const normalized = (conceptType ?? 'topic').toLowerCase();
  if (['topic', 'skill', 'fact', 'procedure', 'principle'].includes(normalized)) {
    return normalized as ConceptRow['concept_type'];
  }
  if (normalized.includes('skill')) return 'skill';
  if (normalized.includes('procedure') || normalized.includes('step')) return 'procedure';
  if (normalized.includes('fact') || normalized.includes('detail')) return 'fact';
  if (normalized.includes('principle') || normalized.includes('rule')) return 'principle';
  return 'topic';
};

const normalizeRelationshipType = (
  relationshipType?: string,
): RelationshipRow['relationship_type'] => {
  const normalized = (relationshipType ?? 'related').toLowerCase();
  if (
    ['prerequisite', 'related', 'contains', 'example', 'application', 'contrasts'].includes(
      normalized,
    )
  ) {
    return normalized as RelationshipRow['relationship_type'];
  }
  if (normalized.includes('require') || normalized.includes('depend')) return 'prerequisite';
  if (normalized.includes('example')) return 'example';
  if (normalized.includes('apply')) return 'application';
  if (normalized.includes('contrast') || normalized.includes('opposite')) return 'contrasts';
  if (normalized.includes('contains') || normalized.includes('part')) return 'contains';
  return 'related';
};

const clampStrength = (value?: number): number =>
  Math.min(1, Math.max(0, typeof value === 'number' ? value : 0.7));

const normalizeTags = (tags?: string[]): string[] =>
  Array.from(new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean)));

const safeParse = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const mapConceptRowToDisplay = (row: ConceptRow): KnowledgeNodeDisplay => ({
  id: row.id,
  name: row.name,
  type: row.concept_type,
  description: row.description,
  difficultyLevel: row.difficulty_level,
  masteryLevel: row.mastery_level,
  tags: safeParse<string[]>(row.tags, []),
  metadata: safeParse<Record<string, unknown>>(row.metadata, {}),
  updatedAt: row.updated_at,
  createdAt: row.created_at,
});

const mapRelationshipRowToDisplay = (row: RelationshipRow): KnowledgeRelationshipDisplay => ({
  id: row.id,
  sourceId: row.source_concept_id,
  targetId: row.target_concept_id,
  relationshipType: row.relationship_type,
  strength: row.strength,
  description: row.description,
  metadata: safeParse<Record<string, unknown>>(row.metadata, {}),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapNodeToSearchResult = (node: KnowledgeNodeDisplay): SearchResult => {
  const categoryValue = node.metadata?.category;
  const category =
    typeof categoryValue === 'string' && categoryValue.trim() ? categoryValue.trim() : 'concept';

  const difficulty = difficultyLabelFromLevel(node.difficultyLevel);
  const timeEstimate = `${Math.max(5, node.difficultyLevel * 5 + 5)} minutes`;
  const relevance = Math.min(
    1,
    Math.max(0, 0.5 + node.masteryLevel * 0.05 - node.difficultyLevel * 0.02),
  );

  return {
    id: node.id,
    title: node.name,
    type: 'concept',
    category,
    relevanceScore: parseFloat(relevance.toFixed(2)),
    preview: node.description ?? '',
    difficulty,
    estimatedTime: timeEstimate,
    tags: node.tags,
  };
};

const buildFilters = (results: SearchResult[]) => ({
  categories: Array.from(new Set(results.map((result) => result.category))),
  difficulties: Array.from(new Set(results.map((result) => result.difficulty ?? 'intermediate'))),
  types: Array.from(new Set(results.map((result) => result.type))),
});

const selectConceptByName = async (
  db: Kysely<CoreDatabase>,
  conceptName: string,
): Promise<ConceptRow | null> => {
  const exact = await db
    .selectFrom('concepts')
    .selectAll()
    .where('name', '=', conceptName)
    .executeTakeFirst();
  if (exact) return exact;

  const fuzzy = await db
    .selectFrom('concepts')
    .selectAll()
    .where('name', 'like', `%${conceptName}%`)
    .orderBy('updated_at', 'desc')
    .executeTakeFirst();
  return fuzzy ?? null;
};

const selectConceptById = async (
  db: Kysely<CoreDatabase>,
  conceptId: string,
): Promise<ConceptRow | null> => {
  const result = await db
    .selectFrom('concepts')
    .selectAll()
    .where('id', '=', conceptId)
    .executeTakeFirst();
  return result ?? null;
};

const getKnowledgeGraph = async (db: Kysely<CoreDatabase>, startId: string, depth = 1) => {
  const visited = new Set<string>();
  const collectedNodes = new Map<string, KnowledgeNodeDisplay>();
  const collectedRelationships: KnowledgeRelationshipDisplay[] = [];
  let frontier = [startId];
  let currentDepth = 0;

  while (frontier.length && currentDepth <= depth) {
    const nodes = await db.selectFrom('concepts').selectAll().where('id', 'in', frontier).execute();

    nodes.forEach((row) => {
      if (!visited.has(row.id)) {
        visited.add(row.id);
        collectedNodes.set(row.id, mapConceptRowToDisplay(row));
      }
    });

    const relationships = await db
      .selectFrom('relationships')
      .selectAll()
      .where((eb) =>
        eb.or([eb('source_concept_id', 'in', frontier), eb('target_concept_id', 'in', frontier)]),
      )
      .execute();

    const nextIds = new Set<string>();
    relationships.forEach((relationship) => {
      collectedRelationships.push(mapRelationshipRowToDisplay(relationship));
      nextIds.add(relationship.source_concept_id);
      nextIds.add(relationship.target_concept_id);
    });

    frontier = Array.from(nextIds).filter((id) => !visited.has(id));
    currentDepth += 1;
  }

  return {
    nodes: Array.from(collectedNodes.values()),
    relationships: collectedRelationships,
  };
};

const relationshipTypeToEdgeType = (type: RelationshipRow['relationship_type']) => {
  if (type === 'prerequisite') return 'prerequisite';
  if (type === 'application') return 'application';
  if (type === 'contains') return 'foundation';
  return 'related' as const;
};

const canonicalizeName = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const createKnowledgeService = ({ db, loggerService }: KnowledgeServiceDeps) => {
  const serviceLogger = loggerService.child({ service: 'knowledge' });

  const ingestConceptParsingResult = async (
    result: ConceptParsingResult,
    options: KnowledgeIngestionOptions = {},
    plan?: ConceptIngestionPlan,
  ): Promise<KnowledgeIngestionResult> => {
    const now = new Date().toISOString();
    const lowConfidenceDefault = plan?.lowConfidence?.defaultThreshold;
    const actionOverrides = plan?.actions ?? {};
    const fieldToggleOverrides = plan?.fieldToggles ?? {};
    const canonicalOverrides = plan?.canonicalization ?? {};
    const mergeTargets = plan?.mergeTargets ?? {};
    const defaultExistingAction = plan?.defaultExistingAction ?? 'overwrite';

    const lookupNames = new Set<string>();
    result.concepts.forEach((concept) => {
      const override = canonicalOverrides[concept.id];
      [concept.name, override?.canonicalName, ...(override?.aliases ?? [])]
        .filter(Boolean)
        .forEach((name) => lookupNames.add((name as string).trim()));
    });

    const existingRows =
      lookupNames.size > 0
        ? await db
          .selectFrom('concepts')
          .selectAll()
          .where('name', 'in', Array.from(lookupNames))
          .execute()
        : [];

    const mergeTargetIds = Array.from(new Set(Object.values(mergeTargets))).filter(Boolean);
    const mergeTargetRows =
      mergeTargetIds.length > 0
        ? await db.selectFrom('concepts').selectAll().where('id', 'in', mergeTargetIds).execute()
        : [];

    const existingByCanonical = new Map<string, ConceptRow>();
    const existingById = new Map<string, ConceptRow>();
    [...existingRows, ...mergeTargetRows].forEach((row) => {
      existingByCanonical.set(canonicalizeName(row.name), row);
      existingById.set(row.id, row);
    });

    const nodeIdMapping = new Map<string, string>();
    const nameById = new Map<string, string>();
    let insertedConcepts = 0;
    let updatedConcepts = 0;
    let skippedConcepts = 0;
    let mergedConcepts = 0;
    let lowConfidenceSkipped = 0;

    const resolveExisting = (candidates: string[]): ConceptRow | undefined => {
      for (const candidate of candidates) {
        const key = canonicalizeName(candidate);
        const match = existingByCanonical.get(key);
        if (match) return match;
      }
      return undefined;
    };

    const resolveAction = (
      parsedId: string,
      confidence: number,
      existing: ConceptRow | undefined,
    ): { action: ConceptIngestionAction; low: boolean } => {
      const explicit = actionOverrides[parsedId];
      if (explicit) return { action: explicit, low: false };
      const threshold =
        plan?.lowConfidence?.overrides?.[parsedId] ??
        (typeof lowConfidenceDefault === 'number' ? lowConfidenceDefault : undefined);
      if (typeof threshold === 'number' && confidence < threshold) {
        return { action: 'skip', low: true };
      }
      if (existing) {
        return { action: defaultExistingAction, low: false };
      }
      return { action: 'insert', low: false };
    };

    const defaultFieldToggles: Record<ConceptFieldKey, boolean> = {
      name: true,
      type: true,
      description: true,
      difficulty: true,
      tags: true,
    };

    const applyFieldToggles = (
      payload: {
        name: string;
        description: string;
        concept_type: ConceptRow['concept_type'];
        difficulty_level: number;
        tags: string;
        metadata: string;
      },
      existing: ConceptRow,
      toggles: Record<ConceptFieldKey, boolean>,
    ) => ({
      name: toggles.name ? payload.name : existing.name,
      description: toggles.description ? payload.description : existing.description,
      concept_type: toggles.type ? payload.concept_type : existing.concept_type,
      difficulty_level: toggles.difficulty ? payload.difficulty_level : existing.difficulty_level,
      tags: toggles.tags ? payload.tags : existing.tags,
      metadata: payload.metadata,
    });

    for (const node of result.concepts) {
      const override = canonicalOverrides[node.id] ?? {};
      const candidateNames = [
        override.canonicalName ?? node.name,
        node.name,
        ...(override.aliases ?? []),
      ].filter(Boolean) as string[];
      const existing = resolveExisting(candidateNames);
      const { action, low } = resolveAction(node.id, node.confidence ?? 0, existing);
      if (action === 'skip') {
        skippedConcepts += 1;
        if (low) {
          lowConfidenceSkipped += 1;
        }
        continue;
      }

      if (action === 'merge') {
        const targetId = mergeTargets[node.id];
        const targetRow = targetId ? existingById.get(targetId) : undefined;
        if (targetId && targetRow) {
          nodeIdMapping.set(node.id, targetId);
          nameById.set(targetId, targetRow.name);
          nameById.set(node.id, targetRow.name);
          mergedConcepts += 1;
        } else {
          serviceLogger.warn('Merge target not found for parsed concept', {
            parsedId: node.id,
            targetId,
          });
          skippedConcepts += 1;
        }
        continue;
      }

      const finalName =
        override.applyAlias && override.canonicalName
          ? override.canonicalName.trim()
          : override.canonicalName?.trim() ?? node.name.trim();

      const conceptId = existing ? existing.id : node.id || randomUUID();
      const incomingTags = Array.isArray(node.metadata?.tags) ? node.metadata.tags : [];
      const extraTags = finalName
        .split(/\s+/)
        .map((token) => token.replace(/[^\w]/g, '').toLowerCase())
        .filter(Boolean);
      const normalizedTags = normalizeTags([...incomingTags, node.type, ...extraTags]);
      const toggles: Record<ConceptFieldKey, boolean> = {
        ...defaultFieldToggles,
        ...(fieldToggleOverrides[node.id] ?? {}),
      };
      const effectiveTags = toggles.tags
        ? normalizedTags
        : existing
          ? safeParse<string[]>(existing.tags, normalizedTags)
          : normalizedTags;

      const metadataPayload = JSON.stringify({
        ...(node.metadata ?? {}),
        segmentId: node.metadata?.segmentId,
        segmentTitle: node.metadata?.segmentTitle,
        materialId: node.metadata?.materialId ?? options.materialId,
        source: node.metadata?.source ?? options.source ?? 'concept-parsing',
        userId: options.userId,
        parsedAt: now,
        tags: effectiveTags,
        canonicalName: finalName,
        aliases: override.aliases ?? [],
        originalName: node.name,
      });

      const difficultyLevel = Math.min(5, Math.max(1, Math.round(node.difficulty)));
      const basePayload = {
        name: finalName,
        description: node.description ?? existing?.description ?? '',
        concept_type: normalizeConceptType(node.type),
        difficulty_level: difficultyLevel,
        tags: JSON.stringify(effectiveTags),
        metadata: metadataPayload,
        updated_at: now,
      };

      const payload =
        existing && action === 'overwrite' ? applyFieldToggles(basePayload, existing, toggles) : basePayload;

      if (existing && action === 'overwrite') {
        await db.updateTable('concepts').set(payload).where('id', '=', existing.id).execute();
        updatedConcepts += 1;
      } else {
        await db
          .insertInto('concepts')
          .values({
            id: conceptId,
            ...payload,
            mastery_level: 0,
            review_count: 0,
            parent_concept_id: undefined,
            created_at: now,
          })
          .execute();
        insertedConcepts += 1;
      }

      const updatedRow: ConceptRow = existing
        ? { ...existing, ...payload, id: existing.id }
        : {
          id: conceptId,
          name: payload.name,
          description: payload.description,
          concept_type: payload.concept_type,
          difficulty_level: payload.difficulty_level,
          mastery_level: 0,
          tags: payload.tags,
          metadata: payload.metadata,
          review_count: 0,
          parent_concept_id: undefined,
          last_reviewed: undefined,
          created_at: now,
          updated_at: now,
        };

      existingByCanonical.set(canonicalizeName(updatedRow.name), updatedRow);
      existingById.set(updatedRow.id, updatedRow);

      nodeIdMapping.set(node.id, updatedRow.id);
      nameById.set(updatedRow.id, updatedRow.name);
      if (node.id) {
        nameById.set(node.id, updatedRow.name);
      }
    }

    let insertedRelationships = 0;
    let skippedRelationships = 0;
    for (const relationship of result.relationships) {
      const sourceConceptId = nodeIdMapping.get(relationship.sourceId);
      const targetConceptId = nodeIdMapping.get(relationship.targetId);
      if (!sourceConceptId || !targetConceptId) {
        skippedRelationships += 1;
        continue;
      }
      if (sourceConceptId === targetConceptId) {
        skippedRelationships += 1;
        continue;
      }

      const relType = normalizeRelationshipType(relationship.type);
      const metadataPayload = JSON.stringify({
        source: options.source ?? 'concept-parsing',
        userId: options.userId,
        parsedAt: now,
        sourceName: nameById.get(relationship.sourceId) ?? nameById.get(sourceConceptId),
        targetName: nameById.get(relationship.targetId) ?? nameById.get(targetConceptId),
      });

      const existingRelation = await db
        .selectFrom('relationships')
        .selectAll()
        .where('source_concept_id', '=', sourceConceptId)
        .where('target_concept_id', '=', targetConceptId)
        .where('relationship_type', '=', relType)
        .executeTakeFirst();

      if (existingRelation) {
        await db
          .updateTable('relationships')
          .set({
            description: relationship.description ?? existingRelation.description,
            strength: clampStrength(relationship.strength),
            metadata: metadataPayload,
            updated_at: now,
          })
          .where('id', '=', existingRelation.id)
          .execute();
      } else {
        await db
          .insertInto('relationships')
          .values({
            id: randomUUID(),
            source_concept_id: sourceConceptId,
            target_concept_id: targetConceptId,
            relationship_type: relType,
            strength: clampStrength(relationship.strength),
            description: relationship.description,
            metadata: metadataPayload,
            created_at: now,
            updated_at: now,
            created_by_session: options.sessionId,
          })
          .execute();
        insertedRelationships += 1;
      }
    }

    serviceLogger.info('Ingested concept parsing result', {
      conceptsInserted: insertedConcepts,
      conceptsUpdated: updatedConcepts,
      conceptsSkipped: skippedConcepts,
      conceptsMerged: mergedConcepts,
      relationshipsInserted: insertedRelationships,
      relationshipsSkipped: skippedRelationships,
      lowConfidenceSkipped,
    });

    return {
      conceptsInserted: insertedConcepts,
      conceptsUpdated: updatedConcepts,
      relationshipsInserted: insertedRelationships,
      conceptsSkipped: skippedConcepts,
      conceptsMerged: mergedConcepts,
      relationshipsSkipped: skippedRelationships,
      lowConfidenceSkipped,
      metadata: {
        processedAt: now,
        source: options.source,
      },
    };
  };

  const searchKnowledge = async ({
    query = '',
    tags = [],
    limit = 20,
  }: SearchParams): Promise<KnowledgeSearchResultDisplay> => {
    const trimmed = String(query ?? '').trim();
    const startTime = Date.now();
    let builder = db.selectFrom('concepts').selectAll();

    if (trimmed) {
      const term = `%${trimmed}%`;
      builder = builder.where((eb) =>
        eb.or([
          eb('name', 'like', term),
          eb('description', 'like', term),
          eb('metadata', 'like', term),
        ]),
      );
    }

    if (tags.length) {
      tags.forEach((tag) => {
        builder = builder.where('tags', 'like', `%${tag}%`);
      });
    }

    const rows = await builder.orderBy('updated_at', 'desc').limit(limit).execute();
    const nodes = rows.map(mapConceptRowToDisplay);
    const results = nodes.map(mapNodeToSearchResult);
    const filters = buildFilters(results);
    const searchTime = `${Date.now() - startTime}ms`;
    const suggestions = results.slice(0, 3).map((result) => result.title);

    return {
      query: trimmed,
      results,
      totalResults: results.length,
      searchTime,
      suggestions,
      filters,
    };
  };

  const exploreConcept = async ({
    conceptName,
    depth = 'intermediate',
  }: {
    conceptName: string;
    depth?: 'basic' | 'intermediate' | 'advanced';
  }): Promise<ConceptExplorationDisplay> => {
    const trimmedName = conceptName.trim();
    if (!trimmedName) {
      throw new Error('conceptName is required');
    }

    const conceptRow = await selectConceptByName(db, trimmedName);
    if (!conceptRow) {
      throw new Error(`Concept "${conceptName}" not found`);
    }

    const levelMap: Record<'basic' | 'intermediate' | 'advanced', number> = {
      basic: 0,
      intermediate: 1,
      advanced: 2,
    };
    const graph = await getKnowledgeGraph(db, conceptRow.id, levelMap[depth ?? 'intermediate']);
    const node = mapConceptRowToDisplay(conceptRow);
    const relatedConcepts = graph.relationships
      .map((relationship) => {
        const otherId =
          relationship.sourceId === node.id ? relationship.targetId : relationship.sourceId;
        const otherName =
          relationship.sourceId === node.id
            ? relationship.metadata?.targetName
            : relationship.metadata?.sourceName;
        const relation: RelatedConcept['relationship'] =
          relationship.relationshipType === 'prerequisite'
            ? 'foundation'
            : relationship.relationshipType === 'contains'
              ? 'foundation'
              : relationship.relationshipType === 'application'
                ? 'application'
                : relationship.relationshipType === 'example'
                  ? 'type'
                  : 'related';

        return {
          id: otherId,
          name: otherName ?? otherId,
          relationship: relation,
          strength: relationship.strength,
          description: relationship.description ?? '',
          difficulty: difficultyLabelFromLevel(
            graph.nodes.find((n) => n.id === otherId)?.difficultyLevel ?? 3,
          ),
        };
      })
      .filter(Boolean) as RelatedConcept[];

    const prerequisites = relatedConcepts
      .filter((concept) => concept.relationship === 'foundation')
      .map((concept) => concept.name);
    const examples = node.metadata?.examples
      ? Array.isArray(node.metadata.examples)
        ? node.metadata.examples.map(String)
        : [String(node.metadata.examples)]
      : [];

    const exploration: ConceptExplorationDisplay = {
      concept: {
        id: node.id,
        name: node.name,
        category: String(node.metadata.category ?? 'concept'),
      },
      definition: node.description ?? `Overview of ${node.name}`,
      keyPoints: node.tags.slice(0, 4),
      relatedConcepts: relatedConcepts.slice(0, 5),
      examples,
      difficulty: difficultyLabelFromLevel(node.difficultyLevel),
      estimatedLearningTime: `${Math.max(10, node.difficultyLevel * 5)} minutes`,
      visualAids: Array.isArray(node.metadata?.visuals)
        ? node.metadata.visuals.map(String)
        : node.metadata?.visuals
          ? [String(node.metadata.visuals)]
          : undefined,
      prerequisites,
      learningOutcomes:
        Array.isArray(node.metadata?.learningOutcomes) && node.metadata.learningOutcomes.length
          ? node.metadata.learningOutcomes.map(String)
          : [`Learn why ${node.name} matters in context`],
    };

    return exploration;
  };

  const getRelatedConcepts = async (conceptId: string): Promise<RelatedConceptsDisplay> => {
    const concept = await selectConceptById(db, conceptId);
    if (!concept) {
      throw new Error(`Concept ${conceptId} not found`);
    }

    const relationships = await db
      .selectFrom('relationships')
      .selectAll()
      .where((eb) =>
        eb.or([eb('source_concept_id', '=', conceptId), eb('target_concept_id', '=', conceptId)]),
      )
      .execute();

    if (!relationships.length) {
      return {
        conceptId,
        relatedConcepts: [],
        totalConnections: 0,
        strongestConnection: '',
        categories: [],
        learningPaths: [],
      };
    }

    const neighborIds = Array.from(
      new Set(relationships.flatMap((rel) => [rel.source_concept_id, rel.target_concept_id])),
    ).filter((id) => id !== conceptId);

    const neighborRows = neighborIds.length
      ? await db
        .selectFrom('concepts')
        .select(['id', 'name', 'metadata'])
        .where('id', 'in', neighborIds)
        .execute()
      : [];
    const neighborMap = new Map(neighborRows.map((row) => [row.id, row.name]));

    const relatedConcepts = relationships.map((rel) => {
      const direction = rel.source_concept_id === conceptId ? 'source' : 'target';
      const otherId = direction === 'source' ? rel.target_concept_id : rel.source_concept_id;
      return {
        id: otherId,
        name: neighborMap.get(otherId) ?? otherId,
        relationship: ['foundation', 'related', 'type', 'application'].includes(
          rel.relationship_type,
        )
          ? (rel.relationship_type as RelatedConcept['relationship'])
          : 'related',
        strength: rel.strength,
        description: rel.description ?? '',
      };
    });

    relatedConcepts.sort((a, b) => b.strength - a.strength);

    const categories = Array.from(new Set(relatedConcepts.map((concept) => concept.relationship)));

    return {
      conceptId,
      relatedConcepts,
      totalConnections: relatedConcepts.length,
      strongestConnection: relatedConcepts[0]?.name ?? '',
      categories,
      learningPaths: relatedConcepts.length
        ? [
          {
            path: relatedConcepts.slice(0, 3).map((concept) => concept.name),
            difficulty: 'intermediate',
            estimatedTime: '15 minutes',
          },
        ]
        : [],
    };
  };

  const getKnowledgeMap = async (sessionId?: string): Promise<KnowledgeMapDisplay> => {
    const rows = await db
      .selectFrom('concepts')
      .selectAll()
      .orderBy('updated_at', 'desc')
      .limit(40)
      .execute();

    if (!rows.length) {
      return {
        nodes: [],
        edges: [],
        layout: 'force-directed',
        clusters: [],
        metadata: {
          totalNodes: 0,
          totalEdges: 0,
          centerConcepts: [],
          learningPaths: [],
        },
      };
    }

    const nodes = rows.map(mapConceptRowToDisplay);
    const positions = nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / nodes.length;
      const radius = 200;
      return {
        id: node.id,
        label: node.name,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        size: Math.max(16, node.difficultyLevel * 6),
        color: `#${Math.floor(100000 + ((index * 99999) % 899999)).toString(16)}`,
        category: String(node.metadata.category ?? node.type),
        difficulty: difficultyLabelFromLevel(node.difficultyLevel),
        mastery: node.masteryLevel,
      };
    });

    const nodeIds = nodes.map((node) => node.id);
    const edges = await db
      .selectFrom('relationships')
      .selectAll()
      .where('source_concept_id', 'in', nodeIds)
      .where('target_concept_id', 'in', nodeIds)
      .limit(80)
      .execute();

    const mappedEdges = edges.map((edge) => ({
      from: edge.source_concept_id,
      to: edge.target_concept_id,
      label: edge.relationship_type,
      strength: edge.strength,
      type: relationshipTypeToEdgeType(edge.relationship_type) as
        | 'foundation'
        | 'related'
        | 'prerequisite'
        | 'application',
    }));

    const clusters = Array.from(new Set(positions.map((node) => node.category)));
    const learningPaths = clusters.map((cluster) => ({
      name: `${cluster} Trail`,
      nodes: nodeIds.slice(0, 3),
      difficulty: 'intermediate',
    }));

    return {
      nodes: positions,
      edges: mappedEdges,
      layout: sessionId ? 'circular' : 'force-directed',
      clusters,
      metadata: {
        totalNodes: positions.length,
        totalEdges: mappedEdges.length,
        centerConcepts: positions.slice(0, 3).map((node) => node.id),
        learningPaths,
      },
    };
  };

  return {
    ingestConceptParsingResult,
    searchKnowledge,
    exploreConcept,
    getRelatedConcepts,
    getKnowledgeMap,
  };
};

export type KnowledgeService = ReturnType<typeof createKnowledgeService>;
