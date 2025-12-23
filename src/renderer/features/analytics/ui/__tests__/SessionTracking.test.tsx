import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionTracking } from '../SessionTracking';
import { renderWithServices } from '@/test/utils/renderWithServices';

// Define the LearningSession interface to match what the component expects
interface LearningSession {
  id?: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  concepts: string[];
  messages?: unknown[];
  achievements?: string[];
  notes?: string;
}

// Define the AnalyticsSession interface that the component actually uses
interface AnalyticsSession extends LearningSession {
  aiProvider?: string;
  aiModel?: string;
  sessionType?: 'chat' | 'study' | 'assessment' | 'review' | 'exploration';
  status?: 'completed' | 'in_progress' | 'paused';
  durationMinutes?: number;
  conceptsCovered?: string[];
}

// Define the analytics service interface
interface RendererAnalyticsService {
  getStudyMetrics: () => Promise<{
    totalStudyTime: number;
    sessionsCompleted: number;
    averageSessionLength: number;
    conceptsStudied: number;
    questionsAsked: number;
    correctAnswers: number;
    accuracyRate: number;
    focusScore: number;
    streakDays: number;
    lastStudyDate?: Date;
  }>;
}

const createSession = (overrides: Partial<AnalyticsSession> = {}): AnalyticsSession => ({
  id: overrides.id ?? 'session-id',
  title: overrides.title ?? 'Default Title',
  startTime: overrides.startTime ?? new Date('2025-02-10T10:00:00Z'),
  endTime: overrides.endTime,
  durationMinutes: overrides.durationMinutes ?? 30,
  aiProvider: overrides.aiProvider ?? 'OpenAI',
  aiModel: overrides.aiModel ?? 'gpt-4',
  conceptsCovered: overrides.conceptsCovered ?? ['react'],
  sessionType: overrides.sessionType ?? 'study',
  status: overrides.status ?? 'completed',
  concepts: overrides.concepts ?? ['react'],
});

describe('SessionTracking', () => {
  const analytics: RendererAnalyticsService = {
    getStudyMetrics: vi.fn(),
  };

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a loading indicator while sessions are fetched', (): void => {
    const loadSessions = (): Promise<AnalyticsSession[]> => new Promise<AnalyticsSession[]>(() => {});
    const { container } = renderWithServices(
      <SessionTracking analytics={analytics} loadSessions={loadSessions} />,
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
        sessionType: 'study',
      }),
      createSession({
        id: 'two',
        title: 'Async Patterns',
        durationMinutes: 45,
        conceptsCovered: ['promises'],
        sessionType: 'review',
      }),
      createSession({
        id: 'three',
        title: 'TypeScript Basics',
        durationMinutes: 30,
        conceptsCovered: ['types', 'interfaces', 'generics'],
        sessionType: 'study',
      }),
    ]);

    renderWithServices(<SessionTracking analytics={analytics} loadSessions={loadSessions} />);

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

    renderWithServices(<SessionTracking analytics={analytics} loadSessions={loadSessions} />);

    expect(await screen.findByText('No sessions yet')).toBeInTheDocument();
    expect(screen.getByText('Start your first learning session')).toBeInTheDocument();
    expect(screen.getByTestId('session-total-time')).toHaveTextContent('0m');
  });

  it('renders an error state when the loader fails', async () => {
    const loadSessions = vi.fn().mockRejectedValue(new Error('network down'));

    renderWithServices(<SessionTracking analytics={analytics} loadSessions={loadSessions} />);

    await waitFor(() => {
      expect(screen.getByText('Error loading sessions: network down')).toBeInTheDocument();
    });
  });
});
