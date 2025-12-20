/**
 * Vector Store Service - Core Database Layer
 *
 * Generic vector database operations using Qdrant.
 * Provides CRUD operations for vector collections without domain logic.
 */

import { QdrantClient } from '@qdrant/qdrant-js';
import { createHash } from 'node:crypto';
import type { ChildProcess } from 'node:child_process';

export interface VectorPoint {
  id: string | number;
  vector: number[];
  payload: Record<string, unknown>;
}

export interface VectorSearchResult {
  id: string | number;
  score: number;
  payload: Record<string, unknown>;
}

export interface VectorStore {
  // Collection Management
  createCollection(name: string, vectorSize: number, distance?: string): Promise<void>;
  deleteCollection(name: string): Promise<void>;
  listCollections(): Promise<Array<{
    name: string;
    vectors_count: number;
    points_count: number;
    status: string;
    optimizer_status: string;
  }>>;

  // Vector Operations
  upsert(collectionName: string, points: VectorPoint[]): Promise<void>;
  search(
    collectionName: string,
    queryVector: number[],
    options?: {
      limit?: number;
      scoreThreshold?: number;
      filter?: unknown;
    }
  ): Promise<VectorSearchResult[]>;
  getVectors(collectionName: string, ids: Array<string | number>): Promise<VectorPoint[]>;
  delete(collectionName: string, ids: Array<string | number>): Promise<void>;

  // Batch Operations
  clearCollection(collectionName: string): Promise<void>;
  scroll(
    collectionName: string,
    options?: {
      limit?: number;
      offset?: unknown;
      withPayload?: boolean;
      withVector?: boolean;
    }
  ): Promise<{
    points: VectorPoint[];
    nextPageOffset?: unknown;
  }>;
}

