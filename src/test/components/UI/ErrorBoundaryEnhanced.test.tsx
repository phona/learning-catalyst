import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundaryEnhanced } from '@/components/UI/ErrorBoundaryEnhanced';

// Mock console.error to avoid test noise
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalError;
});

// Test component that throws an error
const ThrowingComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Test component with props
const ComponentWithProps: React.FC<{ message: string }> = ({ message }) => {
  return <div>{message}</div>;
};

describe('ErrorBoundaryEnhanced', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundaryEnhanced>
        <div>Test content</div>
      </ErrorBoundaryEnhanced>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should catch and display error for thrown errors', () => {
    render(
      <ErrorBoundaryEnhanced>
        <ThrowingComponent />
      </ErrorBoundaryEnhanced>
    );

    expect(screen.getByText(/Application Error/i)).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error fallback</div>;

    render(
      <ErrorBoundaryEnhanced fallback={customFallback}>
        <ThrowingComponent />
      </ErrorBoundaryEnhanced>
    );

    expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
    expect(screen.queryByText(/Application Error/i)).not.toBeInTheDocument();
  });

  it('should show retry button and allow retrying', async () => {
    const { rerender } = render(
      <ErrorBoundaryEnhanced>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundaryEnhanced>
    );

    // Should show error state
    expect(screen.getByText(/Application Error/i)).toBeInTheDocument();

    // Click retry button
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    // Should attempt to retry - but still show error since component still throws
    await waitFor(() => {
      expect(screen.getByText(/Application Error/i)).toBeInTheDocument();
    });
  });

  it('should render minimal variant correctly', () => {
    render(
      <ErrorBoundaryEnhanced variant="minimal">
        <ThrowingComponent />
      </ErrorBoundaryEnhanced>
    );

    expect(screen.getByText(/Component failed to load/i)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should render inline variant correctly', () => {
    render(
      <ErrorBoundaryEnhanced variant="inline">
        <ThrowingComponent />
      </ErrorBoundaryEnhanced>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should use custom title and description', () => {
    render(
      <ErrorBoundaryEnhanced
        variant="inline"
        title="Custom Title"
        description="Custom description of what happened"
      >
        <ThrowingComponent />
      </ErrorBoundaryEnhanced>
    );

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom description of what happened')).toBeInTheDocument();
  });

  it('should hide retry button when showRetry is false', () => {
    render(
      <ErrorBoundaryEnhanced showRetry={false}>
        <ThrowingComponent />
      </ErrorBoundaryEnhanced>
    );

    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    expect(screen.getByText('Restart Application')).toBeInTheDocument();
  });

  it('should call onError callback when provided', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundaryEnhanced onError={onError}>
        <ThrowingComponent />
      </ErrorBoundaryEnhanced>
    );

    expect(onError).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should call onRetry callback when provided', () => {
    const onRetry = vi.fn();

    render(
      <ErrorBoundaryEnhanced onRetry={onRetry}>
        <ThrowingComponent />
      </ErrorBoundaryEnhanced>
    );

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalled();
  });

  it('should render custom actions when provided', () => {
    const CustomAction = () => <button>Custom Action</button>;

    render(
      <ErrorBoundaryEnhanced customActions={<CustomAction />}>
        <ThrowingComponent />
      </ErrorBoundaryEnhanced>
    );

    expect(screen.getByText('Custom Action')).toBeInTheDocument();
  });

  it('should show error details in development mode', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundaryEnhanced>
        <ThrowingComponent />
      </ErrorBoundaryEnhanced>
    );

    expect(screen.getByText(/Error Details/i)).toBeInTheDocument();

    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should generate error ID', () => {
    render(
      <ErrorBoundaryEnhanced variant="inline">
        <ThrowingComponent />
      </ErrorBoundaryEnhanced>
    );

    // Error ID should be present in development mode
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundaryEnhanced variant="inline">
        <ThrowingComponent />
      </ErrorBoundaryEnhanced>
    );

    expect(screen.getByText(/Error ID: error_\d+_\w+/)).toBeInTheDocument();

    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should allow successful retry after fixing the error', async () => {
    let shouldThrow = true;

    const { rerender } = render(
      <ErrorBoundaryEnhanced>
        <ThrowingComponent shouldThrow={shouldThrow} />
      </ErrorBoundaryEnhanced>
    );

    // Should show error initially
    expect(screen.getByText(/Application Error/i)).toBeInTheDocument();

    // Fix the component and retry
    shouldThrow = false;
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    // Should show success state
    await waitFor(() => {
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });
});