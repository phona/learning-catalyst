import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ConceptManager } from '../ConceptManager';
import { KnowledgeSearch } from '../KnowledgeSearch';
import { RelationshipManager } from '../RelationshipManager';
import { KnowledgeGraphVisualization } from '../KnowledgeGraphVisualization';

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

  it('shows loading then error state for KnowledgeGraphVisualization', async () => {
    render(<KnowledgeGraphVisualization />);

    const errorText = await screen.findByText(/Knowledge graph component needs IPC refactoring/i);
    expect(errorText).toBeInTheDocument();
    expect(screen.queryByText(/Loading knowledge graph/i)).not.toBeInTheDocument();
  });
});