export function createVectorStore(
  qdrantProcess: {
    start(): Promise<void>;
  },
  config: {
    host?: string;
    port?: number;
  } = {}
): VectorStore {
  const clientConfig = {
    host: config.host || '127.0.0.1',
    port: config.port || 6333,
  };

  // Lazy-initialized client
  let client: QdrantClient | null = null;

  /**
   * Get or create Qdrant client
   */
  function getClient(): QdrantClient {
    if (!client) {
      client = new QdrantClient(clientConfig);
    }
    return client;
  }

  /**
   * Ensure client is ready
   */
  async function ensureReady(): Promise<void> {
    await qdrantProcess.start();
  }

  /**
   * Generate UUID v4 from string
   */
  function uuidFromString(s: string): string {
    const buf = createHash('sha256').update(String(s)).digest();
    const bytes = Buffer.from(buf.slice(0, 16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  /**
   * Normalize point ID to appropriate format
   */
  function normalizePointId(id: unknown): string | number {
    if (typeof id === 'number' && Number.isInteger(id) && id >= 0) {
      return id;
    }
    if (typeof id === 'string') {
      const v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (v4.test(id)) return id;
      return uuidFromString(id);
    }
    return uuidFromString(String(id));
  }

  /**
   * Create a new collection
   */
  async function createCollection(
    name: string,
    vectorSize: number,
    distance: string = 'Cosine'
  ): Promise<void> {
    await ensureReady();
    const payload = {
      vectors: {
        size: vectorSize,
        distance: distance as 'Cosine' | 'Euclid' | 'Dot' | 'Manhattan',
      },
    };
    await getClient().createCollection(name, payload);
  }

  /**
   * Delete a collection
   */
  async function deleteCollection(name: string): Promise<void> {
    await ensureReady();
    await getClient().deleteCollection(name);
  }

  /**
   * List all collections
   */
  async function listCollections(): Promise<Array<{
    name: string;
    vectors_count: number;
    points_count: number;
    status: string;
    optimizer_status: string;
  }>> {
    await ensureReady();
    const res = await getClient().getCollections();
    return res.collections.map((col: { name: string; vectors_count?: number; points_count?: number; status: string; optimizer_status?: { status?: string } }) => ({
      name: col.name,
      vectors_count: col.vectors_count || 0,
      points_count: col.points_count || 0,
      status: col.status,
      optimizer_status: col.optimizer_status?.status || 'unknown',
    }));
  }

  /**
   * Upsert vectors to collection
   */
  async function upsert(collectionName: string, points: VectorPoint[]): Promise<void> {
    await ensureReady();
    const normalized = points.map((p) => ({
      ...p,
      id: normalizePointId(p.id),
    }));
    const payload = { points: normalized };
    const maxAttempts = 3;
    let attempt = 0;
    let lastError: unknown = null;

    while (attempt < maxAttempts) {
      try {
        await getClient().upsert(collectionName, payload);
        return;
      } catch (error: unknown) {
        lastError = error;
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
      }
    }

    throw lastError;
  }

  /**
   * Search vectors in collection
   */
  async function search(
    collectionName: string,
    queryVector: number[],
    options: {
      limit?: number;
      scoreThreshold?: number;
      filter?: unknown;
    } = {}
  ): Promise<VectorSearchResult[]> {
    await ensureReady();
    const payload: unknown = {
      vector: queryVector,
      limit: options.limit || 10,
      score_threshold: options.scoreThreshold || 0.7,
      with_payload: true,
    };

    if (options.filter) {
      payload.filter = options.filter;
    }

    const result = await getClient().search(collectionName, payload);
    return result.map((r: unknown) => ({
      id: r.id,
      score: r.score,
      payload: r.payload,
    }));
  }

  /**
   * Get vectors by IDs
   */
  async function getVectors(
    collectionName: string,
    ids: Array<string | number>
  ): Promise<VectorPoint[]> {
    await ensureReady();
    const payload = {
      ids: ids.map((id) => normalizePointId(id)),
      with_payload: true,
      with_vector: true,
    };

    const result = await getClient().retrieve(collectionName, payload);
    return result.map((point: unknown) => ({
      id: point.id,
      vector: point.vector,
      payload: point.payload,
    }));
  }

  /**
   * Delete vectors by IDs
   */
  async function deleteVectors(
    collectionName: string,
    ids: Array<string | number>
  ): Promise<void> {
    await ensureReady();
    const payload = { points: ids.map((id) => normalizePointId(id)) };
    await getClient().delete(collectionName, payload);
  }

  /**
   * Clear all vectors from collection
   */
  async function clearCollection(collectionName: string): Promise<void> {
    await ensureReady();
    const batchSize = 1000;
    let offset: unknown = undefined;
    let done = false;

    while (!done) {
      const page = await getClient().scroll(collectionName, {
        limit: batchSize,
        with_payload: false,
        with_vector: false,
        offset,
      });
      const ids = page.points?.map((p: unknown) => p.id) ?? [];

      if (ids.length > 0) {
        await getClient().delete(collectionName, { points: ids });
      }

      if (!page.next_page_offset) {
        done = true;
      } else {
        offset = page.next_page_offset;
      }
    }
  }

  /**
   * Scroll through collection
   */
  async function scroll(
    collectionName: string,
    options: {
      limit?: number;
      offset?: unknown;
      withPayload?: boolean;
      withVector?: boolean;
    } = {}
  ): Promise<{
    points: VectorPoint[];
    nextPageOffset?: unknown;
  }> {
    await ensureReady();
    const page = await getClient().scroll(collectionName, {
      limit: options.limit || 1000,
      with_payload: options.withPayload !== false,
      with_vector: options.withVector || false,
      offset: options.offset,
    });

    return {
      points: page.points?.map((p: unknown) => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload,
      })) ?? [],
      nextPageOffset: page.next_page_offset,
    };
  }

  return {
    createCollection,
    deleteCollection,
    listCollections,
    upsert,
    search,
    getVectors,
    delete: deleteVectors,
    clearCollection,
    scroll,
  };
}
