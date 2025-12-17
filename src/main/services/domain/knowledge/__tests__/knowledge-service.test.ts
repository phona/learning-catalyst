import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createKnowledgeService } from '../knowledge-service';
import type { ConceptParsingResult } from '@/shared/types/electron-api/knowledge-api';

// Mock database following DI pattern (like find-related-by-prompt.test.ts)
const createMockDatabase = () => {
  const createQueryBuilder = (executeMock: any) => {
    // Create mock functions first
    const selectAll = vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation((column: string, operator: string, value: any) => {
        if (operator === 'in' && Array.isArray(value)) {
          return {
            execute: vi.fn().mockResolvedValue(executeMock),
          };
        }
        return queryBuilder;
      }),
    });

    const execute = vi.fn().mockResolvedValue(executeMock);
    const executeTakeFirst = vi.fn().mockResolvedValue(executeMock[0] || null);

    const where = vi.fn().mockImplementation((column: string, operator: string, value: any) => {
      if (operator === 'in' && Array.isArray(value)) {
        return {
          execute: vi.fn().mockResolvedValue(executeMock),
        };
      }
      return queryBuilder;
    });

    // Create queryBuilder object with the mock functions
    const queryBuilder = {
      selectAll,
      where,
      execute,
      executeTakeFirst,
    };

    return queryBuilder;
  };

  return {
    selectFrom: vi.fn().mockImplementation(() => createQueryBuilder([])),
    insertInto: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    updateTable: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    }),
    deleteFrom: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  };
};

const createLoggerService = () => {
  const createLogger = () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: createLogger,
  });

  return {
    child: (meta: Record<string, unknown>) => createLogger(),
  };
};

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
      evidence: [{ type: 'segment', text: 'Alpha content', relevance: 0.9 }],
      metadata: { segmentId: 'seg-alpha' },
    },
    {
      id: 'concept-beta',
      name: 'Concept Beta',
      description: 'Second idea',
      type: 'skill',
      confidence: 0.75,
      difficulty: 4,
      evidence: [{ type: 'segment', text: 'Beta content', relevance: 0.8 }],
      metadata: { segmentId: 'seg-beta' },
    },
  ],
  relationships: [
    {
      sourceId: 'concept-alpha',
      targetId: 'concept-beta',
      type: 'prerequisite',
      strength: 0.85,
      confidence: 0.75,
      description: 'Alpha precedes Beta',
    },
  ],
  statistics: {
    totalConcepts: 2,
    validConcepts: 2,
    totalRelationships: 1,
    confidenceDistribution: { '0.8': 1, '0.7': 1 },
    difficultyDistribution: { 3: 1, 4: 1 },
    typeDistribution: { topic: 1, skill: 1 },
    processingTime: 10,
    modelUsage: { 'concept.parsing': 1 },
  },
  errors: [],
  metadata: {
    processingTime: 10,
    processedAt: new Date().toISOString(),
    inputFiles: 1,
  },
});

