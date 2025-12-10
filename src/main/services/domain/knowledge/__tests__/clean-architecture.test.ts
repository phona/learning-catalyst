/**
 * Clean Architecture Test Suite
 *
 * Verifies the single source of truth pattern:
 * - SQLite: Full concept data (source of truth)
 * - Qdrant: Vector + conceptId (search index only)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createKnowledgeService } from '../knowledge-service';
import type { Kysely } from 'kysely';

describe('clean architecture: SQLite + Qdrant separation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Qdrant stores only conceptId reference, not full concept data', async () => {
    const capturedDocs: Array<{
      id: string;
      content: string;
      metadata: Record<string, any>;
    }> = [];

    const vectorDatabase = {
      addDocumentWithEmbedding: vi.fn(async (doc: any) => {
        capturedDocs.push({
          id: doc.id,
          content: doc.content,
          metadata: doc.metadata,
        });
      }),
      search: vi.fn().mockResolvedValue([]),
      addDocumentBatch: vi.fn(),
      deleteDocument: vi.fn(),
      getStats: vi.fn(),
      start: vi.fn(),
    };

    const providerFactory = {
      getEmbeddingModel: vi.fn().mockResolvedValue({
        embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      }),
    };

    const loggerService: any = {
      child: () => ({
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }),
    };

    const mockDb = {
      insertInto: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue({ id: 'concept-123' }),
          }),
        }),
      }),
      selectFrom: vi.fn().mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              execute: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    } as any;

    const svc = createKnowledgeService({
      db: mockDb,
      vectorDatabase,
      providerFactory,
      loggerService,
    });

    // Parse materials that will create concepts and store them
    const mockParseResult = {
      success: true,
      concepts: [
        {
          id: 'concept-123',
          name: 'React',
          description: 'A JavaScript library for building UIs',
          type: 'concept',
          difficulty: 'intermediate',
          confidence: 0.9,
          tags: ['javascript', 'frontend'],
          sourceMaterialId: 'material-1',
        },
      ],
      relationships: [],
      errors: [],
    };

    // Manually call the parsing service to trigger vector storage
    await svc.ingestConceptParsingResult(mockParseResult, 'material-1');

    // Verify the stored document in Qdrant
    expect(capturedDocs.length).toBe(1);

    const storedDoc = capturedDocs[0];

    // ✓ Qdrant should have conceptId reference
    expect(storedDoc.metadata.conceptId).toBe('concept-123');

    // ✓ Qdrant should NOT store full concept data (name, description, etc.)
    expect(storedDoc.metadata.name).toBeUndefined();
    expect(storedDoc.metadata.description).toBeUndefined();
    expect(storedDoc.metadata.type).toBeUndefined();

    // ✓ Qdrant should store only minimal metadata for search
    expect(storedDoc.metadata).toEqual({
      conceptId: 'concept-123',
      type: 'concept',
    });
  });

  it('semanticSearch queries Qdrant then fetches full data from SQLite', async () => {
    const qdrantResults = [
      {
        document: {
          id: 'concept:abc-123',
          content: 'React name description',
          metadata: {
            conceptId: 'abc-123',
            type: 'concept',
          },
        },
        score: 0.95,
      },
      {
        document: {
          id: 'concept:def-456',
          content: 'JavaScript name description',
          metadata: {
            conceptId: 'def-456',
            type: 'concept',
          },
        },
        score: 0.87,
      },
    ];

    const vectorDatabase = {
      search: vi.fn().mockResolvedValue(qdrantResults),
      addDocumentWithEmbedding: vi.fn(),
      addDocumentBatch: vi.fn(),
      deleteDocument: vi.fn(),
      getStats: vi.fn(),
      start: vi.fn(),
    };

    const mockDb = {
      selectFrom: vi.fn().mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              execute: vi.fn().mockResolvedValue([
                {
                  id: 'abc-123',
                  name: 'React',
                  description: 'A JavaScript library for building UIs',
                  type: 'concept',
                  difficulty: 'intermediate',
                  confidence: 0.9,
                  tags: ['javascript', 'frontend'],
                },
                {
                  id: 'def-456',
                  name: 'JavaScript',
                  description: 'A programming language',
                  type: 'concept',
                  difficulty: 'beginner',
                  confidence: 0.95,
                  tags: ['programming'],
                },
              ]),
            }),
          }),
        }),
      }),
    } as any;

    const providerFactory = {
      getEmbeddingModel: vi.fn().mockResolvedValue({
        embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      }),
    };

    const loggerService: any = {
      child: () => ({
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }),
    };

    const svc = createKnowledgeService({
      db: mockDb,
      vectorDatabase,
      providerFactory,
      loggerService,
    });

    // Call semanticSearch
    const results = await svc.semanticSearch('React and JavaScript', 10);

    // ✓ First, Qdrant was searched for similar vectors
    expect(vectorDatabase.search).toHaveBeenCalledWith(
      'React and JavaScript',
      expect.objectContaining({
        limit: 10,
        threshold: 0.7,
      })
    );

    // ✓ Then, SQLite was queried for full concept data
    expect(mockDb.selectFrom).toHaveBeenCalledWith('concepts');
    expect(mockDb.execute).toHaveBeenCalled();

    // ✓ Results include full concept data from SQLite
    expect(results).toHaveLength(2);
    expect(results[0].concept).toEqual(
      expect.objectContaining({
        id: 'abc-123',
        name: 'React',
        description: 'A JavaScript library for building UIs',
      })
    );

    // ✓ Results maintain Qdrant relevance score
    expect(results[0].relevanceScore).toBe(0.95);
    expect(results[1].relevanceScore).toBe(0.87);
  });

  it('Qdrant IDs use concept: prefix pattern', async () => {
    const capturedDocs: Array<{
      id: string;
      metadata: Record<string, any>;
    }> = [];

    const vectorDatabase = {
      addDocumentWithEmbedding: vi.fn(async (doc: any) => {
        capturedDocs.push({
          id: doc.id,
          metadata: doc.metadata,
        });
      }),
      search: vi.fn().mockResolvedValue([]),
      addDocumentBatch: vi.fn(),
      deleteDocument: vi.fn(),
      getStats: vi.fn(),
      start: vi.fn(),
    };

    const mockDb = {
      insertInto: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      executeTakeFirst: vi.fn().mockResolvedValue({ id: 'concept-789' }),
    } as any;

    const providerFactory = {
      getEmbeddingModel: vi.fn().mockResolvedValue({
        embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      }),
    };

    const loggerService: any = {
      child: () => ({
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }),
    };

    const svc = createKnowledgeService({
      db: mockDb,
      vectorDatabase,
      providerFactory,
      loggerService,
    });

    const mockParseResult = {
      success: true,
      concepts: [
        {
          id: 'concept-789',
          name: 'TypeScript',
          description: 'Typed superset of JavaScript',
          type: 'concept',
          difficulty: 'intermediate',
          confidence: 0.9,
          tags: ['javascript', 'types'],
          sourceMaterialId: 'material-2',
        },
      ],
      relationships: [],
      errors: [],
    };

    await svc.ingestConceptParsingResult(mockParseResult, 'material-2');

    // ✓ Concept stored in Qdrant uses concept: prefix
    expect(capturedDocs[0].id).toBe('concept:concept-789');

    // ✓ Metadata includes conceptId for linking back to SQLite
    expect(capturedDocs[0].metadata.conceptId).toBe('concept-789');
  });

  it('No data duplication: concept data exists only in SQLite', async () => {
    const vectorDatabase = {
      addDocumentWithEmbedding: vi.fn(),
      search: vi.fn().mockResolvedValue([]),
      addDocumentBatch: vi.fn(),
      deleteDocument: vi.fn(),
      getStats: vi.fn(),
      start: vi.fn(),
    };

    const capturedQueries: any[] = [];

    const mockDb = {
      insertInto: vi.fn().mockImplementation((table) => {
        capturedQueries.push({ type: 'insert', table });
        return {
          values: vi.fn().mockImplementation((values) => {
            capturedQueries.push({ type: 'values', table, values });
            return {
              returning: vi.fn().mockImplementation((columns) => {
                capturedQueries.push({ type: 'returning', table, columns });
                return {
                  executeTakeFirst: vi.fn().mockResolvedValue({ id: 'concept-123' }),
                };
              }),
            };
          }),
        };
      }),
      selectFrom: vi.fn().mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              execute: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    } as any;

    const providerFactory = {
      getEmbeddingModel: vi.fn().mockResolvedValue({
        embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      }),
    };

    const loggerService: any = {
      child: () => ({
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }),
    };

    const svc = createKnowledgeService({
      db: mockDb,
      vectorDatabase,
      providerFactory,
      loggerService,
    });

    const mockParseResult = {
      success: true,
      concepts: [
        {
          id: 'concept-123',
          name: 'Python',
          description: 'A programming language',
          type: 'concept',
          difficulty: 'beginner',
          confidence: 0.95,
          tags: ['programming'],
          sourceMaterialId: 'material-3',
        },
      ],
      relationships: [],
      errors: [],
    };

    await svc.ingestConceptParsingResult(mockParseResult, 'material-3');

    // ✓ Full concept data is stored in SQLite
    const insertQuery = capturedQueries.find((q) => q.type === 'insert' && q.table === 'concepts');
    expect(insertQuery).toBeDefined();

    // ✓ Vector DB receives minimal data (conceptId reference only)
    const vectorCall = vectorDatabase.addDocumentWithEmbedding.mock.calls[0][0];
    expect(vectorCall.metadata.conceptId).toBe('concept-123');
    expect(vectorCall.metadata.name).toBeUndefined(); // No duplication!
    expect(vectorCall.metadata.description).toBeUndefined(); // No duplication!
  });

  it('Relationship storage uses relationshipId pattern', async () => {
    const capturedDocs: Array<{
      id: string;
      metadata: Record<string, any>;
    }> = [];

    const vectorDatabase = {
      addDocumentWithEmbedding: vi.fn(async (doc: any) => {
        capturedDocs.push({
          id: doc.id,
          metadata: doc.metadata,
        });
      }),
      search: vi.fn().mockResolvedValue([]),
      addDocumentBatch: vi.fn(),
      deleteDocument: vi.fn(),
      getStats: vi.fn(),
      start: vi.fn(),
    };

    const mockDb = {
      insertInto: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      executeTakeFirst: vi.fn().mockResolvedValue({ id: 'concept-123' }),
    } as any;

    const providerFactory = {
      getEmbeddingModel: vi.fn().mockResolvedValue({
        embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      }),
    };

    const loggerService: any = {
      child: () => ({
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }),
    };

    const svc = createKnowledgeService({
      db: mockDb,
      vectorDatabase,
      providerFactory,
      loggerService,
    });

    const mockParseResult = {
      success: true,
      concepts: [
        {
          id: 'concept-123',
          name: 'HTML',
          description: 'HyperText Markup Language',
          type: 'concept',
          difficulty: 'beginner',
          confidence: 0.9,
          tags: ['web'],
          sourceMaterialId: 'material-4',
        },
      ],
      relationships: [
        {
          id: 'rel-123-456',
          sourceId: 'concept-123',
          targetId: 'concept-456',
          type: 'prerequisite',
          strength: 0.9,
          confidence: 0.85,
          description: 'HTML is required for CSS',
        },
      ],
      errors: [],
    };

    await svc.ingestConceptParsingResult(mockParseResult, 'material-4');

    // Find the relationship document in Qdrant
    const relationshipDoc = capturedDocs.find((doc) => doc.id.startsWith('rel:'));

    // ✓ Relationship stored with proper ID pattern
    expect(relationshipDoc?.id).toBe('rel:concept-123:concept-456');

    // ✓ Metadata includes concept IDs for linking
    expect(relationshipDoc?.metadata.sourceConceptId).toBe('concept-123');
    expect(relationshipDoc?.metadata.targetConceptId).toBe('concept-456');
    expect(relationshipDoc?.metadata.relationshipId).toBe('concept-123:concept-456');

    // ✓ No duplication of relationship data
    expect(relationshipDoc?.metadata.sourceName).toBeUndefined();
    expect(relationshipDoc?.metadata.targetName).toBeUndefined();
  });
});
