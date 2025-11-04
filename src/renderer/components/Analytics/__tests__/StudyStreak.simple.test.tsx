import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StudyStreak } from '@/renderer/components/Analytics/StudyStreak';

// Mock date functionality for consistent testing
const mockDate = new Date('2024-01-15T10:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(mockDate);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('StudyStreak Component', () => {
  it('renders streak information correctly', () => {
    render(<StudyStreak streakDays={5} />);

    expect(screen.getByText('Study Streak')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('days in a row')).toBeInTheDocument();
  });

  it('displays correct emoji for streak level', () => {
    const { rerender } = render(<StudyStreak streakDays={0} />);
    expect(screen.getByText('🌱')).toBeInTheDocument();

    rerender(<StudyStreak streakDays={5} />);
    expect(screen.getByText('🔥')).toBeInTheDocument();

    rerender(<StudyStreak streakDays={35} />);
    expect(screen.getByText('🏆')).toBeInTheDocument();
  });

  it('displays appropriate streak message', () => {
    const { rerender } = render(<StudyStreak streakDays={0} />);
    expect(screen.getByText('Start your learning journey!')).toBeInTheDocument();

    rerender(<StudyStreak streakDays={5} />);
    expect(screen.getByText('5 day streak - Building momentum!')).toBeInTheDocument();

    rerender(<StudyStreak streakDays={35} />);
    expect(screen.getByText('35 day streak - Learning master!')).toBeInTheDocument();
  });

  it('displays last study date when provided', () => {
    const lastStudyDate = new Date('2024-01-14T15:30:00Z');
    render(<StudyStreak streakDays={5} lastStudyDate={lastStudyDate} />);

    expect(screen.getByText(/Last studied:/)).toBeInTheDocument();
    expect(screen.getByText('1/14/2024')).toBeInTheDocument();
  });

  it('shows checkmark when studied today', () => {
    const today = new Date('2024-01-15T10:00:00Z');
    render(<StudyStreak streakDays={5} lastStudyDate={today} />);

    expect(screen.getByText(/✓/)).toBeInTheDocument();
  });

  it('displays weekly goal progress correctly', () => {
    render(<StudyStreak streakDays={3} goalDays={7} />);

    expect(screen.getByText('Weekly Goal')).toBeInTheDocument();
    expect(screen.getByText('3/7 days')).toBeInTheDocument();
  });

  it('shows achievement message when goal is reached', () => {
    render(<StudyStreak streakDays={7} goalDays={7} />);

    expect(screen.getByText('🎉 Weekly goal achieved!')).toBeInTheDocument();
  });

  it('does not show achievement when goal not reached', () => {
    render(<StudyStreak streakDays={5} goalDays={7} />);

    expect(screen.queryByText('🎉 Weekly goal achieved!')).not.toBeInTheDocument();
  });

  it('displays week calendar correctly', () => {
    render(<StudyStreak streakDays={3} />);

    // Check that all weekday labels are present
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument();
    expect(screen.getByText('W')).toBeInTheDocument();

    expect(screen.getByText('This Week')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <StudyStreak streakDays={5} className="custom-test-class" />
    );

    expect(container.firstChild).toHaveClass('custom-test-class');
  });

  it('handles zero streak gracefully', () => {
    render(<StudyStreak streakDays={0} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('days in a row')).toBeInTheDocument();
    expect(screen.getByText('Start your learning journey!')).toBeInTheDocument();
    expect(screen.getByText('🌱')).toBeInTheDocument();
  });

  it('has proper heading structure', () => {
    render(<StudyStreak streakDays={5} />);

    const heading = screen.getByRole('heading', { name: 'Study Streak' });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H3');
  });
});