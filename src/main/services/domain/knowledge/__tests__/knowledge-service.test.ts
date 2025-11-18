import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createKnowledgeService } from '../knowledge-service';
import { createKyselyTestDb } from '@/test/utils/kysely-test-db';
import type { ConceptParsingResult } from '@/shared/types/electron-api/knowledge-api';

const createLoggerService = () => ({
  child: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
});

const buildParsingResult = (): ConceptParsingResult => ({
  success: true,
  concepts: [
    {
      id: 'concept-alpha',
      name: 'Concept Alpha',
      description: 'First idea',
      type: 'topic',
      confidence: 0.8,
      difficulty: 3,
      evidence: [
        { type: 'segment', text: 'Alpha content', relevance: 0.9 }
      ],
      metadata: { segmentId: 'seg-alpha' }
    },
    {
      id: 'concept-beta',
      name: 'Concept Beta',
      description: 'Second idea',
      type: 'skill',
      confidence: 0.75,
      difficulty: 4,
      evidence: [
        { type: 'segment', text: 'Beta content', relevance: 0.8 }
      ],
      metadata: { segmentId: 'seg-beta' }
    }
  ],
  relationships: [
    {
      sourceId: 'concept-alpha',
      targetId: 'concept-beta',
      type: 'prerequisite',
      strength: 0.85,
      confidence: 0.75,
      description: 'Alpha precedes Beta'
    }
  ],
  statistics: {
    totalConcepts: 2,
    validConcepts: 2,
    totalRelationships: 1,
    confidenceDistribution: { '0.8': 1, '0.7': 1 },
    difficultyDistribution: { 3: 1, 4: 1 },
    typeDistribution: { topic: 1, skill: 1 },
    processingTime: 10,
    modelUsage: { 'concept.parsing': 1 }
  },
  errors: [],
  metadata: {
    processingTime: 10,
    processedAt: new Date().toISOString(),
    inputFiles: 1
  }
});

describe('concept graph knowledge service', () => {
  let testDb: Awaited<ReturnType<typeof createKyselyTestDb>>;
  let service: ReturnType<typeof createKnowledgeService>;

  beforeEach(async () => {
    testDb = await createKyselyTestDb();
    service = createKnowledgeService({
      db: testDb.db,
      loggerService: createLoggerService()
    });
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it('ingests parsed concepts and relationships', async () => {
    const result = buildParsingResult();
    const ingestion = await service.ingestConceptParsingResult(result, { userId: 'tester' });
    expect(ingestion.conceptsInserted).toBe(2);
    const search = await service.searchKnowledge({ query: 'Alpha' });
    expect(search.results.some((node) => node.title === 'Concept Alpha')).toBe(true);
    expect(search.results.some((node) => node.tags.includes('alpha'))).toBe(true);
  });

  it('explores a concept using stored relationships', async () => {
    const result = buildParsingResult();
    await service.ingestConceptParsingResult(result);
    const exploration = await service.exploreConcept({ conceptName: 'Concept Alpha', depth: 'basic' });
    expect(exploration.relatedConcepts.some((rel) => rel.name === 'Concept Beta')).toBe(true);
    expect(exploration.concept.name).toBe('Concept Alpha');
  });

  it('persists normalized tags and metadata for concepts and relationships', async () => {
    await service.ingestConceptParsingResult(buildParsingResult());

    const alphaRow = await testDb.db
      .selectFrom('concepts')
      .selectAll()
      .where('name', '=', 'Concept Alpha')
      .executeTakeFirst();
    expect(alphaRow).toBeDefined();
    const alphaTags = JSON.parse(alphaRow!.tags) as string[];
    expect(alphaTags).toContain('alpha');

    const alphaMetadata = JSON.parse(alphaRow!.metadata) as Record<string, unknown>;
    expect(alphaMetadata.segmentId).toBe('seg-alpha');
    expect(Array.isArray(alphaMetadata.tags)).toBe(true);
    expect((alphaMetadata.tags as string[]).includes('alpha')).toBe(true);
    expect(alphaMetadata.source).toBe('concept-parsing');

    const betaRow = await testDb.db
      .selectFrom('concepts')
      .selectAll()
      .where('name', '=', 'Concept Beta')
      .executeTakeFirst();
    expect(betaRow).toBeDefined();

    const relationshipRow = await testDb.db
      .selectFrom('relationships')
      .selectAll()
      .where('source_concept_id', '=', alphaRow!.id)
      .where('target_concept_id', '=', betaRow!.id)
      .executeTakeFirst();
    expect(relationshipRow).toBeDefined();

    const relationshipMetadata = JSON.parse(relationshipRow!.metadata) as Record<string, unknown>;
    expect(relationshipMetadata.sourceName).toBe('Concept Alpha');
    expect(relationshipMetadata.targetName).toBe('Concept Beta');
    expect(relationshipMetadata.source).toBe('concept-parsing');
  });
});
