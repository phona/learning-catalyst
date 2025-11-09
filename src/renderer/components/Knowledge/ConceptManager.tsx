import React from 'react';
import type { Concept } from '../../../shared/types/knowledge';

// TODO: Refactor to use IPC-based knowledge service
// This component should use window.electronAPI.knowledge methods for communication
interface ConceptManagerProps {
  onConceptCreated?: (concept: Concept) => void;
  onConceptUpdated?: (concept: Concept) => void;
}

export const ConceptManager: React.FC<ConceptManagerProps> = ({
  onConceptCreated,
  onConceptUpdated
}) => {
  return (
    <div className="concept-manager bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="text-center text-gray-600 dark:text-gray-400">
        <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <h3 className="text-lg font-medium mb-2">Concept Manager</h3>
        <p className="text-sm">This component needs to be refactored to use IPC-based communication</p>
        <p className="text-xs mt-1">Use window.electronAPI.knowledge methods for data access</p>
      </div>
    </div>
  );
};