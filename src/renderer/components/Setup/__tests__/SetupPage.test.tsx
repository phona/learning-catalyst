import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, jest } from 'vitest';
import { SetupPage } from '../SetupPage';

describe('SetupPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders setup page with logo and loading spinner', () => {
    render(<SetupPage />);

    expect(screen.getByText('Learning Catalyst')).toBeInTheDocument();
    expect(screen.getByText('Your AI-powered learning companion')).toBeInTheDocument();
    expect(screen.getByText('Initializing Learning Catalyst...')).toBeInTheDocument();
    expect(screen.getByRole('generic', { hidden: true }).querySelector('.animate-spin')).toBeTruthy();
  });

  it('displays custom message when provided', () => {
    render(<SetupPage message="Custom initialization message" />);

    expect(screen.getByText('Custom initialization message')).toBeInTheDocument();
  });

  it('shows time elapsed counter', () => {
    render(<SetupPage timeoutMs={5000} />);

    // Initially should show 0s
    expect(screen.getByText('0s elapsed')).toBeInTheDocument();

    // Advance time by 1 second
    vi.advanceTimersByTime(1000);
    expect(screen.getByText('1s elapsed')).toBeInTheDocument();

    // Advance time by 65 seconds to test minutes formatting
    vi.advanceTimersByTime(65000);
    expect(screen.getByText('1:05 elapsed')).toBeInTheDocument();
  });

  it('shows progress bar that fills over time', () => {
    render(<SetupPage timeoutMs={10000} />);

    const progressBar = screen.getByRole('generic', { hidden: true }).querySelector('.bg-gradient-to-r');

    expect(progressBar).toBeTruthy();

    // Progress should increase over time
    // At 50% of timeout, progress bar should be at 50%
    vi.advanceTimersByTime(5000);
    expect(progressBar?.style.width).toBe('50%');

    // At 100% of timeout, progress bar should be at 100%
    vi.advanceTimersByTime(5000);
    expect(progressBar?.style.width).toBe('100%');
  });

  it('does not exceed 100% progress', () => {
    render(<SetupPage timeoutMs={5000} />);

    const progressBar = screen.getByRole('generic', { hidden: true }).querySelector('.bg-gradient-to-r');

    // Advance well beyond timeout
    vi.advanceTimersByTime(20000);

    // Should still be at 100%
    expect(progressBar?.style.width).toBe('100%');
  });

  it('shows retry option when timeout is reached', () => {
    render(<SetupPage timeoutMs={3000} />);

    // Timeout not reached yet
    expect(screen.queryByText('Initialization is taking longer than expected.')).not.toBeInTheDocument();

    // Advance to timeout
    vi.advanceTimersByTime(3000);

    // Should show timeout message
    expect(
      screen.getByText('Initialization is taking longer than expected.'),
    ).toBeInTheDocument();

    // Should show retry button
    const retryButton = screen.getByRole('button', { name: 'Retry Startup' });
    expect(retryButton).toBeInTheDocument();
  });

  it('calls onTimeout callback when timeout is reached', () => {
    const onTimeoutSpy = vi.fn();

    render(<SetupPage timeoutMs={2000} onTimeout={onTimeoutSpy} />);

    vi.advanceTimersByTime(2000);

    expect(onTimeoutSpy).toHaveBeenCalled();
  });

  it('calls onRetry callback when retry button is clicked', () => {
    const onRetrySpy = vi.fn();

    render(<SetupPage timeoutMs={2000} onRetry={onRetrySpy} />);

    vi.advanceTimersByTime(2000);

    const retryButton = screen.getByRole('button', { name: 'Retry Startup' });
    fireEvent.click(retryButton);

    expect(onRetrySpy).toHaveBeenCalled();
  });

  it('does not show retry option before timeout', () => {
    render(<SetupPage timeoutMs={10000} />);

    vi.advanceTimersByTime(5000);

    expect(screen.queryByText('Retry Startup')).not.toBeInTheDocument();
    expect(screen.queryByText('Initialization is taking longer than expected.')).not.toBeInTheDocument();
  });

  it('shows custom timeout duration', () => {
    render(<SetupPage timeoutMs={60000} />);

    // Timeout should be 60 seconds
    vi.advanceTimersByTime(60000);

    expect(
      screen.getByText('Initialization is taking longer than expected.'),
    ).toBeInTheDocument();
  });

  it('clears timers on unmount', () => {
    const { unmount } = render(<SetupPage timeoutMs={10000} />);

    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(clearIntervalSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it('formats time correctly for different durations', () => {
    render(<SetupPage timeoutMs={100000} />);

    // Test seconds
    vi.advanceTimersByTime(5000);
    expect(screen.getByText('5s elapsed')).toBeInTheDocument();

    // Test minutes and seconds
    vi.advanceTimersByTime(60000);
    expect(screen.getByText('1:05 elapsed')).toBeInTheDocument();

    // Test multiple minutes
    vi.advanceTimersByTime(120000);
    expect(screen.getByText('3:05 elapsed')).toBeInTheDocument();
  });

  it('displays appropriate status text', () => {
    render(<SetupPage />);

    expect(
      screen.getByText('Setting up your personalized learning environment...'),
    ).toBeInTheDocument();
  });

  it('has proper styling and layout', () => {
    render(<SetupPage />);

    const container = screen.getByText('Learning Catalyst').closest('div');

    // Check for gradient background
    expect(container?.parentElement?.parentElement).toHaveClass(
      'bg-gradient-to-br',
      'from-blue-50',
      'via-indigo-50',
      'to-purple-50',
      'dark:from-gray-900',
      'dark:via-blue-900',
      'dark:to-gray-900',
    );

    // Check for white card
    expect(container?.parentElement).toHaveClass(
      'bg-white',
      'dark:bg-gray-800',
      'rounded-2xl',
      'shadow-2xl',
    );
  });

  it('has spinning loader animation', () => {
    render(<SetupPage />);

    const spinner = screen.getByRole('generic', { hidden: true }).querySelector('.animate-spin');

    expect(spinner).toBeInTheDocument();

    // Check for border animation
    expect(spinner?.parentElement).toHaveClass('animate-spin');
  });

  it('displays the rocket launch icon', () => {
    render(<SetupPage />);

    // The icon is rendered via Heroicons
    const iconContainer = screen
      .getByText('Learning Catalyst')
      .previousElementSibling?.previousElementSibling;

    expect(iconContainer).toBeTruthy();
  });

  it('handles very short timeouts', () => {
    render(<SetupPage timeoutMs={100} />);

    vi.advanceTimersByTime(100);

    expect(
      screen.getByText('Initialization is taking longer than expected.'),
    ).toBeInTheDocument();
  });

  it('handles zero timeout', () => {
    render(<SetupPage timeoutMs={0} />);

    // Should immediately show timeout
    expect(
      screen.getByText('Initialization is taking longer than expected.'),
    ).toBeInTheDocument();
  });
});
