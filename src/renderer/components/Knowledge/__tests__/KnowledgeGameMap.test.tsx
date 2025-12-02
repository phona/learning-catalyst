import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { KnowledgeGameMap } from '../KnowledgeGameMap';
import { renderWithServices } from '@/test/utils/test-providers';
import { createMockElectronAPIClient } from '@/renderer/services/api/electron-api-client';

describe('KnowledgeGameMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nodes, filters edges, and handles context actions', async () => {
    const client = createMockElectronAPIClient();
    client.knowledge.getKnowledgeMap = vi.fn().mockResolvedValue({
      success: true,
      data: {
        nodes: [
          { id: 'a', label: 'Alpha', x: 0, y: 0, size: 1, color: '#2563eb', category: 'topic', mastery: 0.5 },
          { id: 'b', label: 'Beta', x: 80, y: 0, size: 1, color: '#f59e0b', category: 'skill', mastery: 0.7 },
        ],
        edges: [
          { from: 'a', to: 'b', label: 'strong', strength: 0.9, type: 'related' },
          { from: 'b', to: 'a', label: 'weak', strength: 0.4, type: 'related' },
        ],
        layout: 'force-directed',
        clusters: [],
        metadata: { totalNodes: 2, totalEdges: 2, centerConcepts: [], learningPaths: [] },
      },
    } as any);

    const onSelect = vi.fn();
    renderWithServices(<KnowledgeGameMap onConceptSelect={onSelect} />, { electronAPI: client });

    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    expect(screen.getByTestId('rg-mock')).toBeInTheDocument();

    // Right-click to open context menu and choose Open
    fireEvent.contextMenu(screen.getByText('Alpha'));
    fireEvent.click(screen.getByText('Open'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', name: 'Alpha' }));
  });
});
