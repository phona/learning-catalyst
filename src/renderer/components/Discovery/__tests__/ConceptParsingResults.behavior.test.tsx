import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

    fireEvent.click(screen.getByText(/Concepts \(2\)/i));
    expect(screen.getByDisplayValue('Gravity')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Acceleration')).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('View details')[0]);
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

  it('exports results as JSON when export button clicked', () => {
    const job = makeCompletedJob();
    const onExport = vi.fn();

    render(<ConceptParsingResults job={job} onExport={onExport} />);

    fireEvent.click(screen.getByTitle(/Export as JSON/i));
    expect(onExport).toHaveBeenCalledWith('json');
  });

  it('applies ingest plan with low-confidence skips', async () => {
    const job = makeCompletedJob();
    job.result.concepts.push({
      ...job.result.concepts[0],
      id: 'c-low',
      name: 'Low Concept',
      confidence: 0.4,
    });

    const onIngest = vi.fn().mockResolvedValue({
      conceptsInserted: 1,
      conceptsUpdated: 2,
      relationshipsInserted: 0,
    });

    render(<ConceptParsingResults job={job} onIngest={onIngest} />);

    fireEvent.click(screen.getByRole('button', { name: /Apply to Knowledge/i }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(onIngest).toHaveBeenCalledTimes(1));
    const [, plan] = onIngest.mock.calls[0];

    expect(plan).toMatchObject({
      defaultExistingAction: 'overwrite',
      lowConfidence: { defaultThreshold: 0.6 },
      actions: { 'c-low': 'skip' },
    });

    await waitFor(() => {
      expect(screen.getByText(/Inserted: 1/)).toBeInTheDocument();
      expect(screen.getByText(/Updated: 2/)).toBeInTheDocument();
    });
  });

  it('lets users change default existing action and threshold before ingest', async () => {
    const job = makeCompletedJob();
    const onIngest = vi.fn().mockResolvedValue({
      conceptsInserted: 0,
      conceptsUpdated: 0,
      relationshipsInserted: 0,
      lowConfidenceSkipped: 2,
    });

    render(<ConceptParsingResults job={job} onIngest={onIngest} />);

    fireEvent.click(screen.getByText(/Concept Parsing Results/i));

    fireEvent.change(screen.getByDisplayValue(/Overwrite/i), { target: { value: 'skip' } });
    fireEvent.change(screen.getByLabelText(/Skip below confidence/i), {
      target: { value: 0.95 },
    });

    fireEvent.click(screen.getByRole('button', { name: /Apply to Knowledge/i }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(onIngest).toHaveBeenCalledTimes(1));
    const [, plan] = onIngest.mock.calls[0];

    expect(plan).toMatchObject({
      defaultExistingAction: 'skip',
      lowConfidence: { defaultThreshold: 0.95 },
      actions: { c1: 'skip', c2: 'skip' },
    });

    await waitFor(() =>
      expect(screen.getByText(/Low-confidence skipped: 2/)).toBeInTheDocument(),
    );
  });

  it('applies inline edits and per-row actions into ingest payload', async () => {
    const job = makeCompletedJob();
    const onIngest = vi.fn().mockResolvedValue({
      conceptsInserted: 0,
      conceptsUpdated: 1,
      relationshipsInserted: 0,
    });

    render(<ConceptParsingResults job={job} onIngest={onIngest} />);

    fireEvent.click(screen.getByText(/Concepts \(2\)/i));
    const nameInputs = screen.getAllByLabelText('Concept name');
    fireEvent.change(nameInputs[0], {
      target: { value: 'Gravity Prime' },
    });
    const descAreas = screen.getAllByLabelText('Concept description');
    fireEvent.change(descAreas[0], {
      target: { value: 'Updated description' },
    });
    fireEvent.change(screen.getAllByLabelText('Concept action')[0], {
      target: { value: 'overwrite' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Apply to Knowledge/i }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(onIngest).toHaveBeenCalledTimes(1));
    const [payload, plan] = onIngest.mock.calls[0];

    expect(payload.concepts[0].name).toBe('Gravity Prime');
    expect(payload.concepts[0].description).toBe('Updated description');
    expect(plan?.actions?.['c1']).toBe('overwrite');
  });

  it('filters out low-confidence concepts live and reflects in dry-run summary', () => {
    const job = makeCompletedJob();
    job.result.concepts.push({
      ...job.result.concepts[0],
      id: 'c-low',
      name: 'Weak',
      confidence: 0.4,
    });

    render(<ConceptParsingResults job={job} />);
    fireEvent.click(screen.getByText(/Concepts \(3\)/i));

    // low-confidence hidden by default threshold
    expect(screen.queryByText('Weak')).not.toBeInTheDocument();

    // lower threshold to include the weak concept, then raise to hide it again
    fireEvent.change(screen.getByLabelText(/Skip below confidence/i), { target: { value: 0.3 } });
    expect(screen.getByDisplayValue('Weak')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Skip below confidence/i), { target: { value: 0.5 } });

    expect(screen.queryByText('Weak')).not.toBeInTheDocument();
    expect(screen.getByText(/Skipping 1/)).toBeInTheDocument();
  });

  it('honors per-row skip action and removes relationships for skipped nodes', async () => {
    const job = makeCompletedJob();
    job.result.relationships.push({
      targetConceptId: 'c2',
      targetConceptName: 'Acceleration',
      type: 'related',
      strength: 0.6,
      confidence: 0.7,
      evidence: [],
    });

    const onIngest = vi.fn().mockResolvedValue({
      conceptsInserted: 1,
      conceptsSkipped: 1,
      relationshipsInserted: 0,
      relationshipsSkipped: 1,
    });

    render(<ConceptParsingResults job={job} onIngest={onIngest} />);
    fireEvent.click(screen.getByText(/Concepts \(2\)/i));

    fireEvent.change(screen.getAllByLabelText('Concept action')[0], { target: { value: 'skip' } });

    fireEvent.click(screen.getByRole('button', { name: /Apply to Knowledge/i }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(onIngest).toHaveBeenCalledTimes(1));
    const [payload, plan] = onIngest.mock.calls[0];

    expect(plan?.actions?.['c1']).toBe('skip');
    expect(payload.concepts.some((c: any) => c.id === 'c1')).toBe(false);
    expect(payload.relationships.length).toBe(0);
  });

  it('disables ingest button while applying to avoid duplicate calls', async () => {
    const job = makeCompletedJob();
    let resolveIngest: () => void;
    const onIngest = vi
      .fn()
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveIngest = () => resolve({ conceptsInserted: 0, conceptsUpdated: 0, relationshipsInserted: 0 });
          }),
      );

    render(<ConceptParsingResults job={job} onIngest={onIngest} />);

    const applyButton = screen.getByRole('button', { name: /Apply to Knowledge/i });
    fireEvent.click(applyButton);
    fireEvent.click(applyButton);

    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    expect(onIngest).toHaveBeenCalledTimes(1);

    resolveIngest!();
    await waitFor(() => expect(screen.getByText(/Ingestion applied/i)).toBeInTheDocument());
  });

  it('filters concepts by search and type', () => {
    const job = makeCompletedJob();
    render(<ConceptParsingResults job={job} />);

    fireEvent.click(screen.getByText(/Concepts \(2\)/i));

    // search hides non-matching (names are now inline inputs)
    fireEvent.change(screen.getByPlaceholderText(/Search concepts/i), {
      target: { value: 'Accel' },
    });
    expect(screen.getByDisplayValue('Acceleration')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Gravity')).not.toBeInTheDocument();

    // type filter
    fireEvent.change(screen.getByPlaceholderText(/Search concepts/i), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByDisplayValue(/All Types/i), { target: { value: 'principle' } });
    expect(screen.getByDisplayValue('Gravity')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Acceleration')).not.toBeInTheDocument();
  });

  it('sorts concepts by name when selected', () => {
    const job = makeCompletedJob();
    render(<ConceptParsingResults job={job} />);

    fireEvent.click(screen.getByText(/Concepts \(2\)/i));
    fireEvent.change(screen.getByDisplayValue(/Sort by Confidence/i), {
      target: { value: 'name' },
    });

    const names = screen.getAllByLabelText('Concept name').map((input) => (input as HTMLInputElement).value);

    expect(names.slice(0, 2)).toEqual(['Acceleration', 'Gravity']);
  });

  it('shows relationships and statistics tabs', () => {
    const job = makeCompletedJob();
    render(<ConceptParsingResults job={job} />);

    fireEvent.click(screen.getByText(/Relationships \(1\)/i));
    expect(screen.getByText(/Gravity/)).toBeInTheDocument();
    expect(screen.getByText(/strength/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Statistics/i));
    expect(screen.getByText(/Confidence Distribution/i)).toBeInTheDocument();
    expect(screen.getByText(/Difficulty Distribution/i)).toBeInTheDocument();
  });
});
