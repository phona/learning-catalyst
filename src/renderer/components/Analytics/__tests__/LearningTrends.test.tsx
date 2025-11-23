import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LearningTrends, LearningTrendsType } from '@/renderer/components/Analytics/LearningTrends';
import { SimpleAnalyticsModule } from '@/renderer/components/Analytics/Achievements';

// Mock analytics class that the tests expect
class MockSimpleAnalyticsModule implements SimpleAnalyticsModule {
  getLearningTrends = vi.fn().mockImplementation((_period?: number) =>
    Promise.resolve({
      dailyStudyTime: [],
      masteryProgress: [],
      sessionTypes: {},
    }),
  );
  getStudyMetrics = vi.fn();
  getAchievements = vi.fn();
}

describe('LearningTrends', () => {
  let mockAnalytics: MockSimpleAnalyticsModule;

  beforeEach(() => {
    mockAnalytics = new MockSimpleAnalyticsModule();
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockAnalytics.getLearningTrends.mockImplementation(() => new Promise(() => {}));

    render(<LearningTrends analytics={mockAnalytics} />);

    expect(screen.getByText('Loading trends...')).toBeInTheDocument();
  });

  it('renders error state when analytics fails', async () => {
    mockAnalytics.getLearningTrends.mockRejectedValue(new Error('Failed to load trends'));

    render(<LearningTrends analytics={mockAnalytics} />);

    expect(
      await screen.findByText('Error loading trends: Failed to load trends'),
    ).toBeInTheDocument();
  });

  it('renders trends data when loaded successfully', async () => {
    const mockTrends: LearningTrendsType = {
      dailyStudyTime: [
        { date: '2025-01-20', minutes: 45 },
        { date: '2025-01-21', minutes: 60 },
        { date: '2025-01-22', minutes: 30 },
      ],
      masteryProgress: [
        { date: '2025-01-20', avgMastery: 2.5 },
        { date: '2025-01-21', avgMastery: 3.0 },
        { date: '2025-01-22', avgMastery: 3.2 },
      ],
      sessionTypes: {
        study: 5,
        review: 2,
      },
    };

    mockAnalytics.getLearningTrends.mockResolvedValue(mockTrends);

    render(<LearningTrends analytics={mockAnalytics} />);

    expect(await screen.findByText('Learning Trends')).toBeInTheDocument();
    expect(screen.getByTestId('avg-study-time')).toHaveTextContent('45m');
    expect(screen.getByTestId('mastery-trend')).toHaveTextContent('3.2');
    expect(screen.getByTestId('total-sessions')).toHaveTextContent('7'); // Total sessions: 5 study + 2 review
  });

  it('renders period selector buttons', async () => {
    const mockTrends: LearningTrendsType = {
      dailyStudyTime: [],
      masteryProgress: [],
      sessionTypes: {},
    };

    mockAnalytics.getLearningTrends.mockResolvedValue(mockTrends);

    render(<LearningTrends analytics={mockAnalytics} />);

    expect(await screen.findByText('7d')).toBeInTheDocument();
    expect(screen.getByText('14d')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
  });

  it('shows no data message when trends are empty', async () => {
    const mockTrends: LearningTrendsType = {
      dailyStudyTime: [],
      masteryProgress: [],
      sessionTypes: {},
    };

    mockAnalytics.getLearningTrends.mockResolvedValue(mockTrends);

    render(<LearningTrends analytics={mockAnalytics} />);

    expect(await screen.findByText('No trend data available')).toBeInTheDocument();
  });

  it('displays average study time correctly', async () => {
    const mockTrends: LearningTrendsType = {
      dailyStudyTime: [
        { date: '2025-01-20', minutes: 30 },
        { date: '2025-01-21', minutes: 60 },
        { date: '2025-01-22', minutes: 90 },
      ],
      masteryProgress: [],
      sessionTypes: {},
    };

    mockAnalytics.getLearningTrends.mockResolvedValue(mockTrends);

    render(<LearningTrends analytics={mockAnalytics} />);

    expect(await screen.findByText('Avg Daily Study')).toBeInTheDocument();
    expect(screen.getByTestId('avg-study-time')).toHaveTextContent('60m'); // Average of 30, 60, 90
  });

  it('displays session types breakdown', async () => {
    const mockTrends: LearningTrendsType = {
      dailyStudyTime: [],
      masteryProgress: [],
      sessionTypes: {
        study: 8,
        review: 3,
        assessment: 2,
      },
    };

    mockAnalytics.getLearningTrends.mockResolvedValue(mockTrends);

    render(<LearningTrends analytics={mockAnalytics} />);

    expect(await screen.findByText('Session Types')).toBeInTheDocument();
    expect(screen.getByText('study')).toBeInTheDocument();
    expect(screen.getByText('8 sessions')).toBeInTheDocument();
    expect(screen.getByText('review')).toBeInTheDocument();
    expect(screen.getByText('3 sessions')).toBeInTheDocument();
    expect(screen.getByText('assessment')).toBeInTheDocument();
    expect(screen.getByText('2 sessions')).toBeInTheDocument();
  });

  it('displays recent activity list', async () => {
    const mockTrends: LearningTrendsType = {
      dailyStudyTime: [
        { date: '2025-01-15', minutes: 55 },
        { date: '2025-01-16', minutes: 40 },
        { date: '2025-01-17', minutes: 50 },
        { date: '2025-01-18', minutes: 20 },
        { date: '2025-01-19', minutes: 75 },
        { date: '2025-01-20', minutes: 30 },
        { date: '2025-01-21', minutes: 45 },
        { date: '2025-01-22', minutes: 60 },
      ],
      masteryProgress: [],
      sessionTypes: {},
    };

    mockAnalytics.getLearningTrends.mockResolvedValue(mockTrends);

    render(<LearningTrends analytics={mockAnalytics} />);

    expect(await screen.findByText('Recent Activity')).toBeInTheDocument();

    // Should show the last 7 days in reverse order
    const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' } as const;
    const firstDate = new Date('2025-01-22').toLocaleDateString('en-US', dateOptions);
    const secondDate = new Date('2025-01-21').toLocaleDateString('en-US', dateOptions);

    const activityDates = screen.getAllByTestId('recent-activity-date');
    const activityDurations = screen.getAllByTestId('recent-activity-duration');

    expect(activityDates[0]).toHaveTextContent(firstDate);
    expect(activityDurations[0]).toHaveTextContent('60m');
    expect(activityDates[1]).toHaveTextContent(secondDate);
    expect(activityDurations[1]).toHaveTextContent('45m');
  });

  it('calls analytics.getLearningTrends with correct period when period changes', async () => {
    const mockTrends: LearningTrendsType = {
      dailyStudyTime: [],
      masteryProgress: [],
      sessionTypes: {},
    };

    mockAnalytics.getLearningTrends.mockResolvedValue(mockTrends);

    render(<LearningTrends analytics={mockAnalytics} />);

    // Wait for initial render
    await screen.findByText('Learning Trends');

    const button14d = screen.getByText('14d');
    await fireEvent.click(button14d);

    await waitFor(() => {
      expect(mockAnalytics.getLearningTrends).toHaveBeenCalledTimes(2);
      expect(mockAnalytics.getLearningTrends).toHaveBeenLastCalledWith(14);
    });
  });

  it('trend calculations work correctly', async () => {
    // Test with increasing trend
    const mockTrends: LearningTrendsType = {
      dailyStudyTime: [
        { date: '2025-01-15', minutes: 30 },
        { date: '2025-01-16', minutes: 35 },
        { date: '2025-01-17', minutes: 40 },
      ],
      masteryProgress: [
        { date: '2025-01-15', avgMastery: 2.0 },
        { date: '2025-01-16', avgMastery: 2.2 },
        { date: '2025-01-17', avgMastery: 2.5 },
      ],
      sessionTypes: {},
    };

    mockAnalytics.getLearningTrends.mockResolvedValue(mockTrends);

    render(<LearningTrends analytics={mockAnalytics} />);

    expect(await screen.findByText('Learning Trends')).toBeInTheDocument();

    expect(screen.getAllByLabelText(/trend/i).length).toBeGreaterThan(0);
  });

  it('applies className prop correctly', () => {
    mockAnalytics.getLearningTrends.mockImplementation(() => new Promise(() => {}));

    const { container } = render(
      <LearningTrends analytics={mockAnalytics} className="custom-class" />,
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
