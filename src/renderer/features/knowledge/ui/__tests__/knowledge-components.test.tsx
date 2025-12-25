import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { ConceptManager } from '../ConceptManager';
import { KnowledgeSearch } from '../KnowledgeSearch';
import { RelationshipManager } from '../RelationshipManager';
import { KnowledgeGraphVisualization } from '../KnowledgeGraphVisualization';
import { renderWithServices } from '@/test/utils/test-providers.helpers';
import { createMockElectronAPIClient } from '@/renderer/services/api/electron-api-client';

describe('Knowledge components placeholders', () => {
  it('renders KnowledgeSearch placeholder copy with optional className', () => {
    renderWithServices(<KnowledgeSearch className="extra-class" />);

    expect(screen.getByText(/Knowledge Search/i)).toBeInTheDocument();
    expect(
      screen.getByText(/needs to be refactored to use IPC-based communication/i),
    ).toBeInTheDocument();
    // className should make it through to the container
    expect(screen.getByText(/Knowledge Search/i).closest('.knowledge-search')?.className).toContain(
      'extra-class',
    );
  });

  it('creates relationship and lists existing ones', async () => {
    const client = createMockElectronAPIClient();
    client.knowledge.getKnowledgeMap = vi.fn().mockResolvedValue({
      success: true,
      data: {
        nodes: [
          { id: 'a', label: 'Alpha', x: 0, y: 0, size: 1, color: '#000', category: 'topic' },
          { id: 'b', label: 'Beta', x: 0, y: 0, size: 1, color: '#000', category: 'skill' },
        ],
        edges: [],
        layout: 'force-directed',
        clusters: [],
        metadata: { totalNodes: 2, totalEdges: 0, centerConcepts: [], learningPaths: [] },
      },
    });
    client.knowledge.getRelatedConcepts = vi.fn().mockResolvedValue({
      success: true,
      data: {
        conceptId: 'a',
        relatedConcepts: [{ id: 'b', name: 'Beta', relationship: 'related', strength: 0.5, description: 'existing' }],
        totalConnections: 1,
        strongestConnection: 'Beta',
        categories: ['related'],
        learningPaths: [],
      },
    });
    client.knowledge.ingestConcepts = vi.fn().mockResolvedValue({ success: true });

    const onCreated = vi.fn();
    renderWithServices(
      <RelationshipManager
        selectedConcept={{ id: 'a', name: 'Alpha', conceptType: 'topic', masteryLevel: 1, difficultyLevel: 3, tags: [], metadata: {}, createdAt: new Date(), updatedAt: new Date(), reviewCount: 0 }}
        onRelationshipCreated={onCreated}
      />,
      { electronAPI: client },
    );

    await waitFor(() => expect(client.knowledge.getKnowledgeMap).toHaveBeenCalled());
    await waitFor(() => expect(client.knowledge.getRelatedConcepts).toHaveBeenCalled());

    // Source should auto-fill with selected concept
    expect((screen.getByLabelText(/Source concept/i) as HTMLSelectElement).value).toBe('a');

    fireEvent.change(screen.getByLabelText(/Target concept/i), { target: { value: 'b' } });
    fireEvent.click(screen.getByText(/Add relationship/i));

    await waitFor(() => expect(client.knowledge.ingestConcepts).toHaveBeenCalled());
    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({ sourceConceptId: 'a', targetConceptId: 'b', type: 'related' }),
    );
  });

  it('renders KnowledgeGraphVisualization with loaded data', async () => {
    const client = createMockElectronAPIClient();
    client.knowledge.getKnowledgeMap = vi.fn().mockResolvedValue({
      success: true,
      data: {
        nodes: [
          { id: '1', label: 'Alpha', x: 0, y: 0, size: 1, color: '#000', category: 'topic', mastery: 0.4 },
          { id: '2', label: 'Beta', x: 0, y: 0, size: 1, color: '#000', category: 'skill', mastery: 0.7 },
        ],
        edges: [{ from: '1', to: '2', label: 'rel', strength: 0.9, type: 'related' }],
        layout: 'force-directed',
        clusters: [],
        metadata: { totalNodes: 2, totalEdges: 1, centerConcepts: [], learningPaths: [] },
      },
    });

    renderWithServices(<KnowledgeGraphVisualization />, { electronAPI: client });

    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    expect(screen.getByText(/2 concepts · 1 relationships/i)).toBeInTheDocument();
  });

  it('loads concepts and allows selecting + saving in ConceptManager', async () => {
    const client = createMockElectronAPIClient();
    client.knowledge.getKnowledgeMap = vi.fn().mockResolvedValue({
      success: true,
      data: {
        nodes: [
          { id: 'a', label: 'Alpha', x: 0, y: 0, size: 1, color: '#000', category: 'topic' },
          { id: 'b', label: 'Beta', x: 0, y: 0, size: 1, color: '#000', category: 'skill' },
        ],
        edges: [],
        layout: 'force-directed',
        clusters: [],
        metadata: { totalNodes: 2, totalEdges: 0, centerConcepts: [], learningPaths: [] },
      },
    });
    client.knowledge.ingestConcepts = vi.fn().mockResolvedValue({ success: true });

    const onCreated = vi.fn();

    renderWithServices(<ConceptManager onConceptCreated={onCreated} />, { electronAPI: client });

    await waitFor(() => expect(client.knowledge.getKnowledgeMap).toHaveBeenCalled());
    // Select existing concept
    fireEvent.click(screen.getAllByTestId('concept-row')[0]);
    expect((screen.getByLabelText(/Concept name/i) as HTMLInputElement).value).toBe('Alpha');

    // Create a new concept
    fireEvent.click(screen.getByText(/New concept/i));
    fireEvent.change(screen.getByLabelText(/Concept name/i), { target: { value: 'Gamma' } });
    fireEvent.change(screen.getByLabelText(/Type/i), { target: { value: 'skill' } });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: 'Desc' },
    });
    fireEvent.click(screen.getByText(/Save concept/i));

    await waitFor(() => expect(client.knowledge.ingestConcepts).toHaveBeenCalled());
    expect(client.knowledge.ingestConcepts.mock.calls[0][0].result.concepts[0].name).toBe(
      'Gamma',
    );
    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Gamma', conceptType: 'skill' }),
    );
  });
});
