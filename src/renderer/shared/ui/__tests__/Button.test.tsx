/**
 * Button Component Tests - Real React Testing Library Tests
 *
 * Testing actual component rendering, accessibility, and user interactions
 * with proper React Testing Library approach.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Button } from '../Button';

describe('Button Component', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<Button>Click me</Button>);

      const button = screen.getByRole('button', { name: 'Click me' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
      expect(button).not.toBeDisabled();
    });

    it('should render children correctly', () => {
      render(<Button>Submit Form</Button>);

      expect(screen.getByText('Submit Form')).toBeInTheDocument();
    });

    it('should accept custom className', () => {
      render(<Button className="custom-class">Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Click Behavior', () => {
    it('should handle click events', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not trigger when disabled', async () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>,
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();

      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not trigger when loading', async () => {
      const handleClick = vi.fn();
      render(
        <Button loading onClick={handleClick}>
          Loading
        </Button>,
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();

      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should handle multiple clicks', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Multi-click</Button>);

      const button = screen.getByRole('button');

      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('Variants', () => {
    it('should render primary variant by default', () => {
      render(<Button>Primary</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary-600');
    });

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-100');
    });

    it('should render ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-gray-100');
    });

    it('should render danger variant', () => {
      render(<Button variant="danger">Danger</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600');
    });

    it('should render success variant', () => {
      render(<Button variant="success">Success</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-green-600');
    });
  });

  describe('Sizes', () => {
    it('should render medium size by default', () => {
      render(<Button>Default</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2', 'text-sm');
    });

    it('should render small size', () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('should render large size', () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-3', 'text-base');
    });

    it('should render icon size', () => {
      render(<Button size="icon">Icon</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('p-2');
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      render(<Button loading>Loading</Button>);

      const button = screen.getByRole('button');
      const spinner = button.querySelector('svg');

      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
      expect(button).toBeDisabled();
    });

    it('should display text alongside spinner', () => {
      render(<Button loading>Processing...</Button>);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      const spinner = screen.getByRole('button').querySelector('svg');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Icon Support', () => {
    it('should render icon on left by default', () => {
      const icon = <span data-testid="icon">🔵</span>;
      render(<Button icon={icon}>With Icon</Button>);

      const button = screen.getByRole('button');
      const iconElement = screen.getByTestId('icon');

      expect(iconElement).toBeInTheDocument();
      expect(button).toContainElement(iconElement);
    });

    it('should render icon on right when specified', () => {
      const icon = <span data-testid="icon">🔵</span>;
      render(
        <Button icon={icon} iconPosition="right">
          With Icon
        </Button>,
      );

      const button = screen.getByRole('button');
      const iconElement = screen.getByTestId('icon');

      expect(iconElement).toBeInTheDocument();
      expect(button).toContainElement(iconElement);
    });

    it('should render without icon when not provided', () => {
      render(<Button>No Icon</Button>);

      const button = screen.getByRole('button');
      expect(button.querySelector('[data-testid="icon"]')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button role', () => {
      render(<Button>Accessible</Button>);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should respect disabled state accessibility', () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
      expect(button).toBeDisabled();
    });

    it('should respect aria-label', () => {
      render(<Button aria-label="Custom label">Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom label');
    });

    it('should handle aria-busy when loading', () => {
      render(<Button loading>Loading</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('should be keyboard accessible', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Keyboard Test</Button>);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Form Integration', () => {
    it('should submit form when type is submit', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());

      render(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit</Button>
        </form>,
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    it('should handle custom button types', () => {
      render(<Button type="reset">Reset</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'reset');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing onClick gracefully', () => {
      expect(() => {
        render(<Button>No handler</Button>);
      }).not.toThrow();
    });
  });

  describe('Forward Ref', () => {
    it('should forward ref to button element', () => {
      const ref = { current: null };
      render(<Button ref={ref}>Ref Button</Button>);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current).toHaveTextContent('Ref Button');
    });
  });
});
