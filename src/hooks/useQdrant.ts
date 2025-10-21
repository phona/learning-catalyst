/**
 * Qdrant Hook
 *
 * 🎯 What It Is:
 * React hook for interacting with Qdrant vector database through Electron IPC.
 * Provides a convenient interface for knowledge operations and vector search.
 *
 * ⚙️ How It Works:
 * - Wraps Electron IPC calls in React-friendly async functions
 * - Provides state management for loading and error handling
 * - Offers methods for knowledge CRUD operations
 * - Handles semantic search and context retrieval
 * - Manages collection operations
 *
 * 🔗 Relationships:
 * - Used by components for knowledge management features
 * - Communicates with main process through preload API
 * - Integrates with AI services for embedding generation
 */

import { useState, useCallback, useEffect } from 'react';
import { AIProvider } from '../types/ai';

export interface KnowledgeItem {
  id: string;
  content: string;
  type: 'concept' | 'conversation' | 'resource' | 'question' | 'answer';
  metadata: {
    sessionId?: string;
    userId?: string;
    topic?: string;
    difficulty?: number;
    timestamp: number;
    source?: string;
    tags?: string[];
  };
}

export interface KnowledgeSearchResult {
  item: KnowledgeItem;
  similarity: number;
  relevance: string;
}

export interface QdrantStatus {
  ready: boolean;
  health: boolean;
  metrics: any;
  collections: Array<{
    name: string;
    points: number;
    vectors: number;
  }>;
}

export interface KnowledgeStats {
  totalItems: number;
  itemsByType: Record<string, number>;
  itemsByTopic: Record<string, number>;
}

interface UseQdrantReturn {
  // State
  isLoading: boolean;
  error: string | null;
  status: QdrantStatus | null;
  stats: KnowledgeStats | null;

  // Qdrant operations
  startQdrant: () => Promise<boolean>;
  stopQdrant: () => Promise<boolean>;
  getStatus: () => Promise<QdrantStatus | null>;
  getCollections: () => Promise<any[]>;
  createCollection: (name: string, vectorSize: number, distance?: string) => Promise<boolean>;
  deleteCollection: (name: string) => Promise<boolean>;

  // Knowledge operations
  addKnowledgeItem: (item: KnowledgeItem, embedding?: number[], provider?: AIProvider) => Promise<boolean>;
  searchKnowledge: (
    query: string,
    provider: AIProvider,
    limit?: number,
    filters?: {
      type?: string;
      topic?: string;
      sessionId?: string;
      tags?: string[];
    }
  ) => Promise<KnowledgeSearchResult[]>;
  getKnowledgeItem: (id: string) => Promise<KnowledgeItem | null>;
  updateKnowledgeItem: (
    id: string,
    updates: Partial<KnowledgeItem>,
    provider: AIProvider
  ) => Promise<boolean>;
  deleteKnowledgeItem: (id: string) => Promise<boolean>;

  // Context operations
  storeConversationContext: (
    sessionId: string,
    messages: Array<{ role: string; content: string }>,
    provider: AIProvider
  ) => Promise<boolean>;
  getRelevantContext: (
    sessionId: string,
    query: string,
    provider: AIProvider,
    limit?: number
  ) => Promise<string[]>;

  // Analytics
  getKnowledgeStats: () => Promise<KnowledgeStats | null>;
  clearAllKnowledge: () => Promise<boolean>;
}

