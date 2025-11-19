
/**
 * StudyStreak Component Tests
 *
 * Tests for the StudyStreak analytics component that displays
 * user's learning streak information and progress.
 */

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
  describe('Basic Rendering', () => {
    it('renders streak information correctly', () => {
      render(<StudyStreak streakDays={5} />);

      expect(screen.getByText('Study Streak')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('days in a row')).toBeInTheDocument();
    });

    it('displays correct emoji for streak level', () => {
      const { rerender } = render(<StudyStreak streakDays={0} />);
      expect(screen.getByText('🌱')).toBeInTheDocument();

      rerender(<StudyStreak streakDays={1} />);
      expect(screen.getByText('🌟')).toBeInTheDocument();

      rerender(<StudyStreak streakDays={5} />);
      expect(screen.getByText('🔥')).toBeInTheDocument();

      rerender(<StudyStreak streakDays={10} />);
      expect(screen.getByText('💪')).toBeInTheDocument();

      rerender(<StudyStreak streakDays={20} />);
      expect(screen.getByText('🚀')).toBeInTheDocument();

      rerender(<StudyStreak streakDays={35} />);
      expect(screen.getByText('🏆')).toBeInTheDocument();
    });

    it('displays appropriate streak message', () => {
      const { rerender } = render(<StudyStreak streakDays={0} />);
      expect(screen.getByText('Start your learning journey!')).toBeInTheDocument();

      rerender(<StudyStreak streakDays={1} />);
      expect(screen.getByText('Great start! Keep it going!')).toBeInTheDocument();

      rerender(<StudyStreak streakDays={3} />);
      expect(screen.getByText('3 day streak - Building momentum!')).toBeInTheDocument();

      rerender(<StudyStreak streakDays={10} />);
      expect(screen.getByText('10 day streak - You\'re on fire!')).toBeInTheDocument();

      rerender(<StudyStreak streakDays={20} />);
      expect(screen.getByText('20 day streak - Incredible dedication!')).toBeInTheDocument();

      rerender(<StudyStreak streakDays={35} />);
      expect(screen.getByText('35 day streak - Learning master!')).toBeInTheDocument();
    });
  });

  describe('Last Study Date', () => {
    test('displays last study date when provided', () => {
      const lastStudyDate = new Date('2024-01-14T15:30:00Z');
      render(<StudyStreak streakDays={5} lastStudyDate={lastStudyDate} />);

      expect(screen.getByText(/Last studied:/)).toBeInTheDocument();
      expect(screen.getByTestId('last-study-date')).toHaveTextContent(
        lastStudyDate.toLocaleDateString('en-US')
      );
    });

    test('shows checkmark when studied today', () => {
      const today = new Date('2024-01-15T10:00:00Z');
      render(<StudyStreak streakDays={5} lastStudyDate={today} />);

      expect(screen.getByLabelText('Studied today')).toBeInTheDocument();
    });

    test('does not show last study info when date not provided', () => {
      render(<StudyStreak streakDays={5} />);

      expect(screen.queryByText(/Last studied:/)).not.toBeInTheDocument();
    });
  });

  describe('Goal Progress', () => {
    test('displays weekly goal progress correctly', () => {
      render(<StudyStreak streakDays={3} goalDays={7} />);

      expect(screen.getByText('Weekly Goal')).toBeInTheDocument();
      expect(screen.getByText('3/7 days')).toBeInTheDocument();
    });

    test('shows achievement message when goal is reached', () => {
      render(<StudyStreak streakDays={7} goalDays={7} />);

      expect(screen.getByText('🎉 Weekly goal achieved!')).toBeInTheDocument();
    });

    test('does not show achievement when goal not reached', () => {
      render(<StudyStreak streakDays={5} goalDays={7} />);

      expect(screen.queryByText('🎉 Weekly goal achieved!')).not.toBeInTheDocument();
    });

    test('progress bar fills correctly based on streak percentage', () => {
      const { container } = render(<StudyStreak streakDays={3} goalDays={7} />);

      const progressBar = container.querySelector('.bg-orange-500') as HTMLElement;
      expect(progressBar).not.toBeNull();
      const widthValue = parseFloat(progressBar.style.width);
      expect(widthValue).toBeCloseTo((3 / 7) * 100, 5);
    });

    test('progress bar caps at 100%', () => {
      const { container } = render(<StudyStreak streakDays={10} goalDays={7} />);

      const progressBar = container.querySelector('.bg-orange-500') as HTMLElement;
      expect(progressBar).not.toBeNull();
      const widthValue = parseFloat(progressBar.style.width);
      expect(widthValue).toBeCloseTo(100, 5);
    });
  });

  describe('Mini Calendar', () => {
    test('displays week calendar correctly', () => {
      render(<StudyStreak streakDays={3} />);

      // Check that all weekday labels are present
      ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((day) => {
        expect(screen.getAllByText(day).length).toBeGreaterThan(0);
      });

      expect(screen.getByText('This Week')).toBeInTheDocument();
    });

    test('highlights studied days correctly', () => {
      const today = new Date('2024-01-15T10:00:00Z'); // Monday
      render(<StudyStreak streakDays={3} lastStudyDate={today} />);

      const calendarDays = screen.getAllByText('S');
      expect(calendarDays).toHaveLength(2); // Sunday appears twice
    });

    test('applies correct styling to calendar days', () => {
      render(<StudyStreak streakDays={3} />);

      const dayElements = screen.getAllByTitle(/2024/);
      expect(dayElements.length).toBeGreaterThan(0);

      // Check that styling classes are applied
      dayElements.forEach(day => {
        expect(day).toHaveClass('text-center', 'text-xs', 'py-1', 'rounded');
      });
    });
  });

  describe('Custom Styling', () => {
    test('applies custom className when provided', () => {
      const { container } = render(
        <StudyStreak streakDays={5} className="custom-test-class" />
      );

      expect(container.firstChild).toHaveClass('custom-test-class');
    });

    test('maintains default styling with custom className', () => {
      const { container } = render(
        <StudyStreak streakDays={5} className="custom-test-class" />
      );

      const component = container.firstChild as HTMLElement;
      expect(component).toHaveClass(
        'bg-white',
        'dark:bg-gray-800',
        'rounded-lg',
        'border',
        'border-gray-200',
        'dark:border-gray-700',
        'p-6',
        'custom-test-class'
      );
    });
  });

  describe('Edge Cases', () => {
    test('handles zero streak gracefully', () => {
      render(<StudyStreak streakDays={0} />);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('days in a row')).toBeInTheDocument();
      expect(screen.getByText('Start your learning journey!')).toBeInTheDocument();
      expect(screen.getByText('🌱')).toBeInTheDocument();
    });

    test('handles very large streak numbers', () => {
      render(<StudyStreak streakDays={365} />);

      expect(screen.getByText('365')).toBeInTheDocument();
      expect(screen.getByText('days in a row')).toBeInTheDocument();
      expect(screen.getByText('🏆')).toBeInTheDocument();
    });

    test('handles custom goal days', () => {
      render(<StudyStreak streakDays={2} goalDays={3} />);

      expect(screen.getByText('2/3 days')).toBeInTheDocument();

      const { container } = render(<StudyStreak streakDays={2} goalDays={3} />);
      const progressBar = container.querySelector('.bg-orange-500') as HTMLElement;
      expect(progressBar).not.toBeNull();
      const widthValue = parseFloat(progressBar.style.width);
      expect(widthValue).toBeCloseTo((2 / 3) * 100, 5);
    });
  });

  describe('Accessibility', () => {
    test('has proper heading structure', () => {
      render(<StudyStreak streakDays={5} />);

      const heading = screen.getByRole('heading', { name: 'Study Streak' });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H3');
    });

    test('provides meaningful text content', () => {
      render(<StudyStreak streakDays={5} />);

      // Check that important information is in text, not just icons
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('days in a row')).toBeInTheDocument();
      expect(screen.getByText('5 day streak - Building momentum!')).toBeInTheDocument();
    });

    test('calendar days have tooltips for context', () => {
      render(<StudyStreak streakDays={3} />);

      const dayElements = screen.getAllByTitle(/2024/);
      expect(dayElements.length).toBeGreaterThan(0);

      // Each day should have a title attribute with the date
      dayElements.forEach(day => {
        expect(day.getAttribute('title')).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
      });
    });
  });
});
