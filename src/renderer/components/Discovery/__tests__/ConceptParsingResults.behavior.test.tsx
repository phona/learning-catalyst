import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConceptParsingResults } from '../ConceptParsingResults';

const makeCompletedJob = () => ({
  id: 'job-1',
  materialId: 'mat-1',
  status: 'completed' as const,
  progress: 1,
  stages: [],
  result: {
    concepts: [
      {
        id: 'c1',
        name: 'Gravity',
        description: 'A force of attraction.',
        type: 'principle',
        difficulty: 3,
        confidence: 0.92,
        evidence: [],
        relationships: [],
        metadata: {
          tags: ['physics', 'fundamental'],
          learningObjectives: [],
          prerequisites: [],
          relatedTopics: [],
          difficulty: 3,
          extractionMethod: 'ai',
          extractedBy: [],
        },
        extractedAt: new Date('2024-01-01'),
      },
      {
        id: 'c2',
        name: 'Acceleration',
        description: 'Rate of change of velocity.',
        type: 'topic',
        difficulty: 2,
        confidence: 0.81,
        evidence: [],
        relationships: [],
        metadata: {
          tags: ['physics'],
          learningObjectives: [],
          prerequisites: [],
          relatedTopics: [],
          difficulty: 2,
          extractionMethod: 'ai',
          extractedBy: [],
        },
        extractedAt: new Date('2024-01-02'),
      },
    ],
    relationships: [
      {
        targetConceptId: 'c1',
        targetConceptName: 'Gravity',
        type: 'related',
        strength: 0.6,
        confidence: 0.7,
        evidence: [],
      },
    ],
    statistics: {
      totalConcepts: 2,
      validConcepts: 2,
      totalRelationships: 1,
      confidenceDistribution: { high: 2 },
      difficultyDistribution: { 2: 1, 3: 1 },
      typeDistribution: { principle: 1, topic: 1 },
      processingTime: 1200,
      modelUsage: { 'gpt-4': 2 },
    },
    learningPath: {} as any,
    assessments: [],
    errors: [],
  },
});

describe('ConceptParsingResults', () => {
  it('shows completed results and toggles to concepts tab', () => {
    const job = makeCompletedJob();
    const onSelect = vi.fn();

    render(<ConceptParsingResults job={job} onConceptSelect={onSelect} />);

    expect(screen.getByText(/Concept Parsing Results/i)).toBeInTheDocument();
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
    expect(screen.getByText('Gravity')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Concepts \(2\)/i));
    expect(screen.getByText('Acceleration')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Gravity'));
    expect(onSelect).toHaveBeenCalledWith('c1');
  });

  it('shows progress UI while processing', () => {
    const processingJob = {
      id: 'job-2',
      materialId: 'mat-2',
      status: 'processing' as const,
      progress: 0.5,
      stages: [],
    };

    render(<ConceptParsingResults job={processingJob as any} />);

    expect(screen.getByText(/Processing Progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Processing your files/i)).toBeInTheDocument();
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it('renders failure state with error message', () => {
    const failedJob = {
      id: 'job-3',
      materialId: 'mat-3',
      status: 'failed' as const,
      progress: 1,
      stages: [],
      errorMessage: 'Extraction crashed',
    };

    render(<ConceptParsingResults job={failedJob as any} />);

    expect(screen.getByText(/Parsing Failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Extraction crashed/)).toBeInTheDocument();
  });
});
