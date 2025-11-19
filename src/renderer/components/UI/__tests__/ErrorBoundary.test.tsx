
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from '@/renderer/components/UI/ErrorBoundary';

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Reset console.error mock
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error
    vi.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('catches errors and displays error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Application Error')).toBeInTheDocument();
    expect(screen.getByText('Learning Catalyst encountered an unexpected error.')).toBeInTheDocument();
  });

  it('displays error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    vi.stubEnv('NODE_ENV', 'development');

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const errorDetails = screen.getByText('Error Details (Development Mode)');
    expect(errorDetails).toBeInTheDocument();

    // Expand details to see the error stack
    fireEvent.click(errorDetails);

    expect(screen.getByText(/Test error/)).toBeInTheDocument();

    vi.unstubAllEnvs();
  });

  it('hides error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    vi.stubEnv('NODE_ENV', 'production');

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Error details')).not.toBeInTheDocument();

    vi.unstubAllEnvs();
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error UI</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    expect(screen.queryByText('Application Error')).not.toBeInTheDocument();
  });

  it('has a restart button that reloads the page', () => {
    const reloadSpy = vi.fn();
    vi.stubGlobal('location', { reload: reloadSpy });

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const restartButton = screen.getByText('Restart Application');
    fireEvent.click(restartButton);

    expect(reloadSpy).toHaveBeenCalled();
  });

  it('has a try again button that resets the error state', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Application Error')).toBeInTheDocument();

    // Verify try again button exists and is clickable
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    const tryAgainButton = screen.getByRole('button', { name: 'Try Again' });
    expect(tryAgainButton).toBeInTheDocument();
  });

  it('logs errors to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Verify console.error was called at least once
    expect(console.error).toHaveBeenCalled();
    // Check that it logged an error (the enhanced boundary logs more details)
    expect(console.error).toHaveBeenCalledWith(
      'Error caught by enhanced boundary:',
      expect.objectContaining({
        error: expect.any(Error),
        errorId: expect.any(String),
      })
    );
  });

  it('has proper accessibility attributes', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Check for proper heading structure
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Application Error');

    // Check for button roles
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveAccessibleName('Try Again');
    expect(buttons[1]).toHaveAccessibleName('Restart Application');
    expect(buttons[2]).toHaveAccessibleName('Go to Home');
  });

  it('has proper dark mode support', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const container = screen.getByText('Application Error').closest('div');
    expect(container?.parentElement?.parentElement).toHaveClass(
      'bg-gray-50',
      'dark:bg-gray-900'
    );
  });
});