import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import RelationGraph, {
  RGJsonData,
  RGOptions,
  RGNode,
  RGLink,
  RelationGraphComponent,
} from 'relation-graph-react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import type { KnowledgeMapDisplay, KnowledgeMapEdge, KnowledgeMapNode } from '@/shared/types/electron-api/knowledge-api';
import type { Concept } from '@/shared/types/knowledge';
import { useElectronAPIClient } from '@/renderer/services/services-provider';
import { showSuccess } from '@/renderer/utils/toast';

interface KnowledgeGameMapProps {
  onConceptSelect?: (concept: Concept) => void;
  className?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  topic: '#3b82f6',
  skill: '#a855f7',
  fact: '#22c55e',
  procedure: '#f97316',
  principle: '#6366f1',
};

const typeColor = (type?: string) => {
  switch (type) {
  case 'prerequisite':
    return '#f59e0b';
  case 'contains':
    return '#ec4899';
  case 'related':
  default:
    return '#0ea5e9';
  }
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
  masteryLevel: Math.max(1, Math.min(5, Math.round((node.mastery ?? 0) * 5))) as Concept['masteryLevel'],
  tags: [],
  metadata: { category: node.category },
  createdAt: new Date(),
  updatedAt: new Date(),
  reviewCount: 0,
});

export const KnowledgeGameMap: React.FC<KnowledgeGameMapProps> = ({
  onConceptSelect,
  className = '',
}) => {
  const apiClient = useElectronAPIClient();
  const graphRef = useRef<RelationGraphComponent | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rawNodes, setRawNodes] = useState<KnowledgeMapNode[]>([]);
  const [rawEdges, setRawEdges] = useState<KnowledgeMapEdge[]>([]);
  const [, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextNode, setContextNode] = useState<KnowledgeMapNode | null>(null);
  const [contextPos, setContextPos] = useState<{ x: number; y: number } | null>(null);

  const options: RGOptions = {
    debug: false,
    allowZoom: true,
    allowPan: true,
    miniMap: { show: true },
    defaultNodeColor: '#3b82f6',
    defaultNodeBorderWidth: 0,
    defaultLineShape: 1,
    defaultJunctionPoint: 'border',
    layouts: [
      {
        label: 'Auto Layout',
        layoutName: 'force',
        layoutClassName: 'seeks-layout-force',
      },
    ],
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.knowledge.getKnowledgeMap();
      if (!resp?.success) throw new Error(resp.error?.message ?? 'Unable to load knowledge map');
      const data = resp.data as KnowledgeMapDisplay;
      setRawNodes(data.nodes ?? []);
      setRawEdges(data.edges ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge map');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    void load();
  }, [load]);

  // Set up non-passive event listeners to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // prevent page scroll but let the graph receive the wheel event for zoom/pan
      e.preventDefault();
    };

    const handleTouchMove = (e: TouchEvent) => {
      // keep touch panning inside the graph
      e.preventDefault();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const filtered = useMemo(
    () => ({
      nodes: rawNodes,
      edges: rawEdges,
    }),
    [rawNodes, rawEdges],
  );

  const toGraphData = useCallback((): RGJsonData => {
    const nodes: RGNode[] = filtered.nodes.map((n) => ({
      id: n.id,
      text: n.label,
      color: CATEGORY_COLORS[n.category] ?? '#3b82f6',
      data: n,
      // size can be amplified for mastery
      size: 30 + (n.mastery ?? 0.3) * 10,
    }));

    // Filter out edges with invalid node references to prevent graph rendering errors
    const validNodeIds = new Set(nodes.map((n) => n.id));
    console.log('[KnowledgeMap] Valid node IDs:', validNodeIds);
    console.log('[KnowledgeMap] Raw edges count:', filtered.edges.length);
    console.log('[KnowledgeMap] Raw edges:', filtered.edges);

    const validEdges = filtered.edges.filter((e) => {
      const isValid = e.from && e.to && validNodeIds.has(e.from) && validNodeIds.has(e.to);
      if (!isValid) {
        console.log('[KnowledgeMap] Filtering out invalid edge:', { from: e.from, to: e.to, validFrom: validNodeIds.has(e.from), validTo: validNodeIds.has(e.to) });
      }
      return isValid;
    });

    console.log('[KnowledgeMap] Valid edges after filtering:', validEdges.length);

    const links: RGLink[] = validEdges.map((e) => ({
      from: e.from,
      to: e.to,
      text: e.label ?? e.type ?? 'related',
      relations: [
        {
          text: e.type ?? 'related',
          color: typeColor(e.type),
          width: Math.max(1, (e.strength ?? 0.3) * 4),
          data: e,
        },
      ],
    }));

    console.log('[KnowledgeMap] Final graph data:', { nodes: nodes.length, links: links.length });

    return { nodes, links };
  }, [filtered.edges, filtered.nodes]);

  // Push data to graph when filters or source change
  useEffect(() => {
    const instance = graphRef.current?.getInstance?.();
    if (!instance) return;
    void instance.setJsonData(toGraphData());
  }, [toGraphData]);

  const handleContextMenu = (event: React.MouseEvent, node: KnowledgeMapNode) => {
    event.preventDefault();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setContextPos({ x: event.clientX - rect.left + 8, y: event.clientY - rect.top + 8 });
    setContextNode(node);
  };

  const closeContext = () => {
    setContextNode(null);
    setContextPos(null);
  };

  const handleOpen = (node: KnowledgeMapNode) => {
    onConceptSelect?.(toConcept(node));
    closeContext();
  };

  const handlePractice = (node: KnowledgeMapNode) => {
    showSuccess(`Queued practice for ${node.label}`);
    closeContext();
  };

  const handleHide = (node: KnowledgeMapNode) => {
    setRawNodes((prev) => prev.filter((n) => n.id !== node.id));
    closeContext();
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden touch-none ${className}`}
      style={{ minHeight: 520, height: '100%', touchAction: 'none', overscrollBehavior: 'contain' }}
    >
      {error && (
        <div className="absolute top-2 left-2 right-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded px-3 py-2 flex items-center gap-2 z-10">
          <ExclamationCircleIcon className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <RelationGraph
        ref={graphRef}
        options={options}
        style={{ width: '100%', height: '100%' }}
        nodeSlot={({ node }) => {
          const data = node.data as KnowledgeMapNode;
          return (
            <div
              className="relative flex flex-col items-center justify-center cursor-pointer select-none"
              onClick={() => onConceptSelect?.(toConcept(data))}
              onContextMenu={(e) => handleContextMenu(e, data)}
            >
              <div
                className="rounded-full"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: node.color,
                  boxShadow: '0 0 10px rgba(0,0,0,0.2)',
                }}
                title={data.label}
              />
              <div className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 mt-1 whitespace-nowrap">
                {data.label}
              </div>
            </div>
          );
        }}
      />

      {/* Context menu */}
      {contextNode && contextPos && (
        <div
          className="absolute z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 text-xs"
          style={{ left: contextPos.x, top: contextPos.y }}
          onMouseLeave={closeContext}
        >
          <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{contextNode.label}</div>
          <div className="flex gap-2">
            <button
              className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500"
              onClick={() => handleOpen(contextNode)}
            >
              Open
            </button>
            <button
              className="px-2 py-1 rounded bg-amber-500 text-white hover:bg-amber-400"
              onClick={() => handlePractice(contextNode)}
            >
              Practice
            </button>
            <button
              className="px-2 py-1 rounded bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
              onClick={() => handleHide(contextNode)}
            >
              Hide
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGameMap;
