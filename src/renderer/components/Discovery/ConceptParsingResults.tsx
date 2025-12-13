import React, { useState } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type {
  ParsingJob,
  ParsingResult,
  Concept,
  ProposedRelationship,
  ParsingStatistics,
} from '@/shared/types/concept-parsing';
import type {
  ConceptParsingResult,
  ConceptIngestionPlan,
  KnowledgeIngestionResult,
} from '@/shared/types/electron-api/knowledge-api';
import { showSuccess, showError } from '@/renderer/utils/toast';
import { ConfirmDialog } from '../UI/ConfirmDialog';

interface ConceptParsingResultsProps {
  job: ParsingJob;
  onClose?: () => void;
  onExport?: (format: 'json' | 'csv') => void;
  onConceptSelect?: (conceptId: string) => void;
  onIngest?: (
    result: ConceptParsingResult,
    plan?: ConceptIngestionPlan,
  ) => Promise<KnowledgeIngestionResult>;
  className?: string;
}

interface ConceptCardProps {
  concept: Concept;
  onSelect?: (conceptId: string) => void;
}

const ConceptCard: React.FC<ConceptCardProps> = ({ concept, onSelect }) => {
  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
    case 1:
      return 'text-green-600 bg-green-100';
    case 2:
      return 'text-lime-600 bg-lime-100';
    case 3:
      return 'text-yellow-600 bg-yellow-100';
    case 4:
      return 'text-orange-600 bg-orange-100';
    case 5:
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTypeColor = (type: string) => {
    switch (type) {
    case 'topic':
      return 'text-blue-600 bg-blue-100';
    case 'skill':
      return 'text-purple-600 bg-purple-100';
    case 'fact':
      return 'text-green-600 bg-green-100';
    case 'procedure':
      return 'text-orange-600 bg-orange-100';
    case 'principle':
      return 'text-indigo-600 bg-indigo-100';
    default:
      return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelect?.(concept.id)}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{concept.name}</h3>
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(concept.type)}`}>
            {concept.type}
          </span>
          <span
            className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(concept.difficulty)}`}
          >
            Level {concept.difficulty}
          </span>
        </div>
      </div>

      {concept.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {concept.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <span className={`flex items-center ${getConfidenceColor(concept.confidence)}`}>
            <ChartBarIcon className="w-3 h-3 mr-1" />
            {Math.round(concept.confidence * 100)}% confidence
          </span>
          {concept.evidence.length > 0 && (
            <span className="flex items-center">
              <DocumentTextIcon className="w-3 h-3 mr-1" />
              {concept.evidence.length} evidence sources
            </span>
          )}
        </div>
        <span className="text-xs">{concept.extractedAt.toLocaleDateString()}</span>
      </div>

      {concept.metadata.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {concept.metadata.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
            >
              {tag}
            </span>
          ))}
          {concept.metadata.tags.length > 3 && (
            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
              +{concept.metadata.tags.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export const ConceptParsingResults: React.FC<ConceptParsingResultsProps> = ({
  job,
  onClose,
  onExport,
  onConceptSelect,
  onIngest,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'concepts' | 'relationships' | 'statistics'
  >('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'confidence' | 'difficulty' | 'date'>('confidence');

  const result = job.result;
  const concepts = result?.concepts || [];
  const relationships = result?.relationships || [];
  const statistics = result?.statistics;
  const metadata = result?.metadata;
  const [ingesting, setIngesting] = useState(false);
  const [ingestSummary, setIngestSummary] = useState<KnowledgeIngestionResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<ConceptParsingResult | null>(null);
  const [pendingPlan, setPendingPlan] = useState<ConceptIngestionPlan | null>(null);
  const [defaultExistingAction, setDefaultExistingAction] = useState<'overwrite' | 'skip'>(
    'overwrite',
  );
  const [lowConfidenceThreshold, setLowConfidenceThreshold] = useState(0.6);
  const [actions, setActions] = useState<Record<string, ConceptIngestionAction>>({});
  const [edits, setEdits] = useState<Record<string, Partial<Concept>>>({});

  const buildPayloadAndPlan = () => {
    if (!result) {
      return {
        payload: {
          concepts: [],
          relationships: [],
        } as unknown as ConceptParsingResult,
        plan: {
          defaultExistingAction,
          lowConfidence: { defaultThreshold: lowConfidenceThreshold },
        },
      };
    }

    const planActions: Record<string, ConceptIngestionAction> = { ...actions };

    // auto-skip low-confidence unless user explicitly chose insert/overwrite
    result.concepts.forEach((c) => {
      const explicit = planActions[c.id];
      if (
        typeof c.confidence === 'number' &&
        c.confidence < lowConfidenceThreshold &&
        (explicit === undefined || explicit === 'skip')
      ) {
        planActions[c.id] = 'skip';
      }
    });

    const filteredConcepts = result.concepts
      .map((c) => ({ ...c, ...edits[c.id] }))
      .filter((c) => planActions[c.id] !== 'skip');

    const conceptIdSet = new Set(filteredConcepts.map((c) => c.id));
    const nameToId = new Map(filteredConcepts.map((c) => [c.name.toLowerCase(), c.id] as const));

    const filteredRelationships: ParsedRelationship[] = [];

    // relationships attached to concepts (source implied by the owning concept)
    filteredConcepts.forEach((concept) => {
      concept.relationships?.forEach((rel) => {
        const targetId =
          rel.targetConceptId ??
          (rel.targetConceptName ? nameToId.get(rel.targetConceptName.toLowerCase()) : undefined);
        if (!targetId || !conceptIdSet.has(targetId)) return;
        filteredRelationships.push({
          sourceId: concept.id,
          targetId,
          type: rel.type ?? 'related',
          strength: Math.min(1, Math.max(0, rel.strength ?? 0.5)),
          confidence: Math.min(1, Math.max(0, rel.confidence ?? 0.5)),
          description: rel.description,
        });
      });
    });

    // relationships already structured with source/target (if present)
    result.relationships?.forEach((rel: any) => {
      const sourceId: string | undefined = rel.sourceId ?? rel.sourceConceptId;
      const targetId: string | undefined = rel.targetId ?? rel.targetConceptId;
      if (!sourceId || !targetId) return;
      if (!conceptIdSet.has(sourceId) || !conceptIdSet.has(targetId)) return;
      filteredRelationships.push({
        sourceId,
        targetId,
        type: rel.type ?? 'related',
        strength: Math.min(1, Math.max(0, rel.strength ?? 0.5)),
        confidence: Math.min(1, Math.max(0, rel.confidence ?? 0.5)),
        description: rel.description,
      });
    });

    const payload: ConceptParsingResult = {
      ...result,
      concepts: filteredConcepts,
      relationships: filteredRelationships,
    };

    const plan: ConceptIngestionPlan = {
      defaultExistingAction,
      lowConfidence: { defaultThreshold: lowConfidenceThreshold },
      actions: Object.keys(planActions).length ? planActions : undefined,
    };

    return { payload, plan };
  };

  const handleOpenConfirm = () => {
    const built = buildPayloadAndPlan();
    setPendingPayload(built.payload);
    setPendingPlan(built.plan);
    setConfirmOpen(true);
  };

  const handleIngest = async () => {
    if (!onIngest) return;
    const built =
      pendingPayload && pendingPlan ? { payload: pendingPayload, plan: pendingPlan } : buildPayloadAndPlan();
    const { payload, plan } = built;

    try {
      setIngesting(true);
      setIngestSummary(null);

      const summary = await onIngest(payload, plan);
      setIngestSummary(summary);
      showSuccess('Applied to knowledge successfully');
    } catch (err) {
      showError(`Ingest failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIngesting(false);
      setConfirmOpen(false);
      setPendingPayload(null);
      setPendingPlan(null);
    }
  };

  const confirmSummary = (() => {
    const payload = pendingPayload ?? buildPayloadAndPlan().payload;
    return {
      concepts: payload.concepts.length,
      relationships: payload.relationships.length,
    };
  })();

  // Filter concepts
  const filteredConcepts = concepts
    .filter((concept) => {
      if (searchQuery && !concept.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (filterType !== 'all' && concept.type !== filterType) {
        return false;
      }
      if (concept.confidence < lowConfidenceThreshold) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'confidence':
        return b.confidence - a.confidence;
      case 'difficulty':
        return b.difficulty - a.difficulty;
      case 'date':
        return b.extractedAt.getTime() - a.extractedAt.getTime();
      default:
        return 0;
      }
    });

  const lowConfidenceCount = concepts.filter((c) => c.confidence < lowConfidenceThreshold).length;
  const explicitSkipCount = Object.values(actions).filter((a) => a === 'skip').length;
  const willSendCount = concepts.length - lowConfidenceCount - explicitSkipCount;

  const getJobStatusIcon = () => {
    switch (job.status) {
    case 'completed':
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    case 'failed':
      return <XCircleIcon className="w-5 h-5 text-red-500" />;
    case 'processing':
      return <ClockIcon className="w-5 h-5 text-blue-500 animate-spin" />;
    default:
      return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
    case 'completed':
      return 'text-green-600 bg-green-100';
    case 'failed':
      return 'text-red-600 bg-red-100';
    case 'processing':
      return 'text-blue-600 bg-blue-100';
    default:
      return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getJobStatusIcon()}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Concept Parsing Results
            </h2>
            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor()}`}>
              {job.status}
            </span>
          </div>
          <div className="flex items-center space-x-2">
        {job.status === 'completed' && onExport && (
          <button
            onClick={() => onExport('json')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            title="Export as JSON"
          >
            <ArrowDownTrayIcon className="w-4 h-4 text-gray-500" />
          </button>
        )}
        {job.status === 'completed' && onIngest && (
          <button
            onClick={handleOpenConfirm}
            disabled={ingesting}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
          >
            {ingesting ? 'Applying...' : 'Apply to Knowledge'}
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <XMarkIcon className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {metadata && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600 dark:text-gray-400 mb-3">
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded px-3 py-2">
            <div className="font-semibold text-gray-800 dark:text-gray-200">Job</div>
            <div className="font-mono truncate">{metadata.jobId ?? 'unknown'}</div>
            {metadata.resumed && <div className="text-emerald-600">resumed</div>}
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded px-3 py-2">
            <div className="font-semibold text-gray-800 dark:text-gray-200">Segments</div>
            <div>
              {metadata.segmentsProcessed ?? '-'} / {metadata.segmentsTotal ?? '-'}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded px-3 py-2">
            <div className="font-semibold text-gray-800 dark:text-gray-200">Processed At</div>
            <div>{new Date(metadata.processedAt).toLocaleString()}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded px-3 py-2">
            <div className="font-semibold text-gray-800 dark:text-gray-200">Duration</div>
            <div>{formatDuration(metadata.processingTime ?? 0)}</div>
          </div>
        </div>
      )}

      {ingesting && (
        <div className="mt-2 text-xs text-blue-700 dark:text-blue-200 flex items-center gap-2">
          <ClockIcon className="w-4 h-4 animate-spin" />
          <span>Applying your selections…</span>
        </div>
          )}

          {job.status === 'completed' && (
            <div className="mt-3 space-y-2 text-xs text-gray-700 dark:text-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-2">
                  <span className="font-medium">Default action for existing names:</span>
                  <select
                    className="border rounded px-2 py-1 bg-white dark:bg-gray-900"
                    value={defaultExistingAction}
                    onChange={(e) =>
                      setDefaultExistingAction(e.target.value === 'skip' ? 'skip' : 'overwrite')
                    }
                  >
                    <option value="overwrite">Overwrite</option>
                    <option value="skip">Skip</option>
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <span className="font-medium">Skip below confidence:</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={lowConfidenceThreshold}
                    onChange={(e) => setLowConfidenceThreshold(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-10 text-right">{(lowConfidenceThreshold * 100).toFixed(0)}%</span>
                </label>
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Will send {Math.max(willSendCount, 0)} concepts | Skipping{' '}
                {lowConfidenceCount + explicitSkipCount} (low-confidence {lowConfidenceCount}, manual{' '}
                {explicitSkipCount})
              </div>
            </div>
          )}
        </div>

        {ingestSummary && (
          <div className="mt-3 mx-1 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/30 p-3 text-xs text-blue-800 dark:text-blue-100">
            <div className="font-semibold text-sm mb-1">Ingestion applied</div>
            <div className="flex gap-4 flex-wrap">
              <span>Inserted: {ingestSummary.conceptsInserted}</span>
              <span>Updated: {ingestSummary.conceptsUpdated}</span>
              <span>Skipped: {ingestSummary.conceptsSkipped ?? 0}</span>
              <span>Merged: {ingestSummary.conceptsMerged ?? 0}</span>
              <span>Relationships: +{ingestSummary.relationshipsInserted}</span>
              <span>Rels skipped: {ingestSummary.relationshipsSkipped ?? 0}</span>
              {ingestSummary.lowConfidenceSkipped != null && (
                <span>Low-confidence skipped: {ingestSummary.lowConfidenceSkipped}</span>
              )}
            </div>
          </div>
        )}

        {/* Job Progress */}
        {job.status === 'processing' && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span>Processing Progress</span>
              <span>{Math.round(job.progress * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${job.progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Summary Statistics */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="text-blue-600 dark:text-blue-400 font-semibold">
                {statistics.validConcepts}
              </div>
              <div className="text-blue-600 dark:text-blue-400 text-xs">Concepts Found</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <div className="text-green-600 dark:text-green-400 font-semibold">
                {statistics.totalRelationships}
              </div>
              <div className="text-green-600 dark:text-green-400 text-xs">Relationships</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
              <div className="text-purple-600 dark:text-purple-400 font-semibold">
                {statistics.validConcepts > 0
                  ? Math.round((statistics.validConcepts / statistics.totalConcepts) * 100)
                  : 0}
                %
              </div>
              <div className="text-purple-600 dark:text-purple-400 text-xs">Avg Confidence</div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
              <div className="text-orange-600 dark:text-orange-400 font-semibold">
                {formatDuration(statistics.processingTime)}
              </div>
              <div className="text-orange-600 dark:text-orange-400 text-xs">Processing Time</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      {job.status === 'completed' && result && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-1 p-4">
            {[
              { id: 'overview', label: 'Overview', icon: ChartBarIcon },
              { id: 'concepts', label: `Concepts (${concepts.length})`, icon: AcademicCapIcon },
              {
                id: 'relationships',
                label: `Relationships (${relationships.length})`,
                icon: FunnelIcon,
              },
              { id: 'statistics', label: 'Statistics', icon: ChartBarIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {job.status === 'processing' && (
          <div className="text-center py-8">
            <ClockIcon className="w-12 h-12 mx-auto mb-3 text-blue-500 animate-spin" />
            <p className="text-gray-600 dark:text-gray-400">Processing your files...</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              This may take a few moments depending on file size and complexity.
            </p>
          </div>
        )}

        {job.status === 'failed' && (
          <div className="text-center py-8">
            <XCircleIcon className="w-12 h-12 mx-auto mb-3 text-red-500" />
            <p className="text-red-600 dark:text-red-400 font-medium">Parsing Failed</p>
            {job.errorMessage && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{job.errorMessage}</p>
            )}
          </div>
        )}

        {job.status === 'completed' && result && (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Processing Summary */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Processing Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Extraction Results
                      </h4>
                      <dl className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Total Concepts:</dt>
                          <dd className="font-medium">{statistics?.totalConcepts || 0}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Valid Concepts:</dt>
                          <dd className="font-medium text-green-600">
                            {statistics?.validConcepts || 0}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Relationships:</dt>
                          <dd className="font-medium">{statistics?.totalRelationships || 0}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Processing Details
                      </h4>
                      <dl className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Processing Time:</dt>
                          <dd className="font-medium">
                            {formatDuration(statistics?.processingTime || 0)}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Average Confidence:</dt>
                          <dd className="font-medium">
                            {statistics
                              ? Math.round(
                                (statistics.validConcepts / statistics.totalConcepts) * 100,
                              )
                              : 0}
                            %
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600 dark:text-gray-400">Extraction Method:</dt>
                          <dd className="font-medium">AI + Rules</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>

                {/* Top Concepts Preview */}
                {concepts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Top Concepts
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {concepts
                        .sort((a, b) => b.confidence - a.confidence)
                        .slice(0, 4)
                        .map((concept) => (
                          <ConceptCard
                            key={concept.id}
                            concept={concept}
                            onSelect={onConceptSelect}
                          />
                        ))}
                    </div>
                    {concepts.length > 4 && (
                      <div className="text-center mt-4">
                        <button
                          onClick={() => setActiveTab('concepts')}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View all {concepts.length} concepts {'->'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Concepts Tab */}
            {activeTab === 'concepts' && (
              <div>
                {/* Filters and Search */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search concepts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all">All Types</option>
                    <option value="topic">Topics</option>
                    <option value="skill">Skills</option>
                    <option value="fact">Facts</option>
                    <option value="procedure">Procedures</option>
                    <option value="principle">Principles</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="confidence">Sort by Confidence</option>
                    <option value="name">Sort by Name</option>
                    <option value="difficulty">Sort by Difficulty</option>
                    <option value="date">Sort by Date</option>
                  </select>
                </div>

                {/* Concepts Grid */}
                {filteredConcepts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <AcademicCapIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No concepts found</p>
                    <p className="text-sm mt-1">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredConcepts.map((concept) => (
                      <div
                        key={concept.id}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 space-y-2">
                            <input
                              aria-label="Concept name"
                              className="w-full text-lg font-medium bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                              value={edits[concept.id]?.name ?? concept.name}
                              onChange={(e) =>
                                setEdits((prev) => ({
                                  ...prev,
                                  [concept.id]: { ...prev[concept.id], name: e.target.value },
                                }))
                              }
                            />
                            <textarea
                              aria-label="Concept description"
                              className="w-full text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500"
                              value={edits[concept.id]?.description ?? concept.description}
                              onChange={(e) =>
                                setEdits((prev) => ({
                                  ...prev,
                                  [concept.id]: {
                                    ...prev[concept.id],
                                    description: e.target.value,
                                  },
                                }))
                              }
                              rows={2}
                            />
                            <div className="flex gap-2 items-center text-xs text-gray-500">
                              <label className="flex items-center gap-1">
                                Type:
                                <select
                                  value={edits[concept.id]?.type ?? concept.type}
                                  onChange={(e) =>
                                    setEdits((prev) => ({
                                      ...prev,
                                      [concept.id]: { ...prev[concept.id], type: e.target.value },
                                    }))
                                  }
                                  className="border rounded px-2 py-1 bg-white dark:bg-gray-900"
                                >
                                  <option value="topic">topic</option>
                                  <option value="skill">skill</option>
                                  <option value="fact">fact</option>
                                  <option value="procedure">procedure</option>
                                  <option value="principle">principle</option>
                                </select>
                              </label>
                              <span className="ml-2">
                                Confidence: {Math.round(concept.confidence * 100)}%
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            <select
                              aria-label="Concept action"
                              value={actions[concept.id] ?? 'insert'}
                              onChange={(e) =>
                                setActions((prev) => ({
                                  ...prev,
                                  [concept.id]: e.target.value as ConceptIngestionAction,
                                }))
                              }
                              className="px-2 py-1 text-xs border rounded bg-white dark:bg-gray-900"
                            >
                              <option value="insert">Insert</option>
                              <option value="overwrite">Overwrite</option>
                              <option value="skip">Skip</option>
                            </select>
                            <button
                              className="text-xs text-blue-600 hover:underline"
                              onClick={() => onConceptSelect?.(concept.id)}
                            >
                              View details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Relationships Tab */}
            {activeTab === 'relationships' && (
              <div>
                {relationships.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <FunnelIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No relationships found</p>
                    <p className="text-sm mt-1">
                      Relationship extraction will be available in future updates
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {relationships.map((relationship, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {relationship.targetConceptName || 'Unknown Concept'}
                            </span>
                            <span className="mx-2 text-gray-500">{'->'}</span>
                            <span className="text-sm text-blue-600 dark:text-blue-400">
                              {relationship.type}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {Math.round(relationship.strength * 100)}%
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">strength</div>
                          </div>
                        </div>
                        {relationship.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {relationship.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Statistics Tab */}
            {activeTab === 'statistics' && statistics && (
              <div className="space-y-6">
                {/* Distribution Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Confidence Distribution
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(statistics.confidenceDistribution).map(([level, count]) => (
                        <div key={level} className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400 w-16">
                            {level}
                          </span>
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 relative">
                            <div
                              className="bg-blue-600 h-4 rounded-full absolute"
                              style={{ width: `${(count / statistics.totalConcepts) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-8">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Difficulty Distribution
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(statistics.difficultyDistribution).map(([level, count]) => (
                        <div key={level} className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400 w-16">
                            Level {level}
                          </span>
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 relative">
                            <div
                              className="bg-green-600 h-4 rounded-full absolute"
                              style={{ width: `${(count / statistics.totalConcepts) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-8">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Token Usage */}
                {statistics.tokenUsage && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Token Usage
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600 dark:text-gray-400">
                            Total Tokens:
                          </dt>
                          <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {statistics.tokenUsage.total.toLocaleString()}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600 dark:text-gray-400">
                            Prompt Tokens:
                          </dt>
                          <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {statistics.tokenUsage.prompt.toLocaleString()}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600 dark:text-gray-400">
                            Completion Tokens:
                          </dt>
                          <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {statistics.tokenUsage.completion.toLocaleString()}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600 dark:text-gray-400">
                            Tracking Method:
                          </dt>
                          <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {statistics.tokenUsage.estimated ? 'Estimated' : 'Native LangChain'}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                )}

                {/* Model Usage */}
                {Object.keys(statistics.modelUsage).length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Model Usage
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <dl className="space-y-2">
                        {Object.entries(statistics.modelUsage).map(([model, usage]) => (
                          <div key={model} className="flex justify-between">
                            <dt className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                              {model.replace(/[-_]/g, ' ')}:
                            </dt>
                            <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {usage} requests
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                )}

                {/* Processing Errors */}
                {result.errors && result.errors.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Processing Notes
                    </h3>
                    <div className="space-y-2">
                      {result.errors.map((error, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            error.severity === 'high'
                              ? 'bg-red-50 border-red-200 text-red-800'
                              : error.severity === 'medium'
                                ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                                : 'bg-blue-50 border-blue-200 text-blue-800'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium uppercase">{error.severity}</span>
                            <span className="text-xs">{error.timestamp.toLocaleTimeString()}</span>
                          </div>
                          <p className="text-sm mt-1">{error.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Apply to Knowledge"
        message={`Apply ${confirmSummary.concepts} concepts and ${confirmSummary.relationships} relationships to knowledge?`}
        confirmText="Apply"
        cancelText="Keep editing"
        onConfirm={handleIngest}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingPayload(null);
          setPendingPlan(null);
        }}
      />
    </div>
  );
};