describe('concept graph knowledge service', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let service: ReturnType<typeof createKnowledgeService>;
  let databaseTables: { [tableName: string]: any[] } = {};

  beforeEach(() => {
    // Reset tables for each test
    databaseTables = {
      concepts: [],
      relationships: [],
    };

    const vectorDatabase = {
      addDocument: vi.fn(),
      addDocumentWithEmbedding: vi.fn(),
      addDocumentBatch: vi.fn(),
      search: vi.fn(),
      deleteDocument: vi.fn(),
      getStats: vi.fn(),
      start: vi.fn(),
    };
    const providerFactory = {
      getModel: vi.fn(),
      setModel: vi.fn(),
      getEmbeddings: vi.fn(),
      getEmbeddingModel: vi.fn(),
      getRerankModel: vi.fn(),
    };

    // Create stateful mock database with table support
    mockDb = {
      selectFrom: vi.fn().mockImplementation((tableName: string) => {
        const tableData = databaseTables[tableName] || [];
        const createQueryBuilder = (data: any[] = tableData) => ({
          selectAll: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation((column: string, operator: string, value: any) => {
              if (operator === 'in' && Array.isArray(value)) {
                return createQueryBuilder(data);
              }
              if (operator === '=' && typeof value === 'string') {
                const filtered = data.filter(c => c[column] === value);
                return {
                  ...createQueryBuilder(filtered),
                  execute: vi.fn().mockResolvedValue(filtered),
                  executeTakeFirst: vi.fn().mockResolvedValue(filtered[0] || undefined),
                };
              }
              return createQueryBuilder(data);
            }),
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                execute: vi.fn().mockResolvedValue(data),
              }),
            }),
            execute: vi.fn().mockResolvedValue(data),
            executeTakeFirst: vi.fn().mockResolvedValue(data[0] || undefined),
          }),
          where: vi.fn().mockImplementation((column: string, operator: string, value: any) => {
            if (operator === 'in' && Array.isArray(value)) {
              return createQueryBuilder(data);
            }
            if (operator === '=' && typeof value === 'string') {
              const filtered = data.filter(c => c[column] === value);
              return {
                ...createQueryBuilder(filtered),
                execute: vi.fn().mockResolvedValue(filtered),
                executeTakeFirst: vi.fn().mockResolvedValue(filtered[0] || undefined),
              };
            }
            return createQueryBuilder(data);
          }),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              execute: vi.fn().mockResolvedValue(data),
            }),
          }),
          execute: vi.fn().mockResolvedValue(data),
          executeTakeFirst: vi.fn().mockResolvedValue(data[0] || undefined),
        });

        return createQueryBuilder();
      }),
      insertInto: vi.fn().mockImplementation((tableName: string) => ({
        values: vi.fn().mockImplementation((values: any) => ({
          execute: vi.fn().mockImplementation(() => {
            if (!databaseTables[tableName]) {
              databaseTables[tableName] = [];
            }
            if (Array.isArray(values)) {
              databaseTables[tableName].push(...values);
            } else {
              databaseTables[tableName].push(values);
            }
            return Promise.resolve();
          }),
        })),
      })),
      updateTable: vi.fn().mockImplementation((tableName: string) => ({
        set: vi.fn().mockImplementation((updates: any) => ({
          where: vi.fn().mockImplementation((column: string, operator: string, value: any) => ({
            execute: vi.fn().mockImplementation(() => {
              const tableData = databaseTables[tableName] || [];
              const index = tableData.findIndex(c => c[column] === value);
              if (index !== -1) {
                tableData[index] = { ...tableData[index], ...updates };
              }
              return Promise.resolve();
            }),
          })),
        })),
      })),
      deleteFrom: vi.fn().mockImplementation((tableName: string) => ({
        where: vi.fn().mockImplementation((column: string, operator: string, value: any) => ({
          execute: vi.fn().mockImplementation(() => {
            const tableData = databaseTables[tableName] || [];
            const index = tableData.findIndex(c => c[column] === value);
            if (index !== -1) {
              tableData.splice(index, 1);
            }
            return Promise.resolve();
          }),
        })),
      })),
    };

    service = createKnowledgeService({
      db: mockDb,
      vectorDatabase,
      providerFactory,
      loggerService: createLoggerService(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
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
    const exploration = await service.exploreConcept({
      conceptName: 'Concept Alpha',
      depth: 'basic',
    });
    expect(exploration.relatedConcepts.some((rel) => rel.name === 'Concept Beta')).toBe(true);
    expect(exploration.concept.name).toBe('Concept Alpha');
  });

  it('persists normalized tags and metadata for concepts and relationships', async () => {
    await service.ingestConceptParsingResult(buildParsingResult());

    const alphaRow = await mockDb
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

    const betaRow = await mockDb
      .selectFrom('concepts')
      .selectAll()
      .where('name', '=', 'Concept Beta')
      .executeTakeFirst();
    expect(betaRow).toBeDefined();

    const relationshipRow = await mockDb
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

  it('honors field toggles when overwriting existing concepts', async () => {
    await service.ingestConceptParsingResult(buildParsingResult());

    const updated = buildParsingResult();
    updated.concepts = updated.concepts.map((concept) =>
      concept.id === 'concept-alpha'
        ? { ...concept, description: 'New Alpha Description', difficulty: 5 }
        : concept,
    );

    const ingestion = await service.ingestConceptParsingResult(updated, {}, {
      actions: { 'concept-alpha': 'overwrite', 'concept-beta': 'overwrite' },
      fieldToggles: { 'concept-alpha': { description: false } },
    });

    expect(ingestion.conceptsUpdated).toBeGreaterThan(0);
    const alphaRow = await mockDb
      .selectFrom('concepts')
      .selectAll()
      .where('name', '=', 'Concept Alpha')
      .executeTakeFirst();
    expect(alphaRow?.description).toBe('First idea');
    expect(alphaRow?.difficulty_level).toBe(5);
  });

  it('skips low-confidence concepts and prunes orphan relationships', async () => {
    const result = buildParsingResult();
    result.concepts.push({
      id: 'concept-low',
      name: 'Low Confidence Concept',
      description: 'Should be skipped',
      type: 'fact',
      confidence: 0.3,
      difficulty: 2,
      evidence: [{ type: 'segment', text: 'low', relevance: 0.2 }],
      metadata: {},
    });
    result.relationships.push({
      sourceId: 'concept-low',
      targetId: 'concept-alpha',
      type: 'related',
      strength: 0.4,
      confidence: 0.3,
      description: 'low -> alpha',
    });

    const ingestion = await service.ingestConceptParsingResult(result, {}, {
      lowConfidence: { defaultThreshold: 0.5 },
    });

    expect(ingestion.conceptsInserted).toBe(2);
    expect(ingestion.conceptsSkipped).toBe(1);
    expect(ingestion.lowConfidenceSkipped).toBe(1);
    const lowRow = await mockDb
      .selectFrom('concepts')
      .selectAll()
      .where('name', '=', 'Low Confidence Concept')
      .executeTakeFirst();
    expect(lowRow).toBeUndefined();

    const relationships = await mockDb.selectFrom('relationships').selectAll().execute();
    expect(relationships.length).toBe(1);
  });
});
