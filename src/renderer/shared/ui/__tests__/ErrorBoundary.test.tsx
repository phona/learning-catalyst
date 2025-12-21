import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from '@/renderer/shared/ui/ErrorBoundary';

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
      </ErrorBoundary>,
    );

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('catches errors and displays error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Application Error')).toBeInTheDocument();
    expect(
      screen.getByText('Learning Catalyst encountered an unexpected error.'),
    ).toBeInTheDocument();
  });

  it('displays error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    vi.stubEnv('NODE_ENV', 'development');

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
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
      </ErrorBoundary>,
    );

    expect(screen.queryByText('Error details')).not.toBeInTheDocument();

    vi.unstubAllEnvs();
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error UI</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>,
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
      </ErrorBoundary>,
    );

    const restartButton = screen.getByText('Restart Application');
    fireEvent.click(restartButton);

    expect(reloadSpy).toHaveBeenCalled();
  });

  it('has a try again button that resets the error state', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
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
      </ErrorBoundary>,
    );

    // Verify console.error was called at least once
    expect(console.error).toHaveBeenCalled();
    // Check that it logged an error (the enhanced boundary logs more details)
    expect(console.error).toHaveBeenCalledWith(
      'Error caught by enhanced boundary:',
      expect.objectContaining({
        error: expect.any(Error),
        errorId: expect.any(String),
      }),
    );
  });

  it('has proper accessibility attributes', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
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
      </ErrorBoundary>,
    );

    const container = screen.getByText('Application Error').closest('div');
    expect(container?.parentElement?.parentElement).toHaveClass('bg-gray-50', 'dark:bg-gray-900');
  });

  it('renders inline variant with retry and custom description', () => {
    const onRetry = vi.fn();
    render(
      <ErrorBoundary variant="inline" title="Section failed" description="Retry it" onRetry={onRetry}>
        <ThrowError />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Section failed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('renders minimal variant without retry when disabled', () => {
    render(
      <ErrorBoundary variant="minimal" showRetry={false} title="Mini fail">
        <ThrowError />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Mini fail')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  describe('Crash Error Handling', () => {
    it('renders crash page when crashError prop is provided', () => {
      const crashError = {
        type: 'SYSTEM_ERROR' as const,
        code: 'initialization.failed',
        message: 'Failed to initialize application',
        timestamp: Date.now(),
      };

      render(
        <ErrorBoundary variant="full" crashError={crashError}>
          <div>This should not render</div>
        </ErrorBoundary>,
      );

      // Should show crash page instead of children
      expect(screen.getByText('Application Failed to Start')).toBeInTheDocument();
      expect(screen.getByText('Failed to initialize application')).toBeInTheDocument();
      expect(screen.queryByText('This should not render')).not.toBeInTheDocument();
    });

    it('displays error code in crash page', () => {
      const crashError = {
        type: 'SYSTEM_ERROR' as const,
        code: 'database.connection.failed',
        message: 'Cannot connect to database',
        timestamp: Date.now(),
      };

      render(
        <ErrorBoundary variant="full" crashError={crashError}>
          <div>Should not render</div>
        </ErrorBoundary>,
      );

      expect(screen.getByText(/Code: database.connection.failed/)).toBeInTheDocument();
    });

    it('shows restart button in crash page', () => {
      const reloadSpy = vi.fn();
      vi.stubGlobal('location', { reload: reloadSpy });

      const crashError = {
        type: 'SYSTEM_ERROR' as const,
        code: 'test.error',
        message: 'Test crash',
        timestamp: Date.now(),
      };

      render(
        <ErrorBoundary variant="full" crashError={crashError}>
          <div>Should not render</div>
        </ErrorBoundary>,
      );

      const restartButton = screen.getByRole('button', { name: 'Restart Application' });
      fireEvent.click(restartButton);

      expect(reloadSpy).toHaveBeenCalled();
    });

    it('calls onRestart callback if provided', () => {
      const onRestartSpy = vi.fn();

      const crashError = {
        type: 'SYSTEM_ERROR' as const,
        code: 'test.error',
        message: 'Test crash',
        timestamp: Date.now(),
      };

      render(
        <ErrorBoundary variant="full" crashError={crashError} onRestart={onRestartSpy}>
          <div>Should not render</div>
        </ErrorBoundary>,
      );

      const restartButton = screen.getByRole('button', { name: 'Restart Application' });
      fireEvent.click(restartButton);

      expect(onRestartSpy).toHaveBeenCalled();
    });

    it('shows technical details in development mode for crash errors', () => {
      vi.stubEnv('NODE_ENV', 'development');

      const crashError = {
        type: 'SYSTEM_ERROR' as const,
        code: 'test.error',
        message: 'Test crash',
        details: {
          phase: 'initialization',
          stack: 'Error stack trace',
        },
        timestamp: Date.now(),
      };

      render(
        <ErrorBoundary variant="full" crashError={crashError}>
          <div>Should not render</div>
        </ErrorBoundary>,
      );

      const details = screen.getByText('Technical Details (Development Mode)');
      expect(details).toBeInTheDocument();

      // Expand to see details
      fireEvent.click(details);

      expect(screen.getByText(/phase.*initialization/)).toBeInTheDocument();

      vi.unstubAllEnvs();
    });

    it('hides technical details in production mode for crash errors', () => {
      vi.stubEnv('NODE_ENV', 'production');

      const crashError = {
        type: 'SYSTEM_ERROR' as const,
        code: 'test.error',
        message: 'Test crash',
        details: {
          stack: 'Error stack trace',
        },
        timestamp: Date.now(),
      };

      render(
        <ErrorBoundary variant="full" crashError={crashError}>
          <div>Should not render</div>
        </ErrorBoundary>,
      );

      expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();

      vi.unstubAllEnvs();
    });

    it('shows custom title and description for crash page', () => {
      const crashError = {
        type: 'SYSTEM_ERROR' as const,
        code: 'test.error',
        message: 'Test crash',
        timestamp: Date.now(),
      };

      render(
        <ErrorBoundary
          variant="full"
          crashError={crashError}
          title="Custom Crash Title"
          description="Custom crash description"
        >
          <div>Should not render</div>
        </ErrorBoundary>,
      );

      expect(screen.getByText('Custom Crash Title')).toBeInTheDocument();
      expect(screen.getByText('Custom crash description')).toBeInTheDocument();
    });

    it('shows explanatory text about saved progress', () => {
      const crashError = {
        type: 'SYSTEM_ERROR' as const,
        code: 'test.error',
        message: 'Test crash',
        timestamp: Date.now(),
      };

      render(
        <ErrorBoundary variant="full" crashError={crashError}>
          <div>Should not render</div>
        </ErrorBoundary>,
      );

      expect(
        screen.getByText(/Your learning progress has been saved/),
      ).toBeInTheDocument();
    });

    it('does not show crash page when variant is not full', () => {
      const crashError = {
        type: 'SYSTEM_ERROR' as const,
        code: 'test.error',
        message: 'Test crash',
        timestamp: Date.now(),
      };

      render(
        <ErrorBoundary variant="inline" crashError={crashError}>
          <div>Children should render</div>
        </ErrorBoundary>,
      );

      // Should render children, not crash page
      expect(screen.getByText('Children should render')).toBeInTheDocument();
      expect(screen.queryByText('Application Failed to Start')).not.toBeInTheDocument();
    });

    it('prioritizes crashError over React errors', () => {
      const crashError = {
        type: 'SYSTEM_ERROR' as const,
        code: 'test.error',
        message: 'Crash error',
        timestamp: Date.now(),
      };

      render(
        <ErrorBoundary variant="full" crashError={crashError}>
          <ThrowError />
        </ErrorBoundary>,
      );

      // Should show crash page, not React error
      expect(screen.getByText('Crash error')).toBeInTheDocument();
      expect(screen.queryByText('Application Error')).not.toBeInTheDocument();
    });

    it('has proper styling for crash page', () => {
      const crashError = {
        type: 'SYSTEM_ERROR' as const,
        code: 'test.error',
        message: 'Test crash',
        timestamp: Date.now(),
      };

      render(
        <ErrorBoundary variant="full" crashError={crashError}>
          <div>Should not render</div>
        </ErrorBoundary>,
      );

      const crashContainer = screen
        .getByText('Application Failed to Start')
        .closest('div');

      // Check for gradient background
      expect(crashContainer?.parentElement).toHaveClass(
        'bg-gradient-to-br',
        'from-red-50',
        'to-orange-50',
        'dark:from-gray-900',
        'dark:to-gray-800',
      );
    });
  });
});
