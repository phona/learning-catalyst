import React, { useState, useEffect } from 'react';
import { KnowledgeGraphVisualization, ConceptManager, RelationshipManager, KnowledgeSearch } from '../Knowledge';
import { KnowledgeGraphModule, Concept } from '../../modules/knowledge-graph/knowledge-graph';
import { getKnowledgeGraph } from '../../services/factory';

export const KnowledgeMap: React.FC = () => {
  const [knowledgeGraph, setKnowledgeGraph] = useState<KnowledgeGraphModule | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [showManager, setShowManager] = useState(false);
  const [activeTab, setActiveTab] = useState<'concepts' | 'relationships'>('concepts');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setupKnowledgeGraph();
  }, []);

  const setupKnowledgeGraph = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[KnowledgeMap] Getting knowledge graph from factory...');
      // Get shared knowledge graph instance from factory (assumed already initialized at root)
      const kg = getKnowledgeGraph();
      await kg.start();
      setKnowledgeGraph(kg);

      console.log('Knowledge graph setup successfully with shared instance from factory');
    } catch (err) {
      console.error('Failed to setup knowledge graph:', err);
      setError(err instanceof Error ? err.message : 'Failed to setup knowledge graph');
    } finally {
      setLoading(false);
    }
  };

  const handleConceptSelect = (concept: Concept) => {
    setSelectedConcept(concept);
  };

  const handleConceptCreated = (concept: Concept) => {
    console.log('Concept created:', concept);
    // Note: Visualization will refresh automatically through data updates
  };

  const handleConceptUpdated = (concept: Concept) => {
    console.log('Concept updated:', concept);
    if (selectedConcept?.id === concept.id) {
      setSelectedConcept(concept);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Initializing Knowledge Graph
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Setting up your learning knowledge base...
          </p>
        </div>
      </div>
    );
  }

  if (error || !knowledgeGraph) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
            Knowledge Graph Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error || 'Failed to initialize the knowledge graph module'}
          </p>
          <button
            onClick={initializeKnowledgeGraph}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Knowledge Map
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Explore connections between concepts and track your learning progress
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowManager(!showManager);
              if (!showManager) setActiveTab('concepts');
            }}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              showManager
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {showManager ? 'Hide Manager' : 'Manage'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Search Sidebar */}
        <div className="w-80 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4">
            <KnowledgeSearch
              knowledgeGraph={knowledgeGraph}
              onConceptSelect={handleConceptSelect}
            />
          </div>
        </div>

        {/* Knowledge Graph Visualization */}
        <div className={`flex-1 ${showManager ? 'border-r border-gray-200 dark:border-gray-700' : ''}`}>
          <div className="h-full p-6">
            <KnowledgeGraphVisualization
              knowledgeGraph={knowledgeGraph}
              onConceptSelect={handleConceptSelect}
            />
          </div>
        </div>

        {/* Management Sidebar */}
        {showManager && (
          <div className="w-96 overflow-y-auto bg-gray-50 dark:bg-gray-800">
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('concepts')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'concepts'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  Concepts
                </button>
                <button
                  onClick={() => setActiveTab('relationships')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'relationships'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  Relationships
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'concepts' && (
                <ConceptManager
                  knowledgeGraph={knowledgeGraph}
                  onConceptCreated={handleConceptCreated}
                  onConceptUpdated={handleConceptUpdated}
                />
              )}
              {activeTab === 'relationships' && (
                <RelationshipManager
                  knowledgeGraph={knowledgeGraph}
                  selectedConcept={selectedConcept}
                  onRelationshipCreated={(relationship) => {
                    console.log('Relationship created:', relationship);
                    // Note: Visualization will refresh automatically through data updates
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Concept Footer */}
      {selectedConcept && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Selected: {selectedConcept.name}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {selectedConcept.conceptType} • Mastery {selectedConcept.masteryLevel}/5
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowManager(true);
                  setActiveTab('concepts');
                }}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
              >
                Edit Concept
              </button>
              <button
                onClick={() => {
                  setShowManager(true);
                  setActiveTab('relationships');
                }}
                className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 text-sm font-medium"
              >
                Manage Relationships
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};