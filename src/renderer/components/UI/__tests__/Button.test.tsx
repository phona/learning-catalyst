/**
 * Button Component Tests - Focused on Reliability
 *
 * Testing critical user interactions that can cause real bugs:
 * - Click handlers work correctly
 * - Loading state prevents double-clicks
 * - Disabled state is respected
 * - Basic functionality doesn't break
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button - Critical Reliability Tests', () => {
  it('should call click handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call click handler when disabled', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled button</Button>);

    const button = screen.getByRole('button', { name: 'Disabled button' });
    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should not call click handler when loading', () => {
    const handleClick = vi.fn();
    render(<Button loading onClick={handleClick}>Loading button</Button>);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should show loading spinner and prevent double-clicks', () => {
    const handleClick = vi.fn();
    render(<Button loading onClick={handleClick}>Save</Button>);

    // Check for loading spinner using querySelector
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();

    // Try to click multiple times
    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    // Handler should never be called during loading
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should handle custom props without breaking', () => {
    const handleClick = vi.fn();
    render(
      <Button
        variant="secondary"
        size="lg"
        onClick={handleClick}
        data-testid="custom-button"
        aria-label="Custom button"
      >
        Custom button
      </Button>
    );

    const button = screen.getByLabelText('Custom button');
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(button).toHaveAttribute('data-testid', 'custom-button');
  });

  it('should handle icon positioning without breaking', () => {
    const mockIcon = <span data-testid="test-icon">Icon</span>;
    const handleClick = vi.fn();

    // Test left icon
    const { unmount } = render(
      <Button icon={mockIcon} iconPosition="left" onClick={handleClick}>
        With icon
      </Button>
    );

    const button = screen.getByRole('button', { name: /With icon/ });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
    unmount();

    // Test right icon
    render(
      <Button icon={mockIcon} iconPosition="right" onClick={handleClick}>
        With icon
      </Button>
    );

    const button2 = screen.getByRole('button', { name: /With icon/ });
    fireEvent.click(button2);
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('should be keyboard accessible', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit</Button>);

    const button = screen.getByRole('button', { name: 'Submit' });

    // Test keyboard accessibility - buttons should be focusable
    expect(button).not.toBeDisabled();

    // Test focus ability
    button.focus();
    expect(button).toHaveFocus();

    // Test that click works programmatically
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should handle edge cases gracefully', () => {
    // Empty button - use render with cleanup to avoid multiple buttons
    const { unmount } = render(<Button></Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
    unmount();

    // Button with only icon
    const mockIcon = <span>Icon</span>;
    render(<Button icon={mockIcon}></Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should respect disabled state even with other props', () => {
    const handleClick = vi.fn();
    render(
      <Button
        disabled
        loading={false}
        variant="primary"
        onClick={handleClick}
      >
        Disabled but styled
      </Button>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should handle missing onClick gracefully', () => {
    // Should not throw error when no onClick provided
    expect(() => {
      render(<Button>No handler</Button>);
      const button = screen.getByRole('button');
      fireEvent.click(button);
    }).not.toThrow();
  });
});