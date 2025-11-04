import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KnowledgeSearch } from '@/renderer/components/Knowledge/KnowledgeSearch';
import { KnowledgeGraphModule } from '@/renderer/modules/knowledge-graph/knowledge-graph';

// Mock the KnowledgeGraphModule
vi.mock('@/renderer/modules/knowledge-graph/knowledge-graph', () => ({
  KnowledgeGraphModule: vi.fn().mockImplementation(() => ({
    searchConcepts: vi.fn(),
  })),
}));

describe('KnowledgeSearch', () => {
  let mockKnowledgeGraph: any;

  beforeEach(() => {
    mockKnowledgeGraph = new KnowledgeGraphModule();
    vi.clearAllMocks();
  });

  it('renders search input and filters', () => {
    render(<KnowledgeSearch knowledgeGraph={mockKnowledgeGraph} />);

    expect(screen.getByPlaceholderText('Search concepts...')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('calls searchConcepts when query changes', async () => {
    mockKnowledgeGraph.searchConcepts.mockResolvedValue([]);

    render(<KnowledgeSearch knowledgeGraph={mockKnowledgeGraph} />);

    const searchInput = screen.getByPlaceholderText('Search concepts...');
    fireEvent.change(searchInput, { target: { value: 'react' } });

    await waitFor(() => {
      expect(mockKnowledgeGraph.searchConcepts).toHaveBeenCalledWith({
        query: 'react',
        limit: 20,
      });
    });
  });

  it('debounces search queries', async () => {
    mockKnowledgeGraph.searchConcepts.mockResolvedValue([]);

    render(<KnowledgeSearch knowledgeGraph={mockKnowledgeGraph} />);

    const searchInput = screen.getByPlaceholderText('Search concepts...');

    // Fire multiple rapid changes
    fireEvent.change(searchInput, { target: { value: 'r' } });
    fireEvent.change(searchInput, { target: { value: 're' } });
    fireEvent.change(searchInput, { target: { value: 'rea' } });
    fireEvent.change(searchInput, { target: { value: 'react' } });

    // Should only be called once after debounce
    await waitFor(
      () => {
        expect(mockKnowledgeGraph.searchConcepts).toHaveBeenCalledTimes(1);
      },
      { timeout: 400 }
    );

    expect(mockKnowledgeGraph.searchConcepts).toHaveBeenCalledWith({
      query: 'react',
      limit: 20,
    });
  });

  it('calls searchConcepts with filters when filters are applied', async () => {
    mockKnowledgeGraph.searchConcepts.mockResolvedValue([]);

    render(<KnowledgeSearch knowledgeGraph={mockKnowledgeGraph} />);

    // Open filters
    fireEvent.click(screen.getByText('Filters'));

    // Select concept type filter
    fireEvent.click(screen.getByText('topic'));

    // Change search query
    const searchInput = screen.getByPlaceholderText('Search concepts...');
    fireEvent.change(searchInput, { target: { value: 'javascript' } });

    await waitFor(() => {
      expect(mockKnowledgeGraph.searchConcepts).toHaveBeenCalledWith({
        query: 'javascript',
        conceptTypes: ['topic'],
        limit: 20,
      });
    });
  });

  it('displays search results when found', async () => {
    const mockResults = [
      {
        id: '1',
        name: 'React Components',
        description: 'Building reusable React components',
        conceptType: 'topic' as const,
        difficultyLevel: 3 as const,
        masteryLevel: 2 as const,
        tags: ['react', 'frontend'],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewCount: 0,
      },
      {
        id: '2',
        name: 'React Hooks',
        description: 'Using hooks in React',
        conceptType: 'skill' as const,
        difficultyLevel: 2 as const,
        masteryLevel: 4 as const,
        tags: ['react', 'hooks'],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewCount: 0,
      },
    ];

    mockKnowledgeGraph.searchConcepts.mockResolvedValue(mockResults);

    render(<KnowledgeSearch knowledgeGraph={mockKnowledgeGraph} />);

    const searchInput = screen.getByPlaceholderText('Search concepts...');
    fireEvent.change(searchInput, { target: { value: 'react' } });

    await waitFor(() => {
      expect(screen.getByText('Found 2 concepts')).toBeInTheDocument();
    });

    expect(screen.getByText('React Components')).toBeInTheDocument();
    expect(screen.getByText('React Hooks')).toBeInTheDocument();
    expect(screen.getByText('topic')).toBeInTheDocument();
    expect(screen.getByText('skill')).toBeInTheDocument();
  });

  it('displays no results message when no concepts found', async () => {
    mockKnowledgeGraph.searchConcepts.mockResolvedValue([]);

    render(<KnowledgeSearch knowledgeGraph={mockKnowledgeGraph} />);

    const searchInput = screen.getByPlaceholderText('Search concepts...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No concepts found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
    });
  });

  it('calls onConceptSelect when concept is clicked', async () => {
    const mockOnConceptSelect = vi.fn();
    const mockResults = [
      {
        id: '1',
        name: 'React Components',
        description: 'Building reusable React components',
        conceptType: 'topic' as const,
        difficultyLevel: 3 as const,
        masteryLevel: 2 as const,
        tags: ['react', 'frontend'],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewCount: 0,
      },
    ];

    mockKnowledgeGraph.searchConcepts.mockResolvedValue(mockResults);

    render(
      <KnowledgeSearch
        knowledgeGraph={mockKnowledgeGraph}
        onConceptSelect={mockOnConceptSelect}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search concepts...');
    fireEvent.change(searchInput, { target: { value: 'react' } });

    await waitFor(() => {
      expect(screen.getByText('React Components')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('React Components'));

    expect(mockOnConceptSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        name: 'React Components',
      })
    );

    // Search input should be cleared after selection
    expect(searchInput).toHaveValue('');
  });

  it('clears search when clear button is clicked', async () => {
    mockKnowledgeGraph.searchConcepts.mockResolvedValue([]);

    render(<KnowledgeSearch knowledgeGraph={mockKnowledgeGraph} />);

    const searchInput = screen.getByPlaceholderText('Search concepts...');
    fireEvent.change(searchInput, { target: { value: 'react' } });

    expect(searchInput).toHaveValue('react');

    // Click clear button
    const clearButton = screen.getByRole('button', { name: /clear search/i });
    fireEvent.click(clearButton);

    expect(searchInput).toHaveValue('');
  });

  it('toggles filter panel when filters button is clicked', () => {
    render(<KnowledgeSearch knowledgeGraph={mockKnowledgeGraph} />);

    // Initially, filters panel should not be visible
    expect(screen.queryByText('Concept Types')).not.toBeInTheDocument();

    // Click filters button
    fireEvent.click(screen.getByText('Filters'));

    // Filter panel should now be visible
    expect(screen.getByText('Concept Types')).toBeInTheDocument();
    expect(screen.getByText('Difficulty: 1 - 5')).toBeInTheDocument();
    expect(screen.getByText('Mastery: 0 - 5')).toBeInTheDocument();
  });

  it('applies concept type filters', async () => {
    mockKnowledgeGraph.searchConcepts.mockResolvedValue([]);

    render(<KnowledgeSearch knowledgeGraph={mockKnowledgeGraph} />);

    // Open filters
    fireEvent.click(screen.getByText('Filters'));

    // Select multiple concept types
    fireEvent.click(screen.getByText('topic'));
    fireEvent.click(screen.getByText('skill'));

    // Search with filters applied
    const searchInput = screen.getByPlaceholderText('Search concepts...');
    fireEvent.change(searchInput, { target: { value: 'javascript' } });

    await waitFor(() => {
      expect(mockKnowledgeGraph.searchConcepts).toHaveBeenCalledWith({
        query: 'javascript',
        conceptTypes: ['topic', 'skill'],
        limit: 20,
      });
    });
  });

  it('removes concept type filters when clicked again', async () => {
    mockKnowledgeGraph.searchConcepts.mockResolvedValue([]);

    render(<KnowledgeSearch knowledgeGraph={mockKnowledgeGraph} />);

    // Open filters
    fireEvent.click(screen.getByText('Filters'));

    // Select concept type
    fireEvent.click(screen.getByText('topic'));

    // Verify it's selected
    expect(screen.getByText('topic')).toHaveClass('bg-blue-500');

    // Click again to deselect
    fireEvent.click(screen.getByText('topic'));

    // Verify it's no longer selected
    expect(screen.getByText('topic')).toHaveClass('bg-gray-200');

    // Search with no filters
    const searchInput = screen.getByPlaceholderText('Search concepts...');
    fireEvent.change(searchInput, { target: { value: 'javascript' } });

    await waitFor(() => {
      expect(mockKnowledgeGraph.searchConcepts).toHaveBeenCalledWith({
        query: 'javascript',
        limit: 20,
      });
    });
  });

  it('clears all filters when clear filters button is clicked', async () => {
    mockKnowledgeGraph.searchConcepts.mockResolvedValue([]);

    render(<KnowledgeSearch knowledgeGraph={mockKnowledgeGraph} />);

    // Open filters
    fireEvent.click(screen.getByText('Filters'));

    // Select filters
    fireEvent.click(screen.getByText('topic'));
    fireEvent.click(screen.getByText('skill'));

    // Clear filters
    fireEvent.click(screen.getByText('Clear filters'));

    // Filters should be cleared
    expect(screen.getByText('topic')).toHaveClass('bg-gray-200');
    expect(screen.getByText('skill')).toHaveClass('bg-gray-200');
  });

  it('shows active filter indicator when filters are applied', () => {
    render(<KnowledgeSearch knowledgeGraph={mockKnowledgeGraph} />);

    // Initially, no active indicator
    expect(screen.queryByText('Active')).not.toBeInTheDocument();

    // Open filters and apply filter
    fireEvent.click(screen.getByText('Filters'));
    fireEvent.click(screen.getByText('topic'));

    // Should show active indicator
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies className prop correctly', () => {
    const { container } = render(
      <KnowledgeSearch knowledgeGraph={mockKnowledgeGraph} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('displays mastery level with correct colors', async () => {
    const mockResults = [
      {
        id: '1',
        name: 'Advanced Topic',
        description: 'An advanced concept',
        conceptType: 'topic' as const,
        difficultyLevel: 4 as const,
        masteryLevel: 4 as const,
        tags: ['advanced'],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewCount: 0,
      },
    ];

    mockKnowledgeGraph.searchConcepts.mockResolvedValue(mockResults);

    render(<KnowledgeSearch knowledgeGraph={mockKnowledgeGraph} />);

    const searchInput = screen.getByPlaceholderText('Search concepts...');
    fireEvent.change(searchInput, { target: { value: 'advanced' } });

    await waitFor(() => {
      expect(screen.getByText('Mastery: 4/5')).toBeInTheDocument();
    });

    // Should have green color for high mastery
    const masteryElement = screen.getByText('4/5');
    expect(masteryElement).toHaveClass('text-green-600');
  });
});