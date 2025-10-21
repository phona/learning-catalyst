import React, { useState, useEffect } from 'react';
import { KnowledgeGraphModule, Concept, Relationship } from '../../modules/knowledge-graph/knowledge-graph';

interface RelationshipManagerProps {
  knowledgeGraph: KnowledgeGraphModule;
  selectedConcept?: Concept | null;
  onRelationshipCreated?: (relationship: Relationship) => void;
}

interface RelationshipFormData {
  sourceConceptId: string;
  targetConceptId: string;
  relationshipType: Relationship['relationshipType'];
  strength: number;
  description: string;
}

export const RelationshipManager: React.FC<RelationshipManagerProps> = ({
  knowledgeGraph,
  selectedConcept,
  onRelationshipCreated
}) => {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [existingRelationships, setExistingRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<RelationshipFormData>({
    sourceConceptId: '',
    targetConceptId: '',
    relationshipType: 'related',
    strength: 0.5,
    description: ''
  });

  useEffect(() => {
    loadConcepts();
    if (selectedConcept) {
      setFormData(prev => ({ ...prev, sourceConceptId: selectedConcept.id }));
      loadRelationships(selectedConcept.id);
    }
  }, [selectedConcept, knowledgeGraph]);

  const loadConcepts = async () => {
    try {
      const conceptList = await knowledgeGraph.searchConcepts({ limit: 100 });
      setConcepts(conceptList);
    } catch (err) {
      console.error('Failed to load concepts:', err);
    }
  };

  const loadRelationships = async (conceptId: string) => {
    try {
      const relationships = await knowledgeGraph.getRelationships(conceptId);
      setExistingRelationships(relationships);
    } catch (err) {
      console.error('Failed to load relationships:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.sourceConceptId || !formData.targetConceptId) {
      setError('Please select both source and target concepts');
      return;
    }

    if (formData.sourceConceptId === formData.targetConceptId) {
      setError('Source and target concepts cannot be the same');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const relationship = await knowledgeGraph.createRelationship(
        formData.sourceConceptId,
        formData.targetConceptId,
        formData.relationshipType,
        formData.strength,
        formData.description || undefined
      );

      onRelationshipCreated?.(relationship);

      // Reset form but keep source concept
      setFormData(prev => ({
        ...prev,
        targetConceptId: '',
        relationshipType: 'related',
        strength: 0.5,
        description: ''
      }));

      // Reload relationships if we have a selected concept
      if (selectedConcept) {
        await loadRelationships(selectedConcept.id);
      }

      console.log('Relationship created successfully:', relationship);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create relationship');
    } finally {
      setLoading(false);
    }
  };

  const deleteRelationship = async (relationshipId: string) => {
    if (!confirm('Are you sure you want to delete this relationship?')) {
      return;
    }

    try {
      const success = await knowledgeGraph.deleteRelationship(relationshipId);

      if (success) {
        console.log('Relationship deleted successfully:', relationshipId);

        // Reload relationships
        if (selectedConcept) {
          await loadRelationships(selectedConcept.id);
        }
      } else {
        console.error('Failed to delete relationship: Not found');
      }
    } catch (err) {
      console.error('Failed to delete relationship:', err);
    }
  };

  const getRelationshipTypeColor = (type: Relationship['relationshipType']) => {
    const colors = {
      prerequisite: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      related: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      contains: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      example: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      application: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
      contrasts: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
    };
    return colors[type] || colors.related;
  };

  const getRelationshipTypeLabel = (type: Relationship['relationshipType']) => {
    const labels = {
      prerequisite: 'Prerequisite',
      related: 'Related',
      contains: 'Contains',
      example: 'Example',
      application: 'Application',
      contrasts: 'Contrasts'
    };
    return labels[type] || type;
  };

  const getConceptById = (conceptId: string) => {
    return concepts.find(c => c.id === conceptId);
  };

  return (
    <div className="relationship-manager bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Relationship Manager
        </h3>
        {selectedConcept && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Managing relationships for: <span className="font-medium">{selectedConcept.name}</span>
          </p>
        )}
      </div>

      {/* Create Relationship Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="source-concept" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Source Concept
            </label>
            <select
              id="source-concept"
              value={formData.sourceConceptId}
              onChange={(e) => setFormData(prev => ({ ...prev, sourceConceptId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              disabled={loading}
            >
              <option value="">Select source concept</option>
              {concepts.map(concept => (
                <option key={concept.id} value={concept.id}>
                  {concept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="target-concept" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Concept
            </label>
            <select
              id="target-concept"
              value={formData.targetConceptId}
              onChange={(e) => setFormData(prev => ({ ...prev, targetConceptId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              disabled={loading}
            >
              <option value="">Select target concept</option>
              {concepts
                .filter(concept => concept.id !== formData.sourceConceptId)
                .map(concept => (
                  <option key={concept.id} value={concept.id}>
                    {concept.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="relationship-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Relationship Type
            </label>
            <select
              id="relationship-type"
              value={formData.relationshipType}
              onChange={(e) => setFormData(prev => ({ ...prev, relationshipType: e.target.value as Relationship['relationshipType'] }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              disabled={loading}
            >
              <option value="related">Related</option>
              <option value="prerequisite">Prerequisite</option>
              <option value="contains">Contains</option>
              <option value="example">Example</option>
              <option value="application">Application</option>
              <option value="contrasts">Contrasts</option>
            </select>
          </div>

          <div>
            <label htmlFor="relationship-strength" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Strength: {formData.strength.toFixed(1)}
            </label>
            <input
              id="relationship-strength"
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={formData.strength}
              onChange={(e) => setFormData(prev => ({ ...prev, strength: parseFloat(e.target.value) }))}
              className="w-full"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="relationship-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description (optional)
          </label>
          <input
            id="relationship-description"
            type="text"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            placeholder="Describe this relationship"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !formData.sourceConceptId || !formData.targetConceptId}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          {loading ? 'Creating...' : 'Create Relationship'}
        </button>
      </form>

      {/* Existing Relationships */}
      {selectedConcept && existingRelationships.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Existing Relationships ({existingRelationships.length})
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {existingRelationships.map((relationship) => {
              const isSource = relationship.sourceConceptId === selectedConcept.id;
              const relatedConceptId = isSource ? relationship.targetConceptId : relationship.sourceConceptId;
              const relatedConcept = getConceptById(relatedConceptId);

              return (
                <div
                  key={relationship.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {selectedConcept.name}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {isSource ? '→' : '←'}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {relatedConcept?.name || 'Unknown'}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getRelationshipTypeColor(relationship.relationshipType)}`}>
                      {getRelationshipTypeLabel(relationship.relationshipType)}
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="w-12 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${relationship.strength * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {(relationship.strength * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteRelationship(relationship.id)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    title="Delete relationship"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedConcept && existingRelationships.length === 0 && (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p>No relationships found for this concept</p>
          <p className="text-sm">Create your first relationship above</p>
        </div>
      )}
    </div>
  );
};