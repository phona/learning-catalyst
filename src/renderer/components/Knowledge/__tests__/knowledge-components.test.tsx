import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ConceptManager } from '../ConceptManager';
import { KnowledgeSearch } from '../KnowledgeSearch';
import { RelationshipManager } from '../RelationshipManager';
import { KnowledgeGraphVisualization } from '../KnowledgeGraphVisualization';
import { renderWithServices } from '@/test/utils/test-providers';
import { createMockElectronAPIClient } from '@/renderer/services/api/electron-api-client';

describe('Knowledge components placeholders', () => {
  it('renders ConceptManager placeholder copy', () => {
    render(<ConceptManager />);

    expect(screen.getByText(/Concept Manager/i)).toBeInTheDocument();
    expect(
      screen.getByText(/needs to be refactored to use IPC-based communication/i),
    ).toBeInTheDocument();
  });

  it('renders KnowledgeSearch placeholder copy with optional className', () => {
    render(<KnowledgeSearch className="extra-class" />);

    expect(screen.getByText(/Knowledge Search/i)).toBeInTheDocument();
    expect(
      screen.getByText(/needs to be refactored to use IPC-based communication/i),
    ).toBeInTheDocument();
    // className should make it through to the container
    expect(screen.getByText(/Knowledge Search/i).closest('.knowledge-search')?.className).toContain(
      'extra-class',
    );
  });

  it('renders RelationshipManager placeholder copy', () => {
    render(<RelationshipManager selectedConcept={null} />);

    expect(screen.getByText(/Relationship Manager/i)).toBeInTheDocument();
    expect(
      screen.getByText(/needs to be refactored to use IPC-based communication/i),
    ).toBeInTheDocument();
  });

  it('renders KnowledgeGraphVisualization with loaded data', async () => {
    const client = createMockElectronAPIClient();
    client.knowledge.getKnowledgeMap = vi.fn().mockResolvedValue({
      success: true,
      data: {
        nodes: [
          { id: '1', label: 'Alpha', category: 'topic', mastery: 0.4 },
          { id: '2', label: 'Beta', category: 'skill', mastery: 0.7 },
        ],
        edges: [{ from: '1', to: '2', label: 'rel', strength: 0.9 }],
      },
    } as any);

    renderWithServices(<KnowledgeGraphVisualization />, { electronAPI: client });

    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    expect(screen.getByText(/2 concepts · 1 relationships/i)).toBeInTheDocument();
  });
});
