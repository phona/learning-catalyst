import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ModuleStatusIndicator } from '../ModuleStatusIndicator';

describe('ModuleStatusIndicator', () => {
  const baseHealth = {
    overall: 'degraded',
    lastCheck: new Date().toISOString(),
    modules: {
      chat: { status: 'healthy', message: 'ok' },
      analytics: { status: 'degraded', message: 'slow queries' },
      discovery: { status: 'failed', message: 'down' },
    },
    issues: [
      { module: 'discovery', severity: 'critical', message: 'service unreachable' },
      { module: 'analytics', severity: 'warning', message: 'latency high' },
      { module: 'chat', severity: 'info', message: 'using fallback' },
      { module: 'sessions', severity: 'error', message: 'queue backlog' },
    ],
  };

  it('shows initializing state when health is not provided', () => {
    render(<ModuleStatusIndicator systemHealth={undefined as any} />);

    expect(screen.getByText('Module system initializing...')).toBeInTheDocument();
  });

  it('renders compact summary with refresh when degraded/failed modules exist', () => {
    const onRefresh = vi.fn();
    render(<ModuleStatusIndicator systemHealth={baseHealth} onRefresh={onRefresh} compact />);

    expect(screen.getByText('System Degraded')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Refresh module status'));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('renders detailed module list, issues, and respects status styling', () => {
    render(<ModuleStatusIndicator systemHealth={baseHealth} />);

    // Module rows should display friendly names and status badges
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getAllByText(/analytics/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText('failed')[0]).toHaveClass('text-red-600');

    // Issues section should truncate after three and show count of remaining
    expect(screen.getByText(/Recent Issues/i)).toBeInTheDocument();
    expect(screen.getByText('... and 1 more')).toBeInTheDocument();
  });
});
