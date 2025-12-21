import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowPathIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import type { Concept } from '@/shared/types/knowledge';
import type { KnowledgeMapDisplay, KnowledgeMapNode, KnowledgeMapEdge } from '@/shared/types/electron-api/knowledge-api';
import { useElectronAPIClient } from '@/renderer/services/services-provider';

interface KnowledgeGraphVisualizationProps {
  onConceptSelect?: (concept: Concept) => void;
  className?: string;
}

const toConcept = (node: KnowledgeMapNode): Concept => {
  const masteryLevel = Math.max(0, Math.min(5, Math.round((node.mastery ?? 0) * 5))) as Concept['masteryLevel'];
  const conceptType: Concept['conceptType'] =
    (['topic', 'skill', 'fact', 'procedure', 'principle'] as const).includes(node.category as any)
      ? (node.category as Concept['conceptType'])
      : 'topic';

  return {
    id: node.id,
    name: node.label,
    conceptType,
    description: '',
    content: '',
    difficultyLevel: 3,
    masteryLevel,
    tags: [],
    metadata: { category: node.category },
    createdAt: new Date(),
    updatedAt: new Date(),
    reviewCount: 0,
  };
};

export const KnowledgeGraphVisualization: React.FC<KnowledgeGraphVisualizationProps> = ({
  onConceptSelect,
  className = '',
}) => {
  const apiClient = useElectronAPIClient();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<KnowledgeMapNode[]>([]);
  const [edges, setEdges] = useState<KnowledgeMapEdge[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.knowledge.getKnowledgeMap();
      if (!resp?.success) throw new Error('Unable to load knowledge graph');
      const data = resp.data as KnowledgeMapDisplay;
      setNodes(Array.isArray(data.nodes) ? data.nodes : []);
      setEdges(Array.isArray(data.edges) ? data.edges : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge graph');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    void load();
  }, [load]);

  const edgeList = useMemo(() => edges.slice(0, 80), [edges]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`} data-testid="kgv-loading">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading knowledge graph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center h-64 ${className}`}
        data-testid="kgv-error"
      >
        <div className="text-center text-red-600 dark:text-red-400 flex flex-col items-center gap-2">
          <ExclamationCircleIcon className="w-8 h-8" />
          <p className="text-sm">{error}</p>
          <button
            onClick={() => void load()}
            className="text-xs px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`knowledge-graph-container relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}
      data-testid="knowledge-graph-visualization"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Knowledge Graph</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {nodes.length} concepts · {edges.length} relationships
          </p>
        </div>
        <button
          aria-label="Refresh knowledge graph"
          onClick={() => void load()}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border border-gray-200 dark:border-gray-700 rounded p-2 max-h-72 overflow-y-auto">
          {nodes.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">No concepts found.</div>
          ) : (
            <ul className="space-y-1">
              {nodes.map((node) => (
                <li key={node.id}>
                  <button
                    onClick={() => onConceptSelect?.(toConcept(node))}
                    className="w-full text-left px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {node.label}
                      </span>
                      <span className="text-[11px] text-gray-500 capitalize">{node.category}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      Mastery {Math.round((node.mastery ?? 0) * 100)}%
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded p-2 max-h-72 overflow-y-auto">
          {edgeList.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">No relationships found.</div>
          ) : (
            <ul className="space-y-1 text-xs text-gray-700 dark:text-gray-200">
              {edgeList.map((e, idx) => {
                const from = nodes.find((n) => n.id === e.from)?.label ?? e.from;
                const to = nodes.find((n) => n.id === e.to)?.label ?? e.to;
                return (
                  <li key={idx} className="flex items-center justify-between">
                    <span className="truncate">
                      {from} → {to}
                      {e.label ? ` (${e.label})` : ''}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {Math.round((e.strength ?? 0.5) * 100)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
