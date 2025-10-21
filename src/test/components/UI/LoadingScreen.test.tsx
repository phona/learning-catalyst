import { render, screen } from '@testing-library/react';
import { LoadingScreen } from '@/components/UI/LoadingScreen';

describe('LoadingScreen', () => {
  it('renders the loading spinner', () => {
    render(<LoadingScreen />);

    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });

  it('displays the application title', () => {
    render(<LoadingScreen />);

    const title = screen.getByText('Learning Catalyst');
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('text-2xl', 'font-bold');
  });

  it('shows the initialization message', () => {
    render(<LoadingScreen />);

    const message = screen.getByText('Initializing your AI learning companion...');
    expect(message).toBeInTheDocument();
  });

  it('displays animated dots', () => {
    render(<LoadingScreen />);

    const dots = screen.getAllByTestId('pulse-dot');
    expect(dots).toHaveLength(3);

    dots.forEach((dot, index) => {
      expect(dot).toHaveClass('animate-pulse');
      if (index > 0) {
        expect(dot).toHaveStyle(`animation-delay: ${index * 0.2}s`);
      }
    });
  });

  it('has proper dark mode support', () => {
    render(<LoadingScreen />);

    const container = screen.getByText('Learning Catalyst').closest('div');
    expect(container?.parentElement).toHaveClass(
      'bg-gray-50',
      'dark:bg-gray-900'
    );
  });

  it('centers content properly', () => {
    render(<LoadingScreen />);

    const container = screen.getByText('Learning Catalyst').closest('div');
    expect(container?.parentElement).toHaveClass(
      'flex',
      'items-center',
      'justify-center',
      'min-h-screen'
    );
  });
});