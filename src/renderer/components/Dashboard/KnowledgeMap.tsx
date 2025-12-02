import React, { useState } from 'react';
import { KnowledgeGameMap, ConceptManager, RelationshipManager } from '../Knowledge';
import type { Concept } from '../../../shared/types/knowledge';

export const KnowledgeMap: React.FC = () => {
  // TODO: Refactor to use IPC-based knowledge service
  // This component should use window.electronAPI.knowledge methods for communication
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [showManager, setShowManager] = useState(false);
  const [activeTab, setActiveTab] = useState<'concepts' | 'relationships'>('concepts');

  const handleConceptSelect = (concept: Concept): void => {
    setSelectedConcept(concept);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Knowledge Map</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Explore connections between concepts and track your learning progress
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowManager(true);
              setActiveTab('concepts');
            }}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Manage
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Knowledge Graph Visualization */}
        <div
          className={`flex-1 flex flex-col ${showManager ? 'border-r border-gray-200 dark:border-gray-700' : ''}`}
        >
          <div className="flex-1 h-full p-6 overflow-hidden">
            <KnowledgeGameMap onConceptSelect={handleConceptSelect} className="h-full" />
          </div>
        </div>
      </div>

      {/* Management Dialog */}
      {showManager && (
        <div
          className="fixed inset-0 z-30 flex items-start md:items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Manage concepts and relationships"
          data-testid="manager-dialog"
          onClick={() => setShowManager(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl mx-4 mt-16 md:mt-0 border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Manage Knowledge</h2>
                <div className="flex rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setActiveTab('concepts')}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      activeTab === 'concepts'
                        ? 'bg-blue-600 text-white'
                        : 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Concepts
                  </button>
                  <button
                    onClick={() => setActiveTab('relationships')}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      activeTab === 'relationships'
                        ? 'bg-blue-600 text-white'
                        : 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Relationships
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowManager(false)}
                className="text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
              >
                Close
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto px-6 py-5">
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
        </div>
      )}

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
export default KnowledgeMap;
