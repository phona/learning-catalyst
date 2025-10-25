import React, { useState, useEffect, useMemo, useRef } from 'react';
import { KnowledgeGraphModule, Concept, Relationship, ConceptPath } from '../../modules/knowledge-graph/knowledge-graph';

interface KnowledgeGraphProps {
  knowledgeGraph: KnowledgeGraphModule;
  onConceptSelect?: (concept: Concept) => void;
  className?: string;
}

interface GraphNode {
  id: string;
  concept: Concept;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GraphEdge {
  source: GraphNode;
  target: GraphNode;
  relationship: Relationship;
}

export const KnowledgeGraphVisualization: React.FC<KnowledgeGraphProps> = ({
  knowledgeGraph,
  onConceptSelect,
  className = ''
}) => {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Concept[]>([]);
  const [learningPath, setLearningPath] = useState<ConceptPath | null>(null);
  const [pathStartConcept, setPathStartConcept] = useState<Concept | null>(null);
  const [nextConcepts, setNextConcepts] = useState<Concept[]>([]);

  // Simple force-directed layout state
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);

  // Refs for cleanup and mounted state
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController>();
  const svgContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create new abort controller for this component instance
    abortControllerRef.current = new AbortController();
    isMountedRef.current = true;

    loadKnowledgeGraph();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
      cleanupSVGElements();
      resetState();
    };
  }, [knowledgeGraph]);

  // Cleanup SVG elements and event listeners
  const cleanupSVGElements = () => {
    if (svgContainerRef.current) {
      const svgElement = svgContainerRef.current.querySelector('svg');
      if (svgElement) {
        // Remove all event listeners by cloning the node
        const newSvg = svgElement.cloneNode(true);
        svgElement.parentNode?.replaceChild(newSvg, svgElement);
      }
    }
  };

  // Reset all state to prevent memory leaks
  const resetState = () => {
    setConcepts([]);
    setRelationships([]);
    setNodes([]);
    setEdges([]);
    setSelectedConcept(null);
    setSearchResults([]);
    setLearningPath(null);
    setPathStartConcept(null);
    setNextConcepts([]);
    setSearchQuery('');
  };

  const loadKnowledgeGraph = async () => {
    if (!isMountedRef.current) return;

    try {
      setLoading(true);
      setError(null);

      // Load concepts with limit to avoid performance issues
      const loadedConcepts = await knowledgeGraph.searchConcepts({ limit: 50 });
      if (!isMountedRef.current || abortControllerRef.current?.signal.aborted) return;

      setConcepts(loadedConcepts);

      // Load relationships for these concepts
      const allRelationships: Relationship[] = [];
      for (const concept of loadedConcepts) {
        if (!isMountedRef.current || abortControllerRef.current?.signal.aborted) break;

        const conceptRelationships = await knowledgeGraph.getRelationships(concept.id);
        allRelationships.push(...conceptRelationships);
      }

      if (!isMountedRef.current || abortControllerRef.current?.signal.aborted) return;

      setRelationships(allRelationships);

      // Initialize simple layout
      initializeLayout(loadedConcepts, allRelationships);
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load knowledge graph');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const initializeLayout = (conceptList: Concept[], relationshipList: Relationship[]) => {
    // Create nodes in a simple circular layout
    const nodeMap = new Map<string, GraphNode>();
    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    conceptList.forEach((concept, index) => {
      const angle = (index / conceptList.length) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      nodeMap.set(concept.id, {
        id: concept.id,
        concept,
        x,
        y,
        vx: 0,
        vy: 0
      });
    });

    // Create edges
    const edgeList: GraphEdge[] = relationshipList
      .filter(rel => nodeMap.has(rel.sourceConceptId) && nodeMap.has(rel.targetConceptId))
      .map(rel => ({
        source: nodeMap.get(rel.sourceConceptId)!,
        target: nodeMap.get(rel.targetConceptId)!,
        relationship: rel
      }));

    setNodes(Array.from(nodeMap.values()));
    setEdges(edgeList);
  };

  const handleConceptClick = (concept: Concept) => {
    setSelectedConcept(concept);
    onConceptSelect?.(concept);
    loadNextConcepts(concept.id);
  };

  const handleSearch = async (query: string) => {
    if (!isMountedRef.current) return;

    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await knowledgeGraph.searchConcepts({
        query,
        limit: 10
      });

      if (isMountedRef.current) {
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Search error:', error);
      if (isMountedRef.current) {
        setSearchResults([]);
      }
    }
  };

  const showLearningPath = async (concept: Concept) => {
    if (!isMountedRef.current) return;

    if (!pathStartConcept) {
      setPathStartConcept(concept);
      return;
    }

    if (pathStartConcept.id === concept.id) {
      setPathStartConcept(null);
      setLearningPath(null);
      return;
    }

    try {
      const path = await knowledgeGraph.findPath(pathStartConcept.id, concept.id);
      if (isMountedRef.current) {
        setLearningPath(path);
      }
    } catch (error) {
      console.error('Error finding learning path:', error);
      if (isMountedRef.current) {
        setLearningPath(null);
      }
    }
  };

  const loadNextConcepts = async (conceptId: string) => {
    if (!isMountedRef.current) return;

    try {
      const next = await knowledgeGraph.getNextLearningConcepts(conceptId, 5);
      if (isMountedRef.current) {
        setNextConcepts(next);
      }
    } catch (error) {
      console.error('Error loading next concepts:', error);
      if (isMountedRef.current) {
        setNextConcepts([]);
      }
    }
  };

  const getConceptColor = (concept: Concept) => {
    const colors = {
      topic: 'bg-blue-500',
      skill: 'bg-green-500',
      fact: 'bg-yellow-500',
      procedure: 'bg-purple-500',
      principle: 'bg-red-500'
    };
    return colors[concept.conceptType] || 'bg-gray-500';
  };

  const getMasterySize = (masteryLevel: number) => {
    // Size based on mastery level (0-5)
    const baseSize = 30;
    const sizeMultiplier = 1 + (masteryLevel / 5) * 0.5;
    return baseSize * sizeMultiplier;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading knowledge graph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600 dark:text-red-400">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>Error loading knowledge graph: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`knowledge-graph-container relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Search Bar */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="relative">
          <input
            type="text"
            placeholder="Search concepts (semantic search enabled)..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-2 pl-10 pr-4 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="absolute top-12 left-0 right-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map((concept) => (
              <div
                key={concept.id}
                onClick={() => {
                  setSelectedConcept(concept);
                  setSearchResults([]);
                  setSearchQuery('');
                }}
                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0"
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">{concept.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{concept.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Learning Path Info */}
      {pathStartConcept && (
        <div className="absolute top-20 left-4 z-10 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 max-w-sm">
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <div className="font-medium">Learning Path Mode</div>
            <div>From: <strong>{pathStartConcept.name}</strong></div>
            <div>Click another concept to find path, or click {pathStartConcept.name} again to cancel.</div>
          </div>
        </div>
      )}

      {/* SVG for graph visualization */}
      <div ref={svgContainerRef}>
        <svg width="100%" height="600" className="rounded-lg">
        {/* Render learning path first (so it appears on top) */}
        {learningPath && learningPath.concepts.map((concept, index) => {
          const currentNode = nodes.find(n => n.id === concept.id);
          const nextNode = learningPath.concepts[index + 1]
            ? nodes.find(n => n.id === learningPath.concepts[index + 1].id)
            : null;

          if (!currentNode) return null;

          return (
            <g key={`path-${index}`}>
              {/* Draw path to next concept */}
              {nextNode && (
                <line
                  x1={currentNode.x}
                  y1={currentNode.y}
                  x2={nextNode.x}
                  y2={nextNode.y}
                  stroke="#3B82F6"
                  strokeWidth="4"
                  strokeOpacity={0.8}
                  strokeDasharray="5,5"
                />
              )}
              {/* Highlight path nodes */}
              <circle
                cx={currentNode.x}
                cy={currentNode.y}
                r={getMasterySize(currentNode.concept.masteryLevel) + 4}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="3"
                className="animate-pulse"
              />
              {/* Step number */}
              <circle
                cx={currentNode.x + getMasterySize(currentNode.concept.masteryLevel)}
                cy={currentNode.y - getMasterySize(currentNode.concept.masteryLevel)}
                r="10"
                fill="#3B82F6"
              />
              <text
                x={currentNode.x + getMasterySize(currentNode.concept.masteryLevel)}
                y={currentNode.y - getMasterySize(currentNode.concept.masteryLevel) + 3}
                fill="white"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                className="pointer-events-none"
              >
                {index + 1}
              </text>
            </g>
          );
        })}

        {/* Render edges first (so they appear behind nodes) */}
        {edges.map((edge, index) => (
          <g key={`edge-${index}`}>
            <line
              x1={edge.source.x}
              y1={edge.source.y}
              x2={edge.target.x}
              y2={edge.target.y}
              stroke="#9CA3AF"
              strokeWidth={Math.max(1, edge.relationship.strength * 3)}
              strokeOpacity={0.6}
            />
            {/* Relationship label */}
            {edge.relationship.strength > 0.7 && (
              <text
                x={(edge.source.x + edge.target.x) / 2}
                y={(edge.source.y + edge.target.y) / 2}
                fill="#6B7280"
                fontSize="10"
                textAnchor="middle"
                className="pointer-events-none"
              >
                {edge.relationship.relationshipType}
              </text>
            )}
          </g>
        ))}

        {/* Render nodes */}
        {nodes.map((node) => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={getMasterySize(node.concept.masteryLevel)}
              className={`${getConceptColor(node.concept)} cursor-pointer hover:opacity-80 transition-opacity`}
              fill="currentColor"
              stroke={selectedConcept?.id === node.id ? '#1F2937' : '#E5E7EB'}
              strokeWidth={selectedConcept?.id === node.id ? 3 : 2}
              onClick={() => handleConceptClick(node.concept)}
            />
            <text
              x={node.x}
              y={node.y + 5}
              fill="white"
              fontSize="12"
              fontWeight="bold"
              textAnchor="middle"
              className="pointer-events-none select-none"
            >
              {node.concept.name.length > 12
                ? node.concept.name.substring(0, 10) + '...'
                : node.concept.name}
            </text>
          </g>
        ))}
        </svg>
      </div>

      {/* Selected concept details */}
      {selectedConcept && (
        <div className="absolute top-4 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {selectedConcept.name}
            </h3>
            <button
              onClick={() => setSelectedConcept(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Type:</span>
              <span className="capitalize text-gray-900 dark:text-gray-100">{selectedConcept.conceptType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Mastery:</span>
              <div className="flex items-center">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 w-16 mr-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(selectedConcept.masteryLevel / 5) * 100}%` }}
                  />
                </div>
                <span className="text-gray-900 dark:text-gray-100">{selectedConcept.masteryLevel}/5</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Difficulty:</span>
              <span className="text-gray-900 dark:text-gray-100">{selectedConcept.difficultyLevel}/5</span>
            </div>
            {selectedConcept.description && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Description:</span>
                <p className="text-gray-900 dark:text-gray-100 mt-1">{selectedConcept.description}</p>
              </div>
            )}
            {selectedConcept.tags.length > 0 && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Tags:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedConcept.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Learning Actions */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">Learning Actions</div>
              <div className="space-y-2">
                <button
                  onClick={() => showLearningPath(selectedConcept)}
                  className={`w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                    pathStartConcept?.id === selectedConcept.id
                      ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                      : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800'
                  }`}
                >
                  {pathStartConcept?.id === selectedConcept.id ? 'Cancel Path' : 'Find Learning Path'}
                </button>
              </div>
            </div>

            {/* Next Learning Concepts */}
            {nextConcepts.length > 0 && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Suggested Next Concepts
                </div>
                <div className="space-y-1">
                  {nextConcepts.map((concept, index) => (
                    <div
                      key={concept.id}
                      onClick={() => handleConceptClick(concept)}
                      className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                    >
                      <div className="font-medium text-green-800 dark:text-green-200 text-sm">
                        {index + 1}. {concept.name}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        {concept.conceptType} • Difficulty: {concept.difficultyLevel}/5
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Learning Path Display */}
            {learningPath && learningPath.concepts.some(c => c.id === selectedConcept.id) && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Learning Path Details
                </div>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <div>Steps: {learningPath.concepts.length}</div>
                  <div>Path Strength: {(learningPath.totalStrength * 100).toFixed(1)}%</div>
                  <div>Average Difficulty: {learningPath.difficulty.toFixed(1)}/5</div>
                  <div className="pt-2">
                    <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">Path:</div>
                    {learningPath.concepts.map((concept, index) => (
                      <div key={concept.id} className="flex items-center">
                        <span className="w-4 h-4 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center mr-2">
                          {index + 1}
                        </span>
                        <span className={concept.id === selectedConcept.id ? 'font-medium text-blue-600 dark:text-blue-400' : ''}>
                          {concept.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Graph statistics */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <div>Concepts: {concepts.length}</div>
          <div>Relationships: {relationships.length}</div>
        </div>
      </div>
    </div>
  );
};