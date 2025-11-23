import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Achievements, SimpleAnalyticsModule } from '@/renderer/components/Analytics/Achievements';

// Mock analytics class that the tests expect
class MockSimpleAnalyticsModule implements SimpleAnalyticsModule {
  getAchievements = vi.fn();
  getStudyMetrics = vi.fn();
  getLearningTrends = vi.fn();
}

describe('Achievements', () => {
  let mockAnalytics: MockSimpleAnalyticsModule;

  beforeEach(() => {
    mockAnalytics = new MockSimpleAnalyticsModule();
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockAnalytics.getAchievements.mockImplementation(() => new Promise(() => {}));

    render(<Achievements analytics={mockAnalytics} />);

    expect(screen.getByText('Loading achievements...')).toBeInTheDocument();
  });

  it('renders error state when analytics fails', async () => {
    mockAnalytics.getAchievements.mockRejectedValue(new Error('Failed to load achievements'));

    render(<Achievements analytics={mockAnalytics} />);

    expect(await screen.findByText('Unable to load achievements')).toBeInTheDocument();
    expect(screen.getByText('Failed to load achievements')).toBeInTheDocument();
  });

  it('renders achievements data when loaded successfully', async () => {
    const mockAchievements = [
      {
        id: 'first_session',
        title: 'First Steps',
        description: 'Complete your first learning session',
        category: 'time' as const,
        requirement: { sessionsCompleted: 1 },
        progress: 100,
        icon: '🎯',
        unlockedAt: new Date('2025-01-20'),
      },
      {
        id: 'week_streak',
        title: 'Week Warrior',
        description: 'Study for 7 days in a row',
        category: 'streaks' as const,
        requirement: { streakDays: 7 },
        progress: 50,
        icon: '🔥',
      },
      {
        id: 'time_master',
        title: 'Time Master',
        description: 'Study for 1000 minutes total',
        category: 'time' as const,
        requirement: { totalStudyTime: 1000 },
        progress: 75,
        icon: '⏰',
      },
    ];

    mockAnalytics.getAchievements.mockResolvedValue(mockAchievements);

    render(<Achievements analytics={mockAnalytics} />);

    expect(await screen.findByText('Achievements')).toBeInTheDocument();
    expect(screen.getByText('1 of 3 unlocked')).toBeInTheDocument();
    expect(screen.getByText('Overall Progress')).toBeInTheDocument();
    const expectedOverall = Math.round((1 / mockAchievements.length) * 100);
    const overallBadges = screen.getAllByText(`${expectedOverall}%`);
    expect(overallBadges.length).toBeGreaterThan(0);
  });

  it('renders unlocked achievements section when there are unlocked achievements', async () => {
    const mockAchievements = [
      {
        id: 'first_session',
        title: 'First Steps',
        description: 'Complete your first learning session',
        category: 'time' as const,
        requirement: { sessionsCompleted: 1 },
        progress: 100,
        icon: '🎯',
        unlockedAt: new Date('2025-01-20'),
      },
    ];

    mockAnalytics.getAchievements.mockResolvedValue(mockAchievements);

    render(<Achievements analytics={mockAnalytics} />);

    expect(await screen.findByText('Unlocked Achievements (1)')).toBeInTheDocument();
    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText('Complete your first learning session')).toBeInTheDocument();
    expect(screen.getByText('time')).toBeInTheDocument();
    const formattedDate = new Date('2025-01-20').toLocaleDateString();
    expect(screen.getByText(formattedDate)).toBeInTheDocument();
  });

  it('renders locked achievements section when there are locked achievements', async () => {
    const mockAchievements = [
      {
        id: 'week_streak',
        title: 'Week Warrior',
        description: 'Study for 7 days in a row',
        category: 'streaks' as const,
        requirement: { streakDays: 7 },
        progress: 50,
        icon: '🔥',
      },
    ];

    mockAnalytics.getAchievements.mockResolvedValue(mockAchievements);

    render(<Achievements analytics={mockAnalytics} />);

    expect(await screen.findByText('In Progress (1)')).toBeInTheDocument();
    expect(screen.getByText('Week Warrior')).toBeInTheDocument();
    expect(screen.getByText('Study for 7 days in a row')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders progress bar correctly', async () => {
    const mockAchievements = [
      {
        id: 'week_streak',
        title: 'Week Warrior',
        description: 'Study for 7 days in a row',
        category: 'streaks' as const,
        requirement: { streakDays: 7 },
        progress: 50,
        icon: '🔥',
      },
    ];

    mockAnalytics.getAchievements.mockResolvedValue(mockAchievements);

    render(<Achievements analytics={mockAnalytics} />);

    expect(await screen.findByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();

    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars[1]).toHaveAttribute('aria-valuenow', '50');
  });

  it('renders custom icons when provided', async () => {
    const mockAchievements = [
      {
        id: 'custom_achievement',
        title: 'Custom Achievement',
        description: 'A custom achievement',
        category: 'engagement' as const,
        requirement: { customMetric: 100 },
        progress: 75,
        icon: '🌟',
      },
    ];

    mockAnalytics.getAchievements.mockResolvedValue(mockAchievements);

    render(<Achievements analytics={mockAnalytics} />);

    expect(await screen.findByText('🌟')).toBeInTheDocument();
  });

  it('renders default icons when no custom icon is provided', async () => {
    const mockAchievements = [
      {
        id: 'achievement_without_icon',
        title: 'No Icon Achievement',
        description: 'An achievement without a custom icon',
        category: 'concepts' as const,
        requirement: { conceptsStudied: 10 },
        progress: 25,
        icon: '',
      },
    ];

    mockAnalytics.getAchievements.mockResolvedValue(mockAchievements);

    render(<Achievements analytics={mockAnalytics} />);

    expect(await screen.findByLabelText('No Icon Achievement icon')).toBeInTheDocument();
  });

  it('shows no achievements message when there are no achievements', async () => {
    mockAnalytics.getAchievements.mockResolvedValue([]);

    render(<Achievements analytics={mockAnalytics} />);

    expect(await screen.findByText('No achievements yet')).toBeInTheDocument();
    expect(
      screen.getByText('Start your learning journey to unlock amazing rewards!'),
    ).toBeInTheDocument();
  });

  it('categorizes achievements correctly', async () => {
    const mockAchievements = [
      {
        id: 'time_achievement',
        title: 'Time Achievement',
        category: 'time' as const,
        requirement: { totalStudyTime: 100 },
        progress: 50,
        icon: '⏰',
      },
      {
        id: 'concepts_achievement',
        title: 'Concepts Achievement',
        category: 'concepts' as const,
        requirement: { conceptsStudied: 10 },
        progress: 25,
        icon: '🧠',
      },
      {
        id: 'performance_achievement',
        title: 'Performance Achievement',
        category: 'performance' as const,
        requirement: { accuracyRate: 95 },
        progress: 80,
        icon: '🎯',
      },
    ];

    mockAnalytics.getAchievements.mockResolvedValue(mockAchievements);

    render(<Achievements analytics={mockAnalytics} />);

    expect(await screen.findByTestId('achievement-icon-time_achievement')).toBeInTheDocument();
    expect(screen.getByTestId('achievement-icon-concepts_achievement')).toBeInTheDocument();
    expect(screen.getByTestId('achievement-icon-performance_achievement')).toBeInTheDocument();
  });

  it('applies className prop correctly', () => {
    mockAnalytics.getAchievements.mockImplementation(() => new Promise(() => {}));

    const { container } = render(
      <Achievements analytics={mockAnalytics} className="custom-class" />,
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('calculates overall progress correctly', async () => {
    const mockAchievements = [
      {
        id: '1',
        title: 'Achievement 1',
        category: 'time' as const,
        requirement: {},
        progress: 50,
        icon: '',
        unlockedAt: new Date('2025-01-01'),
      },
      {
        id: '2',
        title: 'Achievement 2',
        category: 'concepts' as const,
        requirement: {},
        progress: 100,
        icon: '',
        unlockedAt: new Date('2025-01-02'),
      },
      {
        id: '3',
        title: 'Achievement 3',
        category: 'streaks' as const,
        requirement: {},
        progress: 75,
        icon: '',
      },
      {
        id: '4',
        title: 'Achievement 4',
        category: 'performance' as const,
        requirement: {},
        progress: 25,
        icon: '',
      },
    ];

    mockAnalytics.getAchievements.mockResolvedValue(mockAchievements);

    render(<Achievements analytics={mockAnalytics} />);

    expect(await screen.findByText('Overall Progress')).toBeInTheDocument();
    expect(screen.getByText('2 of 4 unlocked')).toBeInTheDocument();
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
  });
});
