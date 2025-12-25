import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { KnowledgeGraphVisualization } from '../KnowledgeGraphVisualization';
import { renderWithServices } from '@/test/utils/test-providers.helpers';
import { createMockElectronAPIClient } from '@/renderer/services/api/electron-api-client';

describe('KnowledgeGraphVisualization', () => {
  it('loads nodes/edges and emits selection', async () => {
    const client = createMockElectronAPIClient();
    client.knowledge.getKnowledgeMap = vi.fn().mockResolvedValue({
      success: true,
      data: {
        nodes: [
          { id: '1', label: 'Node A', category: 'topic', mastery: 0.6 },
          { id: '2', label: 'Node B', category: 'skill', mastery: 0.2 },
        ],
        edges: [{ from: '1', to: '2', label: 'rel', strength: 0.8 }],
      },
    } as any);

    const onSelect = vi.fn();
    renderWithServices(<KnowledgeGraphVisualization onConceptSelect={onSelect} />, {
      electronAPI: client,
    });

    await waitFor(() => expect(screen.getByText('Node A')).toBeInTheDocument());
    expect(screen.getByText(/2 concepts · 1 relationships/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Node A'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: '1', name: 'Node A' }));
  });

  it('shows error state and retries', async () => {
    const client = createMockElectronAPIClient();
    const failing = vi.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        success: true,
        data: { nodes: [], edges: [] },
      } as any);
    client.knowledge.getKnowledgeMap = failing;

    renderWithServices(<KnowledgeGraphVisualization />, { electronAPI: client });

    await waitFor(() => expect(screen.getByTestId('kgv-error')).toBeInTheDocument());
    expect(screen.getByText(/boom/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Retry/i));
    await waitFor(() => expect(screen.getByTestId('knowledge-graph-visualization')).toBeInTheDocument());
  });
});
