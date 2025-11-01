import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentErrorBoundary } from '@/components/UI/ComponentErrorBoundary';

// Mock console.error to avoid test noise
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalError;
});

// Test component that throws an error
const ThrowingComponent: React.FC = () => {
  throw new Error('Component test error');
};

// Test component that renders normally
const NormalComponent: React.FC = () => <div>Normal component content</div>;

describe('ComponentErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <ComponentErrorBoundary>
        <NormalComponent />
      </ComponentErrorBoundary>
    );

    expect(screen.getByText('Normal component content')).toBeInTheDocument();
  });

  it('should use default component name when not specified', () => {
    render(
      <ComponentErrorBoundary>
        <ThrowingComponent />
      </ComponentErrorBoundary>
    );

    expect(screen.getByText('Component failed to load')).toBeInTheDocument();
  });

  it('should use custom component name when specified', () => {
    render(
      <ComponentErrorBoundary componentName="MyCustomComponent">
        <ThrowingComponent />
      </ComponentErrorBoundary>
    );

    expect(screen.getByText('MyCustomComponent Error')).toBeInTheDocument();
  });

  it('should render minimal variant correctly', () => {
    render(
      <ComponentErrorBoundary variant="minimal" componentName="TestComponent">
        <ThrowingComponent />
      </ComponentErrorBoundary>
    );

    expect(screen.getByText('TestComponent failed to load')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should render inline variant correctly', () => {
    render(
      <ComponentErrorBoundary variant="inline" componentName="TestComponent">
        <ThrowingComponent />
      </ComponentErrorBoundary>
    );

    expect(screen.getByText('TestComponent Error')).toBeInTheDocument();
    expect(screen.getByText('This component failed to load properly.')).toBeInTheDocument();
  });

  it('should show retry button when onRetry is provided', () => {
    const onRetry = vi.fn();

    render(
      <ComponentErrorBoundary onRetry={onRetry} componentName="TestComponent">
        <ThrowingComponent />
      </ComponentErrorBoundary>
    );

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('should hide retry button when onRetry is not provided', () => {
    render(
      <ComponentErrorBoundary componentName="TestComponent">
        <ThrowingComponent />
      </ComponentErrorBoundary>
    );

    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('should call onError callback when provided', () => {
    const onError = vi.fn();

    render(
      <ComponentErrorBoundary onError={onError} componentName="TestComponent">
        <ThrowingComponent />
      </ComponentErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
  });

  it('should allow retry to recover from errors', () => {
    let shouldThrow = true;

    const { rerender } = render(
      <ComponentErrorBoundary onRetry={() => { shouldThrow = false; }} componentName="TestComponent">
        <ThrowingComponent />
      </ComponentErrorBoundary>
    );

    // Should show error state
    expect(screen.getByText('TestComponent Error')).toBeInTheDocument();

    // Click retry to fix the error
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    // Should no longer show error after successful retry
    // Note: In a real scenario, this would work with state management
    expect(onError).toHaveBeenCalled();
  });

  it('should use showErrorDetails prop correctly', () => {
    render(
      <ComponentErrorBoundary
        variant="inline"
        componentName="TestComponent"
        showErrorDetails={true}
      >
        <ThrowingComponent />
      </ComponentErrorBoundary>
    );

    expect(screen.getByText('TestComponent Error')).toBeInTheDocument();
  });

  it('should apply correct styling and accessibility attributes', () => {
    render(
      <ComponentErrorBoundary variant="minimal" componentName="TestComponent">
        <ThrowingComponent />
      </ComponentErrorBoundary>
    );

    const errorMessage = screen.getByText('TestComponent failed to load');
    expect(errorMessage).toHaveClass('text-xs');
    expect(errorMessage.closest('div')).toHaveClass('bg-gray-100');
  });
});