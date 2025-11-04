import React, { useState } from 'react';
import { KnowledgeGraphModule, Concept } from '../../modules/knowledge-graph/knowledge-graph';

interface ConceptManagerProps {
  knowledgeGraph: KnowledgeGraphModule;
  onConceptCreated?: (concept: Concept) => void;
  onConceptUpdated?: (concept: Concept) => void;
}

interface ConceptFormData {
  name: string;
  description: string;
  conceptType: Concept['conceptType'];
  difficultyLevel: Concept['difficultyLevel'];
  masteryLevel: Concept['masteryLevel'];
  tags: string[];
  metadata: Record<string, any>;
}

export const ConceptManager: React.FC<ConceptManagerProps> = ({
  knowledgeGraph,
  onConceptCreated,
  onConceptUpdated
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingConcept, setEditingConcept] = useState<Concept | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ConceptFormData>({
    name: '',
    description: '',
    conceptType: 'topic',
    difficultyLevel: 3,
    masteryLevel: 0,
    tags: [],
    metadata: {}
  });

  const [tagInput, setTagInput] = useState('');

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      conceptType: 'topic',
      difficultyLevel: 3,
      masteryLevel: 0,
      tags: [],
      metadata: {}
    });
    setTagInput('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Concept name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editingConcept) {
        // Update existing concept
        const updated = await knowledgeGraph.updateConcept(editingConcept.id, formData);
        if (updated) {
          onConceptUpdated?.(updated);
          setEditingConcept(null);
          resetForm();
        }
      } else {
        // Create new concept
        const newConcept = await knowledgeGraph.createConcept(formData);
        onConceptCreated?.(newConcept);
        setIsCreating(false);
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save concept');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (concept: Concept) => {
    setEditingConcept(concept);
    setFormData({
      name: concept.name,
      description: concept.description || '',
      conceptType: concept.conceptType,
      difficultyLevel: concept.difficultyLevel,
      masteryLevel: concept.masteryLevel,
      tags: concept.tags,
      metadata: concept.metadata
    });
  };

  const cancelEdit = () => {
    setEditingConcept(null);
    resetForm();
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="concept-manager bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {editingConcept ? 'Edit Concept' : 'Concept Manager'}
        </h2>
        {!isCreating && !editingConcept && (
          <button
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Create Concept
          </button>
        )}
      </div>

      {(isCreating || editingConcept) && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="concept-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Concept Name *
            </label>
            <input
              id="concept-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              placeholder="Enter concept name"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="concept-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="concept-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              placeholder="Describe this concept"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="concept-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                id="concept-type"
                value={formData.conceptType}
                onChange={(e) => setFormData(prev => ({ ...prev, conceptType: e.target.value as Concept['conceptType'] }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                disabled={loading}
              >
                <option value="topic">Topic</option>
                <option value="skill">Skill</option>
                <option value="fact">Fact</option>
                <option value="procedure">Procedure</option>
                <option value="principle">Principle</option>
              </select>
            </div>

            <div>
              <label htmlFor="concept-difficulty" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Difficulty Level
              </label>
              <select
                id="concept-difficulty"
                value={formData.difficultyLevel}
                onChange={(e) => setFormData(prev => ({ ...prev, difficultyLevel: Number(e.target.value) as Concept['difficultyLevel'] }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                disabled={loading}
              >
                <option value={1}>1 - Very Easy</option>
                <option value={2}>2 - Easy</option>
                <option value={3}>3 - Medium</option>
                <option value={4}>4 - Hard</option>
                <option value={5}>5 - Very Hard</option>
              </select>
            </div>

            <div>
              <label htmlFor="concept-mastery" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mastery Level
              </label>
              <select
                id="concept-mastery"
                value={formData.masteryLevel}
                onChange={(e) => setFormData(prev => ({ ...prev, masteryLevel: Number(e.target.value) as Concept['masteryLevel'] }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                disabled={loading}
              >
                <option value={0}>0 - Not Started</option>
                <option value={1}>1 - Beginner</option>
                <option value={2}>2 - Novice</option>
                <option value={3}>3 - Intermediate</option>
                <option value={4}>4 - Advanced</option>
                <option value={5}>5 - Expert</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="concept-tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                id="concept-tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Add a tag and press Enter"
                disabled={loading}
              />
              <button
                type="button"
                onClick={addTag}
                disabled={loading}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Add
              </button>
            </div>

            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm px-3 py-1 rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                      disabled={loading}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                cancelEdit();
              }}
              disabled={loading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              {loading ? 'Saving...' : (editingConcept ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};