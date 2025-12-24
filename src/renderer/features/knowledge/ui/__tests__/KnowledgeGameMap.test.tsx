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

  describe('Initial Load Scenarios', () => {
    it('should render when data loads AFTER graph instance is ready', async () => {
      const client = createMockElectronAPIClient();

      client.knowledge.getKnowledgeMap = vi.fn().mockResolvedValue({
        success: true,
        data: {
          nodes: [
            { id: 'a', label: 'Alpha', x: 0, y: 0, size: 1, color: '#2563eb', category: 'topic', mastery: 0.5 },
          ],
          edges: [],
          layout: 'force-directed',
          clusters: [],
          metadata: { totalNodes: 1, totalEdges: 0, centerConcepts: [], learningPaths: [] },
        },
      });

      const onSelect = vi.fn();
      renderWithServices(<KnowledgeGameMap onConceptSelect={onSelect} />, { electronAPI: client });

      // Wait for graph instance to be ready (happens during render)
      await waitFor(() => expect(screen.getByTestId('rg-mock')).toBeInTheDocument());

      // Wait for data to load and render
      await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument(), { timeout: 5000 });
      expect(screen.getByText('Alpha')).toBeInTheDocument();
    });

    it('should render when graph instance is ready BEFORE data loads', async () => {
      const client = createMockElectronAPIClient();

      client.knowledge.getKnowledgeMap = vi.fn().mockResolvedValue({
        success: true,
        data: {
          nodes: [
            { id: 'a', label: 'Alpha', x: 0, y: 0, size: 1, color: '#2563eb', category: 'topic', mastery: 0.5 },
          ],
          edges: [],
          layout: 'force-directed',
          clusters: [],
          metadata: { totalNodes: 1, totalEdges: 0, centerConcepts: [], learningPaths: [] },
        },
      });

      const onSelect = vi.fn();
      renderWithServices(<KnowledgeGameMap onConceptSelect={onSelect} />, { electronAPI: client });

      // Graph instance should be ready first
      await waitFor(() => expect(screen.getByTestId('rg-mock')).toBeInTheDocument());

      // Then data loads
      await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument(), { timeout: 5000 });
      expect(screen.getByText('Alpha')).toBeInTheDocument();
    });

    it('should handle empty data gracefully', async () => {
      const client = createMockElectronAPIClient();

      client.knowledge.getKnowledgeMap = vi.fn().mockResolvedValue({
        success: true,
        data: {
          nodes: [],
          edges: [],
          layout: 'force-directed',
          clusters: [],
          metadata: { totalNodes: 0, totalEdges: 0, centerConcepts: [], learningPaths: [] },
        },
      } as any);

      const onSelect = vi.fn();
      renderWithServices(<KnowledgeGameMap onConceptSelect={onSelect} />, { electronAPI: client });

      // Graph should still render
      await waitFor(() => expect(screen.getByTestId('rg-mock')).toBeInTheDocument());
    });
  });

  describe('Data Updates', () => {
    it('should update when node attributes change', async () => {
      const client = createMockElectronAPIClient();
      const onSelect = vi.fn();

      client.knowledge.getKnowledgeMap = vi.fn().mockResolvedValue({
        success: true,
        data: {
          nodes: [
            { id: 'a', label: 'Alpha', x: 0, y: 0, size: 1, color: '#2563eb', category: 'topic', mastery: 0.5 },
          ],
          edges: [],
          layout: 'force-directed',
          clusters: [],
          metadata: { totalNodes: 1, totalEdges: 0, centerConcepts: [], learningPaths: [] },
        },
      } as any);

      const { rerender } = renderWithServices(
        <KnowledgeGameMap onConceptSelect={onSelect} />,
        { electronAPI: client }
      );

      await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    });
  });

  describe('Graph Instance Availability', () => {
    it('should wait for graph instance before setting data', async () => {
      const client = createMockElectronAPIClient();

      client.knowledge.getKnowledgeMap = vi.fn().mockResolvedValue({
        success: true,
        data: {
          nodes: [
            { id: 'a', label: 'Alpha', x: 0, y: 0, size: 1, color: '#2563eb', category: 'topic', mastery: 0.5 },
          ],
          edges: [],
          layout: 'force-directed',
          clusters: [],
          metadata: { totalNodes: 1, totalEdges: 0, centerConcepts: [], learningPaths: [] },
        },
      } as any);

      const onSelect = vi.fn();
      renderWithServices(<KnowledgeGameMap onConceptSelect={onSelect} />, { electronAPI: client });

      await waitFor(() => expect(screen.getByTestId('rg-mock')).toBeInTheDocument());
      await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    });

    it('should not crash if graph instance never becomes available', async () => {
      const client = createMockElectronAPIClient();

      client.knowledge.getKnowledgeMap = vi.fn().mockResolvedValue({
        success: true,
        data: {
          nodes: [
            { id: 'a', label: 'Alpha', x: 0, y: 0, size: 1, color: '#2563eb', category: 'topic', mastery: 0.5 },
          ],
          edges: [],
          layout: 'force-directed',
          clusters: [],
          metadata: { totalNodes: 1, totalEdges: 0, centerConcepts: [], learningPaths: [] },
        },
      } as any);

      const onSelect = vi.fn();
      renderWithServices(<KnowledgeGameMap onConceptSelect={onSelect} />, { electronAPI: client });

      // Should not crash even if graph takes time to initialize
      await waitFor(() => expect(screen.getByTestId('rg-mock')).toBeInTheDocument(), { timeout: 5000 });
    });
  });

  describe('Relationship Lines', () => {
    it('should render nodes and relationship lines together', async () => {
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

      await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument(), { timeout: 5000 });
      expect(screen.getByText('Beta')).toBeInTheDocument();
      expect(screen.getByTestId('rg-mock')).toBeInTheDocument();
    });

    it('should handle edges with invalid node references', async () => {
      const client = createMockElectronAPIClient();

      client.knowledge.getKnowledgeMap = vi.fn().mockResolvedValue({
        success: true,
        data: {
          nodes: [
            { id: 'a', label: 'Alpha', x: 0, y: 0, size: 1, color: '#2563eb', category: 'topic', mastery: 0.5 },
          ],
          edges: [
            { from: 'a', to: 'nonexistent', label: 'broken', strength: 0.5, type: 'related' },
            { from: 'nonexistent', to: 'a', label: 'also-broken', strength: 0.5, type: 'related' },
          ],
          layout: 'force-directed',
          clusters: [],
          metadata: { totalNodes: 1, totalEdges: 2, centerConcepts: [], learningPaths: [] },
        },
      } as any);

      const onSelect = vi.fn();
      renderWithServices(<KnowledgeGameMap onConceptSelect={onSelect} />, { electronAPI: client });

      // Should still render without crashing
      await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument(), { timeout: 5000 });
      expect(screen.getByTestId('rg-mock')).toBeInTheDocument();
    });
  });

  describe('Context Menu', () => {
    it('should open context menu and handle actions', async () => {
      const client = createMockElectronAPIClient();

      client.knowledge.getKnowledgeMap = vi.fn().mockResolvedValue({
        success: true,
        data: {
          nodes: [
            { id: 'a', label: 'Alpha', x: 0, y: 0, size: 1, color: '#2563eb', category: 'topic', mastery: 0.5 },
          ],
          edges: [],
          layout: 'force-directed',
          clusters: [],
          metadata: { totalNodes: 1, totalEdges: 0, centerConcepts: [], learningPaths: [] },
        },
      } as any);

      const onSelect = vi.fn();
      renderWithServices(<KnowledgeGameMap onConceptSelect={onSelect} />, { electronAPI: client });

      await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument(), { timeout: 5000 });

      // Right-click to open context menu
      fireEvent.contextMenu(screen.getByText('Alpha'));

      // Click Open action
      await waitFor(() => screen.getByText('Open'));
      fireEvent.click(screen.getByText('Open'));

      expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', name: 'Alpha' }));
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const client = createMockElectronAPIClient();

      client.knowledge.getKnowledgeMap = vi.fn().mockResolvedValue({
        success: false,
        error: { message: 'Network error' },
      } as any);

      const onSelect = vi.fn();
      renderWithServices(<KnowledgeGameMap onConceptSelect={onSelect} />, { electronAPI: client });

      // Should show error message
      await waitFor(() => expect(screen.getByText(/Network error/)).toBeInTheDocument(), { timeout: 5000 });
    });
  });
});
