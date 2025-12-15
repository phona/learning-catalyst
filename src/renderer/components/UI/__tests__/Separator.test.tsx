/**
 * Separator Component Tests
 *
 * Comprehensive test suite for the Separator component ensuring:
 * - Proper rendering with different orientations
 * - Visual style variants work correctly
 * - Accessibility attributes are applied
 * - ClassName merging works as expected
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Separator } from '../Separator';
import { cn } from '@/renderer/utils/cn';

// Mock the cn utility
vi.mock('@/renderer/utils/cn', () => ({
  cn: vi.fn((...classes: string[]) => classes.filter(Boolean).join(' ')),
}));

describe('Separator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render horizontal separator by default', () => {
      render(<Separator />);

      const separator = screen.getByRole('separator');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
      expect(separator).toHaveClass('h-[1px]', 'w-full');
    });

    it('should render vertical separator when specified', () => {
      render(<Separator orientation="vertical" />);

      const separator = screen.getByRole('separator');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveAttribute('aria-orientation', 'vertical');
      expect(separator).toHaveClass('h-full', 'w-[1px]');
    });

    it('should render with default variant', () => {
      render(<Separator />);

      const separator = screen.getByRole('separator');
      expect(separator).toHaveClass('bg-gray-200', 'dark:bg-gray-700');
    });

    it('should render with dashed variant', () => {
      render(<Separator variant="dashed" />);

      const separator = screen.getByRole('separator');
      expect(separator).toHaveClass('border-dashed');
    });
  });

  describe('Accessibility', () => {
    it('should have proper role attribute', () => {
      render(<Separator />);

      expect(screen.getByRole('separator')).toBeInTheDocument();
    });

    it('should set aria-orientation correctly', () => {
      const { rerender } = render(<Separator orientation="horizontal" />);
      expect(screen.getByRole('separator')).toHaveAttribute(
        'aria-orientation',
        'horizontal',
      );

      rerender(<Separator orientation="vertical" />);
      expect(screen.getByRole('separator')).toHaveAttribute(
        'aria-orientation',
        'vertical',
      );
    });
  });

  describe('Styling', () => {
    it('should apply custom className correctly', () => {
      const customClass = 'custom-separator-class';
      render(<Separator className={customClass} />);

      const separator = screen.getByRole('separator');
      expect(separator).toHaveClass(customClass);
    });

    it('should merge cn utility classes correctly', () => {
      render(<Separator />);

      const separator = screen.getByRole('separator');
      expect(separator).toHaveClass(
        'shrink-0',
        'bg-gray-200',
        'dark:bg-gray-700',
        'h-[1px]',
        'w-full',
      );
    });

    it('should apply base styles', () => {
      render(<Separator />);

      const separator = screen.getByRole('separator');
      expect(separator).toHaveClass(
        'shrink-0',
        'bg-gray-200',
        'dark:bg-gray-700',
      );
    });
  });

  describe('Props', () => {
    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Separator ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should forward HTML div props', () => {
      render(
        <Separator
          data-testid="test-separator"
          id="test-id"
          aria-label="Test separator"
        />,
      );

      const separator = screen.getByTestId('test-separator');
      expect(separator).toHaveAttribute('id', 'test-id');
      expect(separator).toHaveAttribute('aria-label', 'Test separator');
    });
  });

  describe('Visual Variants', () => {
    it('should render with solid border by default', () => {
      render(<Separator />);

      const separator = screen.getByRole('separator');
      // Should have background color, not border
      expect(separator).toHaveClass('bg-gray-200');
      expect(separator).not.toHaveClass('border-dashed');
    });

    it('should render dashed border when specified', () => {
      render(<Separator variant="dashed" />);

      const separator = screen.getByRole('separator');
      expect(separator).toHaveClass('border-dashed');
    });
  });

  describe('Display Name', () => {
    it('should have correct display name', () => {
      expect(Separator.displayName).toBe('Separator');
    });
  });
});
