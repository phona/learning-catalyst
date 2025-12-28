import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KnowledgePage } from '../KnowledgePage';

vi.mock('@/renderer/features/knowledge', () => ({
  KnowledgeGameMap: ({ onConceptSelect }: any) => (
    <div data-testid="graph" onClick={() => onConceptSelect({ id: 'g1', name: 'GraphConcept', conceptType: 'fact', masteryLevel: 1 } as any)}>
      graph
    </div>
  ),
  ConceptManager: ({ onConceptCreated }: any) => (
    <button onClick={() => onConceptCreated({ id: 'c1', name: 'CreatedConcept', conceptType: 'topic', masteryLevel: 2 } as any)}>
      create-concept
    </button>
  ),
  RelationshipManager: () => <div data-testid="relationships">relationships</div>,
}));

describe('KnowledgePage', () => {
  it('toggles manager, creates concept, and switches tabs', () => {
    render(<KnowledgePage />);

    // Graph renders even before manager is open
    expect(screen.getByTestId('graph')).toBeInTheDocument();

    // Open manager dialog
    fireEvent.click(screen.getByText(/Manage/i));
    expect(screen.getByTestId('manager-dialog')).toBeInTheDocument();
    expect(screen.getByText(/create-concept/i)).toBeInTheDocument();

    // Create concept sets selected footer
    fireEvent.click(screen.getByText(/create-concept/i));
    expect(screen.getByText(/Selected: CreatedConcept/i)).toBeInTheDocument();

    // Switch to relationships tab
    fireEvent.click(screen.getAllByText(/Relationships/i)[0]);
    expect(screen.getByTestId('relationships')).toBeInTheDocument();
    // graph selection updates footer
    fireEvent.click(screen.getByTestId('graph'));
    expect(screen.getByText(/Selected: GraphConcept/i)).toBeInTheDocument();

    // Close dialog
    fireEvent.click(screen.getByText(/Close/i));
    expect(screen.queryByTestId('manager-dialog')).not.toBeInTheDocument();
  });
});
