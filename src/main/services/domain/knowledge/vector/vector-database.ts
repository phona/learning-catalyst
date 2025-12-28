/**
 * Vector Database Module (Production Implementation)
 *
 * Provides vector storage and semantic search capabilities using Qdrant.
 * This is an adapter that wraps the core vector-store service.
 */

import type { VectorStore } from '../../../core/database/vector-store';
import type { ProviderFactory } from '../../../agent/provider-factory';

// Pure separation: Qdrant stores vectors + conceptId, all other data in SQLite
const DEFAULT_SEARCH_THRESHOLD = 0.5;  // Lowered for pure separation architecture

export interface VectorDocument {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResult {
  document: VectorDocument;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface VectorSearchOptions {
  limit?: number;
  threshold?: number;
}

export interface VectorDatabaseApi {
  addDocumentWithEmbedding: (
    document: Omit<VectorDocument, 'embedding' | 'createdAt' | 'updatedAt'>,
    embedding: number[],
  ) => Promise<void>;
  addDocumentBatch: (
    documents: Array<{
      doc: Omit<VectorDocument, 'embedding' | 'createdAt' | 'updatedAt'>;
      embedding: number[];
    }>,
  ) => Promise<void>;
  search: (query: string, options?: VectorSearchOptions) => Promise<SearchResult[]>;
  deleteDocument: (documentId: string) => Promise<void>;
  getStats: () => Promise<{ totalDocuments: number }>;
  start: () => Promise<void>;
}

const isSearchItem = (value: unknown): value is { item: unknown; similarity: number } => {
  if (typeof value !== 'object' || value === null) return false;
  const rec = value as Record<string, unknown>;
  return typeof rec['similarity'] === 'number' && 'item' in rec;
};

const isCollection = (value: unknown): value is { name: unknown; points_count?: unknown } => {
  if (typeof value !== 'object' || value === null) return false;
  const rec = value as Record<string, unknown>;
  return 'name' in rec;
};

export const createVectorDatabase = (
  vectorStore: VectorStore,
  providerFactory: ProviderFactory
): VectorDatabaseApi => {
  const addDocumentWithEmbedding = async (
    document: Omit<VectorDocument, 'embedding' | 'createdAt' | 'updatedAt'>,
    embedding: number[],
  ): Promise<void> => {
    const now = new Date();
    const vectorDoc: VectorDocument = {
      ...document,
      embedding,
      createdAt: now,
      updatedAt: now,
    };

    // Convert to VectorPoint format for storage
    const point = {
      id: document.id,
      vector: embedding,
      payload: {
        content: document.content,
        metadata: {
          ...document.metadata,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      },
    };

    await vectorStore.upsert('knowledge_items', [point]);
  };

  const addDocumentBatch = async (
    documents: Array<{
      doc: Omit<VectorDocument, 'embedding' | 'createdAt' | 'updatedAt'>;
      embedding: number[];
    }>,
  ): Promise<void> => {
    const now = new Date();
    const points = documents.map(({ doc, embedding }) => ({
      id: doc.id,
      vector: embedding,
      payload: {
        content: doc.content,
        metadata: {
          ...doc.metadata,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      },
    }));

    await vectorStore.upsert('knowledge_items', points);
  };

  const search = async (
    query: string,
    options: VectorSearchOptions = {},
  ): Promise<SearchResult[]> => {
    const limit = options.limit ?? 10;
    const threshold = options.threshold ?? DEFAULT_SEARCH_THRESHOLD;

    console.log('[VectorDatabase] Search query:', query);
    console.log('[VectorDatabase] Limit:', limit, 'Threshold:', threshold);

    // Generate embedding using provider factory
    const embeddingModel = await providerFactory.getEmbeddingModel();
    console.log('[VectorDatabase] Embedding model dimensions:', embeddingModel.dimensions);

    const queryEmbedding = await embeddingModel.embed(query);
    console.log('[VectorDatabase] Generated embedding length:', queryEmbedding.length);

    console.log('[VectorDatabase] Searching Qdrant collection "knowledge_items"...');
    const rawResults = await vectorStore.search('knowledge_items', queryEmbedding, {
      limit,
      scoreThreshold: threshold,
    });

    console.log('[VectorDatabase] Qdrant returned', rawResults.length, 'results');

    return rawResults.map((result) => {
      const payload = result.payload as { content?: string; metadata?: Record<string, unknown> };
      const metadata = payload.metadata || {};
      const createdAtStr = metadata.createdAt as string | undefined;
      const updatedAtStr = metadata.updatedAt as string | undefined;
      const document: VectorDocument = {
        id: typeof result.id === 'string' ? result.id : String(result.id),
        content: payload.content || '',
        metadata,
        createdAt: new Date(createdAtStr || Date.now()),
        updatedAt: new Date(updatedAtStr || Date.now()),
      };

      return {
        document,
        score: result.score,
        metadata,
      };
    });
  };

  const deleteDocument = async (documentId: string): Promise<void> => {
    await vectorStore.delete('knowledge_items', [documentId]);
  };

  const getStats = async (): Promise<{ totalDocuments: number }> => {
    const collections = await vectorStore.listCollections();
    const kc = collections.find((c) => c.name === 'knowledge_items') as { name: string; points_count?: number } | undefined;
    const points = kc?.points_count || 0;
    return { totalDocuments: points };
  };

  const start = async (): Promise<void> => {
    // Ensure Qdrant collection exists with correct embedding dimensions
    const embeddingModel = await providerFactory.getEmbeddingModel();
    const expectedDimensions = embeddingModel.dimensions;
    if (expectedDimensions === undefined) {
      throw new Error('Embedding model dimensions are not configured');
    }

    const collections = await vectorStore.listCollections();
    const knowledgeCollection = collections.find((c) => c.name === 'knowledge_items');

    if (!knowledgeCollection) {
      console.log(`[VectorDatabase] Creating knowledge_items collection with ${expectedDimensions} dimensions`);
      await vectorStore.createCollection('knowledge_items', expectedDimensions, 'Cosine');
    }
  };

  return {
    addDocumentWithEmbedding,
    addDocumentBatch,
    search,
    deleteDocument,
    getStats,
    start,
  };
};

export type VectorDatabase = VectorDatabaseApi;
