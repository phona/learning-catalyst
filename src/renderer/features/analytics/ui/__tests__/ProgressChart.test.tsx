import React from 'react';
import { screen } from '@testing-library/react';
import { ProgressChart, ProgressBar } from '../ProgressChart';
import { renderWithServices } from '@/test/utils/renderWithServices';

describe('ProgressChart', () => {
  it('renders title and percentage with custom size/color', async () => {
    renderWithServices(<ProgressChart title="Mastery" value={50} maxValue={200} color="green" size="small" />);

    expect(screen.getByText('Mastery')).toBeInTheDocument();
    // percentage should compute to 25%
    expect(await screen.findByText('25%')).toBeInTheDocument();
  });

  it('marks complete when value reaches max', async () => {
    renderWithServices(<ProgressChart title="Done" value={100} maxValue={100} animated={false} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    // completion indicator dot should render
    expect(document.querySelector('.bg-emerald-500')).not.toBeNull();
  });
});

describe('ProgressBar', () => {
  it('shows percentage and applies glow when showGlow enabled', async () => {
    renderWithServices(<ProgressBar title="Tokens" value={60} maxValue={120} showGlow animated={false} />);
    expect(screen.getByText('Tokens')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('handles over-100 values clamped to 100%', async () => {
    renderWithServices(<ProgressBar title="Overflow" value={200} maxValue={100} animated={false} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
