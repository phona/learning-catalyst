import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PlusIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import type { Concept } from '@/shared/types/knowledge';
import type { KnowledgeMapDisplay, KnowledgeMapNode } from '@/shared/types/electron-api/knowledge-api';
import { useElectronAPIClient } from '@/renderer/services/services-provider';
import { showError, showSuccess } from '@/renderer/shared/lib';

interface ConceptManagerProps {
  onConceptCreated?: (concept: Concept) => void;
  onConceptUpdated?: (concept: Concept) => void;
}

const conceptTypeOptions: Array<{ value: Concept['conceptType']; label: string }> = [
  { value: 'topic', label: 'Topic' },
  { value: 'skill', label: 'Skill' },
  { value: 'fact', label: 'Fact' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'principle', label: 'Principle' },
];

const toConcept = (node: KnowledgeMapNode): Concept => ({
  id: node.id,
  name: node.label,
  conceptType: conceptTypeOptions.some((o) => o.value === node.category)
    ? (node.category as Concept['conceptType'])
    : 'topic',
  description: '',
  content: '',
  difficultyLevel: 3 as Concept['difficultyLevel'],
  masteryLevel: Math.max(1, Math.min(5, Math.round((node.mastery ?? 0.4) * 5))) as Concept['masteryLevel'],
  tags: [],
  metadata: { category: node.category },
  createdAt: new Date(),
  updatedAt: new Date(),
  reviewCount: 0,
});

export const ConceptManager: React.FC<ConceptManagerProps> = ({
  onConceptCreated,
  onConceptUpdated,
}) => {
  const apiClient = useElectronAPIClient();

  const [nodes, setNodes] = useState<KnowledgeMapNode[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [conceptType, setConceptType] = useState<Concept['conceptType']>('topic');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<number>(3);
  const [tagsText, setTagsText] = useState('');

  const resetForm = () => {
    setSelectedId(null);
    setName('');
    setConceptType('topic');
    setDescription('');
    setDifficulty(3);
    setTagsText('');
  };

  const refresh = useCallback(async (): Promise<KnowledgeMapNode[]> => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.knowledge.getKnowledgeMap();
      if (!resp?.success) throw new Error(resp?.error ?? 'Unable to load concepts');
      const data = resp.data as KnowledgeMapDisplay;
      const list = data.nodes ?? [];
      setNodes(list);
      return list;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load concepts');
      return [];
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredNodes = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return nodes;
    return nodes.filter((n) => n.label.toLowerCase().includes(term));
  }, [filter, nodes]);

  const selectNode = (node: KnowledgeMapNode) => {
    setSelectedId(node.id);
    setName(node.label);
    setConceptType(
      conceptTypeOptions.some((o) => o.value === node.category)
        ? (node.category as Concept['conceptType'])
        : 'topic',
    );
    setDescription('');
    setDifficulty(Math.max(1, Math.min(5, Math.round((node.mastery ?? 0.4) * 5))));
    setTagsText('');
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const tags = tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const difficultyLevel = Math.max(1, Math.min(5, difficulty));

      const parsedConcept = {
        id: 'concept',
        name: trimmedName,
        canonicalName: trimmedName,
        description: description.trim(),
        type: conceptType,
        confidence: 1,
        difficulty: difficultyLevel,
        evidence: [],
        metadata: { source: 'concept-manager', tags },
      };

      const parsedResult = {
        success: true,
        concepts: [parsedConcept],
        relationships: [],
        statistics: {
          totalConcepts: 1,
          validConcepts: 1,
          totalRelationships: 0,
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
          processedAt: new Date().toISOString(),
          inputFiles: 0,
          aiProvider: 'manual',
          aiModel: 'manual',
          segmentsProcessed: 0,
          segmentsTotal: 0,
        },
      };

      const resp = await apiClient.knowledge.ingestConcepts({
        result: parsedResult,
        options: { source: 'concept-manager' },
      });
      if (!resp?.success) throw new Error(resp?.error ?? 'Failed to save concept');

      const updatedNodes = await refresh();

      const matched = updatedNodes.find((n) => n.label === trimmedName) ?? null;
      const conceptForCallback =
        matched != null
          ? toConcept(matched)
          : ({
              id: selectedId ?? trimmedName,
              name: trimmedName,
              conceptType,
              description: description.trim(),
              content: '',
              difficultyLevel: difficultyLevel as Concept['difficultyLevel'],
              masteryLevel: 3,
              tags,
              metadata: { source: 'concept-manager' },
              createdAt: new Date(),
              updatedAt: new Date(),
              reviewCount: 0,
            } satisfies Concept);

      if (selectedId) {
        onConceptUpdated?.(conceptForCallback);
        showSuccess('Concept updated');
      } else {
        onConceptCreated?.(conceptForCallback);
        showSuccess('Concept created');
      }

      if (matched) {
        setSelectedId(matched.id);
      } else {
        resetForm();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save concept';
      setError(message);
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="concept-manager bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PencilSquareIcon className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Concepts</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Create or edit concepts that appear on the knowledge map
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetForm}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            New concept
          </button>
          <button
            onClick={() => void refresh()}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 inline-flex items-center gap-1"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-md p-2">
          <ExclamationCircleIcon className="w-4 h-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid md:grid-cols-[1.2fr_1fr] gap-4">
        {/* Form */}
        <div className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-200">
              Concept name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Gradient Descent"
                className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-200">
              Type
              <select
                value={conceptType}
                onChange={(e) => setConceptType(e.target.value as Concept['conceptType'])}
                className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                {conceptTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid md:grid-cols-[1fr_1fr] gap-3">
            <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-200">
              Difficulty (1-5)
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">Level {difficulty}</span>
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-200">
              Tags (comma separated)
              <input
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="algebra, optimization"
                className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-200">
            Description (optional)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
              placeholder="Short summary to show in search and practice"
            />
          </label>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
            >
              <PlusIcon className="w-4 h-4" />
              {selectedId ? 'Save changes' : 'Save concept'}
            </button>
            {saving && <ArrowPathIcon className="w-4 h-4 text-gray-500 animate-spin mt-1" />}
          </div>
        </div>

        {/* Existing concepts list */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-200 dark:divide-gray-700 bg-gray-50 dark:bg-gray-900/40">
          <div className="p-3 flex items-center gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search concepts"
              className="flex-1 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
            {loading && <ArrowPathIcon className="w-4 h-4 text-gray-500 animate-spin" />}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filteredNodes.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 dark:text-gray-400">No concepts found.</div>
            ) : (
              <ul>
                {filteredNodes.map((node) => (
                  <li key={node.id}>
                    <button
                      type="button"
                      data-testid="concept-row"
                      onClick={() => selectNode(node)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                        selectedId === node.id
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500'
                          : ''
                      }`}
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {node.label}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">{node.category}</div>
                      </div>
                      <div className="text-[10px] text-gray-400">ID {node.id.slice(0, 6)}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
