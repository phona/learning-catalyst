/**
 * Vector Database Module (Production Implementation)
 *
 * Provides vector storage and semantic search capabilities using Qdrant.
 */

import type { QdrantManager } from '@/main/qdrant-manager';

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

export const createVectorDatabase = (qdrantManager: QdrantManager): VectorDatabaseApi => {
  const addDocumentWithEmbedding = async (
    document: Omit<VectorDocument, 'embedding' | 'createdAt' | 'updatedAt'>,
    embedding: number[],
  ): Promise<void> => {
    const vectorDoc: VectorDocument = {
      ...document,
      embedding,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await qdrantManager.addKnowledgeItem(vectorDoc, null);
  };

  const addDocumentBatch = async (
    documents: Array<{
      doc: Omit<VectorDocument, 'embedding' | 'createdAt' | 'updatedAt'>;
      embedding: number[];
    }>,
  ): Promise<void> => {
    for (const { doc, embedding } of documents) {
      await addDocumentWithEmbedding(doc, embedding);
    }
  };

  const search = async (
    query: string,
    options: VectorSearchOptions = {},
  ): Promise<SearchResult[]> => {
    const limit = options.limit ?? 10;
    const threshold = options.threshold ?? 0.6;

    const rawResults: unknown = await qdrantManager.searchKnowledge(query, null, limit);
    const filtered = Array.isArray(rawResults) ? rawResults.filter(isSearchItem) : [];
    return filtered
      .filter((r) => r.similarity >= threshold)
      .slice(0, limit)
      .map((r) => {
        const item = r.item as VectorDocument;
        return {
          document: item,
          score: r.similarity,
          metadata: item?.metadata,
        };
      });
  };

  const deleteDocument = async (documentId: string): Promise<void> => {
    await qdrantManager.deleteKnowledgeItem(documentId);
  };

  const getStats = async (): Promise<{ totalDocuments: number }> => {
    const collectionsUnknown: unknown = await qdrantManager.listCollections();
    const collections = Array.isArray(collectionsUnknown)
      ? collectionsUnknown.filter(isCollection)
      : [];
    const kc = collections.find((c) => c.name === 'knowledge_items');
    const points = kc && typeof kc.points_count === 'number' ? kc.points_count : 0;
    return { totalDocuments: points ?? 0 };
  };

  const start = async (): Promise<void> => {
    await qdrantManager.initialize();
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
