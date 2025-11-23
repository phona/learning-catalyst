import React from 'react';
import type { Concept, ConceptRelationship as Relationship } from '../../../shared/types/knowledge';

// TODO: Refactor to use IPC-based knowledge service
// This component should use window.electronAPI.knowledge methods for communication
interface RelationshipManagerProps {
  selectedConcept?: Concept | null;
  onRelationshipCreated?: (relationship: Relationship) => void;
}

export const RelationshipManager: React.FC<RelationshipManagerProps> = ({
  selectedConcept: _selectedConcept,
  onRelationshipCreated: _onRelationshipCreated,
}) => {
  return (
    <div className="relationship-manager bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="text-center text-gray-600 dark:text-gray-400">
        <svg
          className="w-12 h-12 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        <h3 className="text-lg font-medium mb-2">Relationship Manager</h3>
        <p className="text-sm">
          This component needs to be refactored to use IPC-based communication
        </p>
        <p className="text-xs mt-1">Use window.electronAPI.knowledge methods for data access</p>
      </div>
    </div>
  );
};
