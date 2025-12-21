import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import type { KnowledgeMapDisplay, KnowledgeMapNode } from '@/shared/types/electron-api/knowledge-api';
import type { Concept } from '@/shared/types/knowledge';
import { useElectronAPIClient } from '@/renderer/services/services-provider';

interface LoadedConceptsPanelProps {
  onConceptSelect?: (concept: Concept) => void;
  className?: string;
}

const toConcept = (node: KnowledgeMapNode): Concept => {
  const difficultyLevel = 3 as Concept['difficultyLevel'];
  const masteryLevel = Math.max(0, Math.min(5, Math.round((node.mastery ?? 0) * 5))) as Concept['masteryLevel'];
  const conceptType: Concept['conceptType'] =
    (['topic', 'skill', 'fact', 'procedure', 'principle'] as const).includes(
      node.category as any,
    )
      ? (node.category as Concept['conceptType'])
      : 'topic';

  return {
    id: node.id,
    name: node.label,
    conceptType,
    description: '',
    content: '',
    difficultyLevel,
    masteryLevel,
    tags: [],
    metadata: { category: node.category },
    createdAt: new Date(),
    updatedAt: new Date(),
    reviewCount: 0,
  };
};

export const LoadedConceptsPanel: React.FC<LoadedConceptsPanelProps> = ({
  onConceptSelect,
  className = '',
}) => {
  const apiClient = useElectronAPIClient();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<KnowledgeMapNode[]>([]);
  const [filter, setFilter] = useState('');

  const fetchConcepts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.knowledge.getKnowledgeMap();
      if (!resp?.success) {
        throw new Error('Unable to load concepts');
      }
      const data = resp.data as KnowledgeMapDisplay;
      setNodes(Array.isArray(data?.nodes) ? data.nodes : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load concepts');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    void fetchConcepts();
  }, [fetchConcepts]);

  const filteredNodes = useMemo(() => {
    if (!filter.trim()) return nodes;
    const q = filter.toLowerCase();
    return nodes.filter((n) => n.label.toLowerCase().includes(q));
  }, [nodes, filter]);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}
      data-testid="loaded-concepts-panel"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ListBulletIcon className="w-4 h-4 text-blue-600" />
            Current Concepts
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Loaded in the knowledge graph
          </p>
        </div>
        <button
          aria-label="Refresh concepts"
          onClick={() => void fetchConcepts()}
          disabled={loading}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
          <input
            aria-label="Filter concepts"
            className="w-full pl-7 pr-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Filter concepts..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {filteredNodes.length}/{nodes.length}
        </span>
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
          Loading concepts...
        </div>
      ) : filteredNodes.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
          {nodes.length === 0 ? 'No concepts loaded yet.' : 'No concepts match your filter.'}
        </div>
      ) : (
        <ul className="space-y-1 max-h-80 overflow-y-auto">
          {filteredNodes.map((node) => (
            <li key={node.id}>
              <button
                onClick={() => onConceptSelect?.(toConcept(node))}
                className="w-full text-left px-2 py-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{node.label}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {node.category}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Mastery {(Math.round((node.mastery ?? 0) * 100))}%
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LoadedConceptsPanel;
