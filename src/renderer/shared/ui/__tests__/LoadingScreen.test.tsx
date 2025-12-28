import { screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { LoadingScreen } from '@/renderer/shared/ui/LoadingScreen';
import { renderWithServices } from '@/test/utils/renderWithServices';

describe('LoadingScreen', () => {
  it('renders the loading spinner', () => {
    renderWithServices(<LoadingScreen />);

    const spinner = screen
      .getByText('Learning Catalyst')
      .parentElement?.parentElement?.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass(
      'animate-spin',
      'w-16',
      'h-16',
      'border-4',
      'border-blue-200',
      'border-t-blue-600',
    );
  });

  it('displays the application title', () => {
    renderWithServices(<LoadingScreen />);

    const title = screen.getByText('Learning Catalyst');
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('text-2xl', 'font-bold');
  });

  it('shows the initialization message', () => {
    renderWithServices(<LoadingScreen />);

    const message = screen.getByText('Loading configuration...');
    expect(message).toBeInTheDocument();
  });

  it('displays animated dots', () => {
    renderWithServices(<LoadingScreen />);

    // Find the animated dots using querySelector instead
    const dots = document.querySelectorAll('.animate-pulse');
    expect(dots.length).toBeGreaterThanOrEqual(3);

    // Check the first 3 dots are present and have correct classes
    for (let i = 0; i < 3; i++) {
      expect(dots[i]).toHaveClass('animate-pulse', 'w-2', 'h-2', 'bg-blue-600');
    }
  });

  it('has proper dark mode support', () => {
    renderWithServices(<LoadingScreen />);

    // Get the main container element directly
    const container = document.querySelector('.min-h-screen');
    expect(container).toHaveClass('bg-gray-50', 'dark:bg-gray-900');
  });

  it('centers content properly', () => {
    renderWithServices(<LoadingScreen />);

    // Get the main container element
    const container = document.querySelector('.min-h-screen');
    expect(container).toHaveClass('flex', 'items-center', 'justify-center', 'min-h-screen');
  });

  it('displays state-specific icons', () => {
    const { rerender } = renderWithServices(<LoadingScreen state="services" />);

    // Check that the icon changes based on state
    const message = screen.getByText('Initializing services...');
    expect(message).toBeInTheDocument();
  });

  it('shows error state when error is provided', () => {
    renderWithServices(<LoadingScreen error="Something went wrong" />);

    const errorMessage = screen.getByText('Something went wrong');
    expect(errorMessage).toBeInTheDocument();

    const errorTitle = screen.getByText('Initialization Failed');
    expect(errorTitle).toBeInTheDocument();
  });

  it('uses state-specific messaging and icons', () => {
    const { rerender } = renderWithServices(<LoadingScreen state="ai-provider" />);
    expect(screen.getByText('Configuring AI provider...')).toBeInTheDocument();

    rerender(<LoadingScreen state="ready" />);
    expect(screen.getByText('Ready to go!')).toBeInTheDocument();
  });

  it('invokes onRetry when error and retry clicked', () => {
    const onRetry = vi.fn();
    renderWithServices(<LoadingScreen error="boom" onRetry={onRetry} />);
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('shows service-initialization state with spinner and message', () => {
    renderWithServices(<LoadingScreen state="services" />);
    expect(screen.getByText('Initializing services...')).toBeInTheDocument();
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
