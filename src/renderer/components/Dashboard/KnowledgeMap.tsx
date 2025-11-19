
import React, { useState } from 'react';
import { KnowledgeGraphVisualization, ConceptManager, RelationshipManager, KnowledgeSearch } from '../Knowledge';
import type { Concept } from '../../../shared/types/knowledge';

export const KnowledgeMap: React.FC = () => {
  // TODO: Refactor to use IPC-based knowledge service
  // This component should use window.electronAPI.knowledge methods for communication
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [showManager, setShowManager] = useState(false);
  const [activeTab, setActiveTab] = useState<'concepts' | 'relationships'>('concepts');

  const handleConceptSelect = (conceptId: string): void => {
    // TODO: Get concept from IPC when implementing full functionality
    console.log('Selected concept ID:', conceptId);
  };

  const handleConceptCreated = (concept: Concept): void => {
    console.log('Concept created:', concept);
    setSelectedConcept(concept);
  };

  const handleConceptUpdated = (concept: Concept): void => {
    console.log('Concept updated:', concept);
    if (selectedConcept?.id === concept.id) {
      setSelectedConcept(concept);
    }
  };

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
              onConceptSelect={handleConceptSelect}
            />
          </div>
        </div>

        {/* Knowledge Graph Visualization */}
        <div className={`flex-1 ${showManager ? 'border-r border-gray-200 dark:border-gray-700' : ''}`}>
          <div className="h-full p-6">
            <KnowledgeGraphVisualization
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
                  onConceptCreated={handleConceptCreated}
                  onConceptUpdated={handleConceptUpdated}
                />
              )}
              {activeTab === 'relationships' && (
                <RelationshipManager
                  selectedConcept={selectedConcept}
                  onRelationshipCreated={(relationship) => {
                    console.log('Relationship created:', relationship);
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