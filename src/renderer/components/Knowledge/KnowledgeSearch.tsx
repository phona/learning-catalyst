import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { KnowledgeGraphModule, Concept } from '../../modules/knowledge-graph/knowledge-graph';

interface KnowledgeSearchProps {
  knowledgeGraph: KnowledgeGraphModule;
  onConceptSelect?: (concept: Concept) => void;
  className?: string;
}

const KnowledgeSearchComponent: React.FC<KnowledgeSearchProps> = ({
  knowledgeGraph,
  onConceptSelect,
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    conceptTypes: [] as string[],
    difficultyRange: [1, 5] as [number, number],
    masteryRange: [0, 5] as [number, number]
  });
  const [showFilters, setShowFilters] = useState(false);

  // Refs for cleanup and mounted state
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController>();

  const conceptTypes = ['topic', 'skill', 'fact', 'procedure', 'principle'];

  useEffect(() => {
    // Initialize mounted state
    isMountedRef.current = true;
    abortControllerRef.current = new AbortController();

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (query.trim()) {
      const timeoutId = setTimeout(() => {
        performSearch();
      }, 300); // Debounce search

      return () => clearTimeout(timeoutId);
    } else {
      setResults([]);
    }
  }, [query, selectedFilters]);

  const performSearch = useCallback(async () => {
    if (!query.trim() || !isMountedRef.current) {
      if (isMountedRef.current) {
        setResults([]);
      }
      return;
    }

    setLoading(true);
    try {
      // For now, use simple search with just the query and limit
      // TODO: Implement advanced filtering in the knowledge graph module
      const searchResults = await knowledgeGraph.searchConcepts(query.trim(), 20);

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setResults(searchResults);
      }
    } catch (error) {
      console.error('Search failed:', error);
      if (isMountedRef.current) {
        setResults([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [query, selectedFilters, knowledgeGraph]);

  const handleConceptClick = useCallback((concept: Concept) => {
    onConceptSelect?.(concept);
    setQuery('');
    setResults([]);
  }, [onConceptSelect]);

  const getConceptColor = useCallback((conceptType: Concept['conceptType']) => {
    const colors = {
      topic: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      skill: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      fact: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      procedure: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      principle: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
    };
    return colors[conceptType] || colors.topic;
  }, []);

  const getMasteryColor = useCallback((masteryLevel: number) => {
    if (masteryLevel >= 4) return 'text-green-600 dark:text-green-400';
    if (masteryLevel >= 3) return 'text-blue-600 dark:text-blue-400';
    if (masteryLevel >= 2) return 'text-yellow-600 dark:text-yellow-400';
    if (masteryLevel >= 1) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  }, []);

  const toggleConceptType = (type: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      conceptTypes: prev.conceptTypes.includes(type)
        ? prev.conceptTypes.filter(t => t !== type)
        : [...prev.conceptTypes, type]
    }));
  };

  const clearFilters = () => {
    setSelectedFilters({
      conceptTypes: [],
      difficultyRange: [1, 5],
      masteryRange: [0, 5]
    });
  };

  const hasActiveFilters = useMemo(() =>
    selectedFilters.conceptTypes.length > 0 ||
    selectedFilters.difficultyRange[0] !== 1 ||
    selectedFilters.difficultyRange[1] !== 5 ||
    selectedFilters.masteryRange[0] !== 0 ||
    selectedFilters.masteryRange[1] !== 5,
  [selectedFilters]
);

  return (
    <div className={`knowledge-search bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      {/* Search Input */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search concepts..."
          className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <svg className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
          {/* Concept Types */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Concept Types
            </label>
            <div className="flex flex-wrap gap-2">
              {conceptTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleConceptType(type)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    selectedFilters.conceptTypes.includes(type)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Range */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Difficulty: {selectedFilters.difficultyRange[0]} - {selectedFilters.difficultyRange[1]}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="5"
                value={selectedFilters.difficultyRange[0]}
                onChange={(e) => setSelectedFilters(prev => ({
                  ...prev,
                  difficultyRange: [parseInt(e.target.value), prev.difficultyRange[1]]
                }))}
                className="flex-1"
              />
              <input
                type="range"
                min="1"
                max="5"
                value={selectedFilters.difficultyRange[1]}
                onChange={(e) => setSelectedFilters(prev => ({
                  ...prev,
                  difficultyRange: [prev.difficultyRange[0], parseInt(e.target.value)]
                }))}
                className="flex-1"
              />
            </div>
          </div>

          {/* Mastery Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mastery: {selectedFilters.masteryRange[0]} - {selectedFilters.masteryRange[1]}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="5"
                value={selectedFilters.masteryRange[0]}
                onChange={(e) => setSelectedFilters(prev => ({
                  ...prev,
                  masteryRange: [parseInt(e.target.value), prev.masteryRange[1]]
                }))}
                className="flex-1"
              />
              <input
                type="range"
                min="0"
                max="5"
                value={selectedFilters.masteryRange[1]}
                onChange={(e) => setSelectedFilters(prev => ({
                  ...prev,
                  masteryRange: [prev.masteryRange[0], parseInt(e.target.value)]
                }))}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Search Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Found {results.length} concept{results.length !== 1 ? 's' : ''}
          </div>
          {results.map((concept) => (
            <div
              key={concept.id}
              onClick={() => handleConceptClick(concept)}
              className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {concept.name}
                  </h4>
                  {concept.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {concept.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getConceptColor(concept.conceptType)}`}>
                      {concept.conceptType}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Mastery:</span>
                      <span className={`text-xs font-medium ${getMasteryColor(concept.masteryLevel)}`}>
                        {concept.masteryLevel}/5
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Difficulty:</span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {concept.difficultyLevel}/5
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && query && results.length === 0 && (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No concepts found</p>
          <p className="text-sm">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
};

export const KnowledgeSearch = React.memo(KnowledgeSearchComponent);