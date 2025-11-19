
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionTracking } from '@/renderer/components/Analytics/SessionTracking';
import type { LearningSession } from '@/shared/utils/simple-analytics';

const createSession = (overrides: Partial<LearningSession> = {}): LearningSession => ({
  id: overrides.id ?? 'session-id',
  title: overrides.title ?? 'Default Title',
  startTime: overrides.startTime ?? new Date('2025-02-10T10:00:00Z'),
  endTime: overrides.endTime,
  durationMinutes: overrides.durationMinutes ?? 30,
  aiProvider: overrides.aiProvider ?? 'OpenAI',
  aiModel: overrides.aiModel ?? 'gpt-4',
  conceptsCovered: overrides.conceptsCovered ?? ['react'],
  sessionType: overrides.sessionType ?? 'study',
  status: overrides.status ?? 'completed'
});

describe('SessionTracking', () => {
  const analytics = {
    getStudyMetrics: vi.fn()
  };

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a loading indicator while sessions are fetched', (): void => {
    const loadSessions = (): Promise<LearningSession[]> => new Promise<LearningSession[]>(() => {});
    const { container } = render(
      <SessionTracking analytics={analytics} loadSessions={loadSessions} />
    );

    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders session summaries once data loads', async () => {
    const loadSessions = vi.fn().mockResolvedValue([
      createSession({
        id: 'one',
        title: 'React Fundamentals',
        durationMinutes: 60,
        conceptsCovered: ['hooks', 'state'],
        sessionType: 'study'
      }),
      createSession({
        id: 'two',
        title: 'Async Patterns',
        durationMinutes: 45,
        conceptsCovered: ['promises'],
        sessionType: 'review'
      }),
      createSession({
        id: 'three',
        title: 'TypeScript Basics',
        durationMinutes: 30,
        conceptsCovered: ['types', 'interfaces', 'generics'],
        sessionType: 'study'
      })
    ]);

    render(<SessionTracking analytics={analytics} loadSessions={loadSessions} />);

    expect(await screen.findByText('Recent Sessions')).toBeInTheDocument();
    expect(screen.getByText('3 sessions')).toBeInTheDocument();
    expect(screen.getByTestId('session-total-time')).toHaveTextContent('2h 15m');
    expect(screen.getByTestId('session-average-length')).toHaveTextContent('45m');
    expect(screen.getByText('React Fundamentals')).toBeInTheDocument();
    expect(screen.getAllByText('Study')).toHaveLength(2);
    expect(screen.getByText('Async Patterns')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(loadSessions).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when no sessions are returned', async () => {
    const loadSessions = vi.fn().mockResolvedValue([]);

    render(<SessionTracking analytics={analytics} loadSessions={loadSessions} />);

    expect(await screen.findByText('No sessions yet')).toBeInTheDocument();
    expect(screen.getByText('Start your first learning session')).toBeInTheDocument();
    expect(screen.getByTestId('session-total-time')).toHaveTextContent('0m');
  });

  it('renders an error state when the loader fails', async () => {
    const loadSessions = vi.fn().mockRejectedValue(new Error('network down'));

    render(<SessionTracking analytics={analytics} loadSessions={loadSessions} />);

    await waitFor(() => {
      expect(screen.getByText('Error loading sessions: network down')).toBeInTheDocument();
    });
  });
});
