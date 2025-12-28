import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import useQdrant, { type KnowledgeStats, type QdrantStatus } from '../useQdrant';

const createElectronStub = () => ({
  qdrantStart: vi.fn().mockResolvedValue({ success: true }),
  qdrantStop: vi.fn().mockResolvedValue({ success: true }),
  qdrantStatus: vi.fn().mockResolvedValue({ success: true, data: mockStatus }),
  qdrantCollections: vi.fn().mockResolvedValue({ success: true, collections: [{ name: 'c1' }] }),
  qdrantCreateCollection: vi.fn().mockResolvedValue({ success: true }),
  qdrantDeleteCollection: vi.fn().mockResolvedValue({ success: true }),
  knowledgeAdd: vi.fn().mockResolvedValue({ success: true }),
  knowledgeSearch: vi.fn().mockResolvedValue({ success: true, results: [{ item: { id: '1' }, similarity: 0.9, relevance: 'high' }] }),
  knowledgeGet: vi.fn().mockResolvedValue({ success: true, item: { id: '1' } }),
  knowledgeUpdate: vi.fn().mockResolvedValue({ success: true }),
  knowledgeDelete: vi.fn().mockResolvedValue({ success: true }),
  knowledgeStoreContext: vi.fn().mockResolvedValue({ success: true }),
  knowledgeGetContext: vi.fn().mockResolvedValue({ success: true, context: ['ctx'] }),
  knowledgeStats: vi.fn().mockResolvedValue({ success: true, stats: mockStats }),
  knowledgeClear: vi.fn().mockResolvedValue({ success: true }),
});

const mockStatus: QdrantStatus = {
  ready: true,
  health: true,
  metrics: { uptime: 1 },
  collections: [{ name: 'default', points: 10, vectors: 10 }],
};

const mockStats: KnowledgeStats = {
  totalItems: 3,
  itemsByType: { concept: 2, question: 1 },
  itemsByTopic: { math: 2, cs: 1 },
};

describe('useQdrant', () => {
  let electronAPI: ReturnType<typeof createElectronStub>;

  beforeEach(() => {
    electronAPI = createElectronStub();
    (window as any).electronAPI = electronAPI;
  });

  it('performs status check and stores status', async () => {
    const { result } = renderHook(() => useQdrant());

    await act(async () => {
      await result.current.getStatus();
    });

    expect(electronAPI.qdrantStatus).toHaveBeenCalledTimes(2); // initial effect + explicit
    expect(result.current.status?.ready).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('handles IPC errors by surfacing error state', async () => {
    electronAPI.qdrantStatus.mockResolvedValue({ success: false, error: 'boom' });

    const { result } = renderHook(() => useQdrant());

    await act(async () => {
      await result.current.getStatus();
    });

    expect(result.current.error).toBe('boom');
    expect(result.current.status).toBeNull();
  });

  it('maps knowledge operations through electronAPI', async () => {
    const { result } = renderHook(() => useQdrant());

    await act(async () => {
      await result.current.startQdrant();
      await result.current.createCollection('new', 1536, 'Cosine');
      await result.current.addKnowledgeItem({ id: 'k1', content: 'c', type: 'concept', metadata: { timestamp: Date.now() } });
      await result.current.searchKnowledge('hello', 'openai' as any, 5, { topic: 'math' });
      await result.current.getKnowledgeStats();
    });

    expect(electronAPI.qdrantStart).toHaveBeenCalled();
    expect(electronAPI.qdrantCreateCollection).toHaveBeenCalledWith('new', 1536, 'Cosine');
    expect(electronAPI.knowledgeAdd).toHaveBeenCalled();
    expect(electronAPI.knowledgeSearch).toHaveBeenCalledWith('hello', 'openai', 5, { topic: 'math' });
    expect(result.current.stats).toEqual(mockStats);
  });

  it('cleans up the status interval on unmount', async () => {
    const clearSpy = vi.spyOn(global, 'clearInterval');
    const { unmount } = renderHook(() => useQdrant());

    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
