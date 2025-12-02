import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KnowledgeMap } from '../KnowledgeMap';

vi.mock('@/renderer/components/Knowledge', () => ({
  KnowledgeGraphVisualization: ({ onConceptSelect }: any) => (
    <div data-testid="graph" onClick={() => onConceptSelect({ id: 'g1', name: 'GraphConcept', conceptType: 'fact', masteryLevel: 1 } as any)}>
      graph
    </div>
  ),
  KnowledgeSearch: ({ onConceptSelect }: any) => (
    <button onClick={() => onConceptSelect({ id: 'c2', name: 'SearchConcept', conceptType: 'fact', masteryLevel: 3 } as any)}>
      select-from-search
    </button>
  ),
  ConceptManager: ({ onConceptCreated }: any) => (
    <button onClick={() => onConceptCreated({ id: 'c1', name: 'CreatedConcept', conceptType: 'topic', masteryLevel: 2 } as any)}>
      create-concept
    </button>
  ),
  LoadedConceptsPanel: ({ onConceptSelect }: any) => (
    <button onClick={() => onConceptSelect({ id: 'c3', name: 'LoadedConcept', conceptType: 'topic', masteryLevel: 4 } as any)}>
      select-loaded
    </button>
  ),
  KnowledgeMiniGraphPanel: ({ onConceptSelect }: any) => (
    <button onClick={() => onConceptSelect({ id: 'c4', name: 'MiniGraphConcept', conceptType: 'fact', masteryLevel: 5 } as any)}>
      select-mini
    </button>
  ),
  RelationshipManager: () => <div data-testid="relationships">relationships</div>,
}));

describe('KnowledgeMap', () => {
  it('toggles manager, creates concept, and switches tabs', () => {
    render(<KnowledgeMap />);

    // Graph and search render even before manager is open
    expect(screen.getByTestId('graph')).toBeInTheDocument();
    expect(screen.getByText(/select-from-search/i)).toBeInTheDocument();

    // Open manager
    fireEvent.click(screen.getByText(/Manage/i));
    expect(screen.getByText(/create-concept/i)).toBeInTheDocument();

    // Create concept sets selected footer
    fireEvent.click(screen.getByText(/create-concept/i));
    expect(screen.getByText(/Selected: CreatedConcept/i)).toBeInTheDocument();

    // Switch to relationships tab
    fireEvent.click(screen.getAllByText(/Relationships/i)[0]);
    expect(screen.getByTestId('relationships')).toBeInTheDocument();

    // loaded concepts panel selection updates footer
    fireEvent.click(screen.getByText(/select-loaded/i));
    expect(screen.getByText(/Selected: LoadedConcept/i)).toBeInTheDocument();
  });
});
