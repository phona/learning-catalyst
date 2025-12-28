/**
 * ModuleStatusIndicator Component Tests
 *
 * Tests for the system health status indicator component that displays
 * module status and issues with proper error handling.
 */

import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModuleStatusIndicator } from '../ModuleStatusIndicator';
import { renderWithServices } from '@/test/utils/renderWithServices';

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
      { module: 'discovery', severity: 'critical' as const, message: 'service unreachable' },
      { module: 'analytics', severity: 'warning' as const, message: 'latency high' },
      { module: 'chat', severity: 'info' as const, message: 'using fallback' },
    ],
  };

  it('shows initializing state when health is not provided', () => {
    renderWithServices(<ModuleStatusIndicator systemHealth={null} />);

    expect(screen.getByText('Module system initializing...')).toBeInTheDocument();
  });

  it('renders compact summary with refresh when degraded/failed modules exist', () => {
    const onRefresh = vi.fn();
    renderWithServices(<ModuleStatusIndicator systemHealth={baseHealth} onRefresh={onRefresh} compact />);

    expect(screen.getByText('System Degraded')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Refresh module status'));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('renders detailed module list, issues, and respects status styling', () => {
    renderWithServices(<ModuleStatusIndicator systemHealth={baseHealth} />);

    // Module rows should display friendly names and status badges
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getAllByText(/analytics/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText('failed')[0]).toHaveClass('text-red-600');

    // Issues section should display all issues since there are only 3
    expect(screen.getByText(/Recent Issues/i)).toBeInTheDocument();
    expect(screen.queryByText(/\.\.\. and \d+ more/)).not.toBeInTheDocument();
  });
});
