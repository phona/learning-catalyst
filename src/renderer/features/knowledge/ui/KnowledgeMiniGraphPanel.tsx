import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  ExclamationCircleIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import type { KnowledgeMapDisplay, KnowledgeMapNode, KnowledgeMapEdge } from '@/shared/types/electron-api/knowledge-api';
import type { Concept } from '@/shared/types/knowledge';
import { useElectronAPIClient } from '@/renderer/services/services-provider';

interface KnowledgeMiniGraphPanelProps {
  onConceptSelect?: (concept: Concept) => void;
  className?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  topic: 'bg-blue-100 text-blue-700',
  skill: 'bg-purple-100 text-purple-700',
  fact: 'bg-green-100 text-green-700',
  procedure: 'bg-orange-100 text-orange-700',
  principle: 'bg-indigo-100 text-indigo-700',
};

const toConcept = (node: KnowledgeMapNode): Concept => ({
  id: node.id,
  name: node.label,
  conceptType: (['topic', 'skill', 'fact', 'procedure', 'principle'] as const).includes(
    node.category as any,
  )
    ? (node.category as Concept['conceptType'])
    : 'topic',
  description: '',
  content: '',
  difficultyLevel: 3,
  masteryLevel: Math.max(0, Math.min(5, Math.round((node.mastery ?? 0) * 5))) as Concept['masteryLevel'],
  tags: [],
  metadata: { category: node.category },
  createdAt: new Date(),
  updatedAt: new Date(),
  reviewCount: 0,
});

export const KnowledgeMiniGraphPanel: React.FC<KnowledgeMiniGraphPanelProps> = ({
  onConceptSelect,
  className = '',
}) => {
  const apiClient = useElectronAPIClient();
  const [nodes, setNodes] = useState<KnowledgeMapNode[]>([]);
  const [edges, setEdges] = useState<KnowledgeMapEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [minStrength, setMinStrength] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.knowledge.getKnowledgeMap();
      if (!resp?.success) throw new Error('Unable to load knowledge map');
      const data = resp.data as KnowledgeMapDisplay;
      setNodes(data.nodes ?? []);
      setEdges(data.edges ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge map');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredNodes = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return nodes;
    return nodes.filter((n) => n.label.toLowerCase().includes(q));
  }, [nodes, filter]);

  const filteredEdges = useMemo(
    () => edges.filter((e) => e.strength >= minStrength),
    [edges, minStrength],
  );

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}
      data-testid="knowledge-mini-graph-panel"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Squares2X2Icon className="w-4 h-4 text-blue-600" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Knowledge Graph (mini)
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">All concepts & links</p>
          </div>
        </div>
        <button
          aria-label="Refresh knowledge map"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="space-y-2 mb-3">
        <input
          aria-label="Filter graph concepts"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter concepts..."
          className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <AdjustmentsHorizontalIcon className="w-4 h-4" />
          Min strength
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={minStrength}
            onChange={(e) => setMinStrength(Number(e.target.value))}
            className="flex-1"
          />
          <span className="w-10 text-right">{(minStrength * 100).toFixed(0)}%</span>
        </label>
      </div>

      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-2 mb-2">
          <ExclamationCircleIcon className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6 text-sm text-gray-500 dark:text-gray-400">
          <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
          Loading knowledge map...
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
            {filteredNodes.slice(0, 60).map((node) => (
              <button
                key={node.id}
                onClick={() => onConceptSelect?.(toConcept(node))}
                className={`px-2 py-1 rounded text-xs font-medium hover:ring-1 hover:ring-blue-400 transition ${
                  CATEGORY_COLORS[node.category] ?? 'bg-gray-100 text-gray-700'
                }`}
                title={node.label}
              >
                {node.label}
              </button>
            ))}
            {filteredNodes.length > 60 && (
              <span className="text-[11px] text-gray-500">+{filteredNodes.length - 60} more</span>
            )}
          </div>

          <div className="max-h-28 overflow-y-auto text-xs text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700 pt-2">
            {filteredEdges.slice(0, 40).map((e, idx) => {
              const from = nodes.find((n) => n.id === e.from)?.label ?? e.from;
              const to = nodes.find((n) => n.id === e.to)?.label ?? e.to;
              return (
                <div key={idx} className="flex justify-between gap-2 py-0.5">
                  <span className="truncate">
                    {from} → {to}
                  </span>
                  <span className="text-right">{Math.round(e.strength * 100)}%</span>
                </div>
              );
            })}
            {filteredEdges.length === 0 && <div>No edges match the filter.</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeMiniGraphPanel;