export function useQdrant(): UseQdrantReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<QdrantStatus | null>(null);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);

  // Helper function to handle IPC calls
  const handleIpcCall = useCallback(async <T,>(
    callName: string,
    ...args: any[]
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await (window as any).electronAPI[callName](...args);

      if (result.success) {
        return result.data || result.result || result.stats || result.collections || result.context || result.item || result.results || result.status;
      } else {
        setError(result.error || `Failed to execute ${callName}`);
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Unknown error in ${callName}`;
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Qdrant operations
  const startQdrant = useCallback(async (): Promise<boolean> => {
    const result = await handleIpcCall('qdrantStart');
    return result !== null;
  }, [handleIpcCall]);

  const stopQdrant = useCallback(async (): Promise<boolean> => {
    const result = await handleIpcCall('qdrantStop');
    return result !== null;
  }, [handleIpcCall]);

  const getStatus = useCallback(async (): Promise<QdrantStatus | null> => {
    const result = await handleIpcCall('qdrantStatus');
    if (result) {
      setStatus(result as QdrantStatus);
    }
    return result as QdrantStatus | null;
  }, [handleIpcCall]);

  const getCollections = useCallback(async (): Promise<any[]> => {
    return (await handleIpcCall('qdrantCollections')) || [];
  }, [handleIpcCall]);

  const createCollection = useCallback(async (
    name: string,
    vectorSize: number,
    distance?: string
  ): Promise<boolean> => {
    const result = await handleIpcCall('qdrantCreateCollection', name, vectorSize, distance);
    return result !== null;
  }, [handleIpcCall]);

  const deleteCollection = useCallback(async (name: string): Promise<boolean> => {
    const result = await handleIpcCall('qdrantDeleteCollection', name);
    return result !== null;
  }, [handleIpcCall]);

  // Knowledge operations
  const addKnowledgeItem = useCallback(async (
    item: KnowledgeItem,
    embedding?: number[],
    provider?: AIProvider
  ): Promise<boolean> => {
    const result = await handleIpcCall('knowledgeAdd', item, embedding, provider);
    return result !== null;
  }, [handleIpcCall]);

  const searchKnowledge = useCallback(async (
    query: string,
    provider: AIProvider,
    limit = 10,
    filters?: {
      type?: string;
      topic?: string;
      sessionId?: string;
      tags?: string[];
    }
  ): Promise<KnowledgeSearchResult[]> => {
    const result = await handleIpcCall('knowledgeSearch', query, provider, limit, filters);
    return (result as KnowledgeSearchResult[]) || [];
  }, [handleIpcCall]);

  const getKnowledgeItem = useCallback(async (id: string): Promise<KnowledgeItem | null> => {
    const result = await handleIpcCall('knowledgeGet', id);
    return result as KnowledgeItem | null;
  }, [handleIpcCall]);

  const updateKnowledgeItem = useCallback(async (
    id: string,
    updates: Partial<KnowledgeItem>,
    provider: AIProvider
  ): Promise<boolean> => {
    const result = await handleIpcCall('knowledgeUpdate', id, updates, provider);
    return result !== null;
  }, [handleIpcCall]);

  const deleteKnowledgeItem = useCallback(async (id: string): Promise<boolean> => {
    const result = await handleIpcCall('knowledgeDelete', id);
    return result !== null;
  }, [handleIpcCall]);

  // Context operations
  const storeConversationContext = useCallback(async (
    sessionId: string,
    messages: Array<{ role: string; content: string }>,
    provider: AIProvider
  ): Promise<boolean> => {
    const result = await handleIpcCall('knowledgeStoreContext', sessionId, messages, provider);
    return result !== null;
  }, [handleIpcCall]);

  const getRelevantContext = useCallback(async (
    sessionId: string,
    query: string,
    provider: AIProvider,
    limit = 5
  ): Promise<string[]> => {
    const result = await handleIpcCall('knowledgeGetContext', sessionId, query, provider, limit);
    return (result as string[]) || [];
  }, [handleIpcCall]);

  // Analytics
  const getKnowledgeStats = useCallback(async (): Promise<KnowledgeStats | null> => {
    const result = await handleIpcCall('knowledgeStats');
    if (result) {
      setStats(result as KnowledgeStats);
    }
    return result as KnowledgeStats | null;
  }, [handleIpcCall]);

  const clearAllKnowledge = useCallback(async (): Promise<boolean> => {
    const result = await handleIpcCall('knowledgeClear');
    return result !== null;
  }, [handleIpcCall]);

  // Auto-refresh status periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      await getStatus();
    }, 30000); // Check status every 30 seconds

    return () => clearInterval(interval);
  }, [getStatus]);

  // Initial status check
  useEffect(() => {
    getStatus();
  }, [getStatus]);

  return {
    // State
    isLoading,
    error,
    status,
    stats,

    // Qdrant operations
    startQdrant,
    stopQdrant,
    getStatus,
    getCollections,
    createCollection,
    deleteCollection,

    // Knowledge operations
    addKnowledgeItem,
    searchKnowledge,
    getKnowledgeItem,
    updateKnowledgeItem,
    deleteKnowledgeItem,

    // Context operations
    storeConversationContext,
    getRelevantContext,

    // Analytics
    getKnowledgeStats,
    clearAllKnowledge,
  };
}

export default useQdrant;