import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { LoadedConceptsPanel } from '../LoadedConceptsPanel';
import { renderWithServices } from '@/test/utils/test-providers.helpers';
import { createMockElectronAPIClient } from '@/renderer/services/api/electron-api-client';

describe('LoadedConceptsPanel', () => {
  it('loads concepts, filters, and emits selection', async () => {
    const client = createMockElectronAPIClient();
    const nodes = [
      {
        id: 'c1',
        label: 'Physics',
        x: 0,
        y: 0,
        size: 1,
        color: '#000',
        category: 'topic',
        mastery: 0.4,
      },
      {
        id: 'c2',
        label: 'Computation',
        x: 0,
        y: 0,
        size: 1,
        color: '#000',
        category: 'skill',
        mastery: 0.9,
      },
    ];
    client.knowledge.getKnowledgeMap = vi.fn().mockResolvedValue({
      success: true,
      data: {
        nodes,
        edges: [],
        layout: 'force-directed',
        clusters: [],
        metadata: { totalNodes: 2, totalEdges: 0, centerConcepts: [], learningPaths: [] },
      },
    } as any);

    const onSelect = vi.fn();
    renderWithServices(<LoadedConceptsPanel onConceptSelect={onSelect} />, { electronAPI: client });

    await waitFor(() => expect(screen.getByText('Physics')).toBeInTheDocument());
    expect(screen.getByText('Computation')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Filter concepts/i), { target: { value: 'Comp' } });
    expect(screen.queryByText('Physics')).not.toBeInTheDocument();
    expect(screen.getByText('Computation')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Computation'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'c2', name: 'Computation' }));
  });
});
