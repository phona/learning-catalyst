import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LinkIcon, PlusIcon, ArrowPathIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import type { Concept, ConceptRelationship as Relationship } from '@/shared/types/knowledge';
import type { KnowledgeMapDisplay, KnowledgeMapNode, RelatedConceptsDisplay } from '@/shared/types/electron-api/knowledge-api';
import { useElectronAPIClient } from '@/renderer/services/services-provider';
import { showError, showSuccess } from '@/renderer/shared/lib';

interface RelationshipManagerProps {
  selectedConcept?: Concept | null;
  onRelationshipCreated?: (relationship: Relationship) => void;
}

type RelationshipType = Relationship['type'];

const REL_TYPES: { value: RelationshipType; label: string }[] = [
  { value: 'related', label: 'Related' },
  { value: 'prerequisite', label: 'Prerequisite' },
  { value: 'contains', label: 'Contains' },
  { value: 'example', label: 'Example' },
  { value: 'application', label: 'Application' },
  { value: 'contrasts', label: 'Contrasts' },
];

export const RelationshipManager: React.FC<RelationshipManagerProps> = ({
  selectedConcept,
  onRelationshipCreated,
}) => {
  const apiClient = useElectronAPIClient();
  const [nodes, setNodes] = useState<KnowledgeMapNode[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [loadingRel, setLoadingRel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [related, setRelated] = useState<RelatedConceptsDisplay | null>(null);

  const [sourceId, setSourceId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [type, setType] = useState<RelationshipType>('related');
  const [strength, setStrength] = useState<number>(0.7);
  const [description, setDescription] = useState('');

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const refreshNodes = useCallback(async () => {
    setLoadingNodes(true);
    setError(null);
    try {
      const resp = await apiClient.knowledge.getKnowledgeMap();
      if (!resp?.success) {
        const errorMsg = typeof resp?.error === 'string' ? resp.error : resp?.error?.message ?? 'Unable to load concepts';
        throw new Error(errorMsg);
      }
      const data = resp.data as KnowledgeMapDisplay;
      setNodes(data.nodes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load concepts');
    } finally {
      setLoadingNodes(false);
    }
  }, [apiClient]);

  const refreshRelated = useCallback(
    async (conceptId?: string) => {
      if (!conceptId) {
        setRelated(null);
        return;
      }
      setLoadingRel(true);
      try {
        const resp = await apiClient.knowledge.getRelatedConcepts(conceptId);
        if (!resp?.success) {
          const errorMsg = typeof resp?.error === 'string' ? resp.error : resp?.error?.message ?? 'Unable to load relationships';
          throw new Error(errorMsg);
        }
        setRelated(resp.data as RelatedConceptsDisplay);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load relationships');
      } finally {
        setLoadingRel(false);
      }
    },
    [apiClient],
  );

  useEffect(() => {
    void refreshNodes();
  }, [refreshNodes]);

  useEffect(() => {
    // preselect source when selection changes or dialog opens
    if (selectedConcept?.id) {
      if (!sourceId) setSourceId(selectedConcept.id);
      void refreshRelated(selectedConcept.id);
    } else {
      setRelated(null);
    }
  }, [selectedConcept, refreshRelated, sourceId]);

  const canSave = sourceId && targetId && sourceId !== targetId && !saving;

  const handleCreate = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const sourceNode = nodeMap.get(sourceId);
      const targetNode = nodeMap.get(targetId);
      const parsedConcepts = [
        {
          id: 'source',
          name: sourceNode?.label ?? selectedConcept?.name ?? 'Source',
          canonicalName: sourceNode?.label ?? selectedConcept?.name ?? 'Source',
          description: '',
          type: sourceNode?.category ?? 'topic',
          confidence: 1,
          difficulty: 3,
          evidence: [],
          metadata: { source: 'relationship-manager' },
        },
        {
          id: 'target',
          name: targetNode?.label ?? 'Target',
          canonicalName: targetNode?.label ?? 'Target',
          description: '',
          type: targetNode?.category ?? 'topic',
          confidence: 1,
          difficulty: 3,
          evidence: [],
          metadata: { source: 'relationship-manager' },
        },
      ];

      const parsedResult = {
        success: true,
        concepts: parsedConcepts,
        relationships: [
          {
            sourceId: 'source',
            targetId: 'target',
            type,
            strength,
            confidence: 1,
            description: description.trim() || undefined,
          },
        ],
        statistics: {
          totalConcepts: parsedConcepts.length,
          validConcepts: parsedConcepts.length,
          totalRelationships: 1,
          confidenceDistribution: {},
          difficultyDistribution: {},
          typeDistribution: {},
          processingTime: 0,
          modelUsage: {},
          tokenUsage: { total: 0, prompt: 0, completion: 0, estimated: true },
        },
        errors: [],
        metadata: {
          processingTime: 0,
          processedAt: now,
          inputFiles: 0,
          aiProvider: 'manual',
          aiModel: 'manual',
          segmentsProcessed: 0,
          segmentsTotal: 0,
        },
      };

      const resp = await apiClient.knowledge.ingestConcepts({ result: parsedResult });
      if (!resp?.success) {
        const errorMsg = typeof resp?.error === 'string' ? resp.error : resp?.error?.message ?? 'Failed to save relationship';
        throw new Error(errorMsg);
      }

      const relationship: Relationship = {
        sourceConceptId: sourceId,
        targetConceptId: targetId,
        type,
        strength,
        bidirectional: false,
        description: description.trim() || undefined,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      onRelationshipCreated?.(relationship);
      showSuccess('Relationship added');
      setDescription('');
      setStrength(0.7);
      await refreshRelated(selectedConcept?.id ?? sourceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create relationship');
      showError(err instanceof Error ? err.message : 'Failed to create relationship');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relationship-manager bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <LinkIcon className="w-5 h-5 text-blue-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Relationships</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Link concepts and view existing connections
          </p>
        </div>
        {(loadingNodes || loadingRel || saving) && (
          <ArrowPathIcon className="w-4 h-4 text-gray-500 animate-spin ml-auto" />
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-md p-2">
          <ExclamationCircleIcon className="w-4 h-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-200">
          Source concept
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
          >
            <option value="">Select source</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-200">
          Target concept
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
          >
            <option value="">Select target</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-200">
          Relationship type
          <select
            value={type}
            onChange={(e) => setType(e.target.value as RelationshipType)}
            className="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
          >
            {REL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-200">
          Strength ({Math.round(strength * 100)}%)
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={strength}
            onChange={(e) => setStrength(Number(e.target.value))}
            className="w-full"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-200 md:col-span-1">
          Description (optional)
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Why this link matters"
            className="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
          />
        </label>
      </div>

      <div className="flex gap-2">
        <button
          disabled={!canSave}
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
        >
          <PlusIcon className="w-4 h-4" />
          Add relationship
        </button>
        <button
          onClick={() => {
            void refreshNodes();
            void refreshRelated(selectedConcept?.id ?? sourceId);
          }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Existing relationships
          </h4>
          {selectedConcept?.name && (
            <span className="text-xs text-gray-500">For {selectedConcept.name}</span>
          )}
        </div>
        {loadingRel ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading relationships…</div>
        ) : !related || related.relatedConcepts.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {selectedConcept ? 'No relationships yet.' : 'Select a concept to view relationships.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            {related.relatedConcepts.map((rel) => (
              <li key={`${related.conceptId}-${rel.id}`} className="py-2 flex justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{rel.name}</div>
                  <div className="text-xs text-gray-500 capitalize">
                    {rel.relationship} · {Math.round((rel.strength ?? 0) * 100)}%
                  </div>
                </div>
                {rel.description && (
                  <div className="text-xs text-gray-500 max-w-xs text-right">{rel.description}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
