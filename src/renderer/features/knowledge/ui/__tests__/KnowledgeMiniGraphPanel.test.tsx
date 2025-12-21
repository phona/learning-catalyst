import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { KnowledgeMiniGraphPanel } from '../KnowledgeMiniGraphPanel';
import { renderWithServices } from '@/test/utils/test-providers';
import { createMockElectronAPIClient } from '@/renderer/services/api/electron-api-client';

describe('KnowledgeMiniGraphPanel', () => {
  it('renders nodes, filters edges, and emits selection', async () => {
    const client = createMockElectronAPIClient();
    client.knowledge.getKnowledgeMap = vi.fn().mockResolvedValue({
      success: true,
      data: {
        nodes: [
          { id: 'a', label: 'Algebra', x: 0, y: 0, size: 1, color: '#000', category: 'topic', mastery: 0.5 },
          { id: 'b', label: 'Binary', x: 0, y: 0, size: 1, color: '#000', category: 'skill', mastery: 0.8 },
        ],
        edges: [
          { from: 'a', to: 'b', label: 'related', strength: 0.9, type: 'related' },
          { from: 'b', to: 'a', label: 'weak', strength: 0.2, type: 'related' },
        ],
        layout: 'force-directed',
        clusters: [],
        metadata: { totalNodes: 2, totalEdges: 2, centerConcepts: [], learningPaths: [] },
      },
    } as any);

    const onSelect = vi.fn();
    renderWithServices(<KnowledgeMiniGraphPanel onConceptSelect={onSelect} />, { electronAPI: client });

    await waitFor(() => expect(screen.getByText('Algebra')).toBeInTheDocument());

    // filter out weak edge
    fireEvent.change(screen.getByLabelText(/Min strength/i), { target: { value: 0.5 } });
    expect(screen.getAllByText(/→/).length).toBe(1);

    fireEvent.click(screen.getByText('Algebra'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', name: 'Algebra' }));
  });
});
