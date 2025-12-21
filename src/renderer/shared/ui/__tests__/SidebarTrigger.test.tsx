/**
 * SidebarTrigger Component Tests
 *
 * Comprehensive test suite for the SidebarTrigger component ensuring:
 * - Proper rendering as a button
 * - Composition pattern with asChild works
 * - Event handlers are forwarded correctly
 * - All Button props are supported
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { SidebarTrigger } from '../SidebarTrigger';
import { Button } from '../Button';

// Mock the Button component
vi.mock('../Button', () => ({
  Button: vi.fn(({ children, ...props }) => (
    <button data-testid="button" {...props}>
      {children}
    </button>
  )),
}));

describe('SidebarTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render as a button by default', () => {
      render(<SidebarTrigger>Test Trigger</SidebarTrigger>);

      expect(screen.getByTestId('button')).toBeInTheDocument();
      expect(screen.getByText('Test Trigger')).toBeInTheDocument();
    });

    it('should use ghost variant by default', () => {
      render(<SidebarTrigger>Test Trigger</SidebarTrigger>);

      const button = screen.getByTestId('button');
      expect(button).toHaveAttribute('data-variant', 'ghost');
    });

    it('should support custom variant', () => {
      render(<SidebarTrigger variant="primary">Test Trigger</SidebarTrigger>);

      const button = screen.getByTestId('button');
      expect(button).toHaveAttribute('data-variant', 'primary');
    });
  });

  describe('asChild Composition', () => {
    it('should render child element when asChild is true', () => {
      render(
        <SidebarTrigger asChild>
          <Button variant="secondary">Custom Button</Button>
        </SidebarTrigger>,
      );

      // Should render the child Button, not the default Button
      expect(screen.getByText('Custom Button')).toBeInTheDocument();
    });

    it('should merge props into child element', () => {
      const handleClick = vi.fn();
      render(
        <SidebarTrigger asChild onClick={handleClick}>
          <Button>Click Me</Button>
        </SidebarTrigger>,
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should pass ref to child element', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(
        <SidebarTrigger asChild ref={ref}>
          <Button>With Ref</Button>
        </SidebarTrigger>,
      );

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('Event Handling', () => {
    it('should handle click events', () => {
      const handleClick = vi.fn();
      render(<SidebarTrigger onClick={handleClick}>Test</SidebarTrigger>);

      const button = screen.getByTestId('button');
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should forward all button props', () => {
      const handleClick = vi.fn();
      const handleMouseEnter = vi.fn();

      render(
        <SidebarTrigger
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          disabled
          type="submit"
        >
          Test
        </SidebarTrigger>,
      );

      const button = screen.getByTestId('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('type', 'submit');

      fireEvent.click(button);
      fireEvent.mouseEnter(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleMouseEnter).toHaveBeenCalledTimes(1);
    });
  });

  describe('Props Forwarding', () => {
    it('should forward HTML button attributes', () => {
      render(
        <SidebarTrigger
          data-testid="sidebar-trigger"
          id="trigger-id"
          aria-label="Test trigger"
        >
          Test
        </SidebarTrigger>,
      );

      const button = screen.getByTestId('sidebar-trigger');
      expect(button).toHaveAttribute('id', 'trigger-id');
      expect(button).toHaveAttribute('aria-label', 'Test trigger');
    });

    it('should support custom className', () => {
      render(<SidebarTrigger className="custom-class">Test</SidebarTrigger>);

      const button = screen.getByTestId('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should support icon prop', () => {
      const Icon = () => <span data-testid="icon">Icon</span>;
      render(<SidebarTrigger icon={<Icon />}>With Icon</SidebarTrigger>);

      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });
  });

  describe('Button Integration', () => {
    it('should render Button component with correct props', () => {
      render(<SidebarTrigger>Test Button</SidebarTrigger>);

      const button = screen.getByTestId('button');
      expect(button).toBeInTheDocument();
    });

    it('should pass children to Button', () => {
      render(<SidebarTrigger>Click me</SidebarTrigger>);

      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should apply default variant when not specified', () => {
      render(<SidebarTrigger>Default</SidebarTrigger>);

      const button = screen.getByTestId('button');
      expect(button).toHaveAttribute('data-variant', 'ghost');
    });
  });

  describe('TypeScript Props', () => {
    it('should accept ButtonProps without variant', () => {
      render(
        <SidebarTrigger
          size="lg"
          loading
          icon={<span>Icon</span>}
          iconPosition="right"
        >
          Test
        </SidebarTrigger>,
      );

      const button = screen.getByTestId('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Display Name', () => {
    it('should have correct display name', () => {
      expect(SidebarTrigger.displayName).toBe('SidebarTrigger');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid children gracefully when asChild is true', () => {
      // This tests React.cloneElement behavior
      render(
        <SidebarTrigger asChild>
          <span>Text Node</span>
        </SidebarTrigger>,
      );

      expect(screen.getByText('Text Node')).toBeInTheDocument();
    });

    it('should not render when children is null with asChild', () => {
      render(
        <SidebarTrigger asChild>
          {null}
        </SidebarTrigger>,
      );

      // Should not crash
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});
