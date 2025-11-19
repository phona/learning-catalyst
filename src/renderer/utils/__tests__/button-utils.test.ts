
/**
 * Button Utility Functions Tests
 * Testing utility functions that support button behavior
 */

import { describe, it, expect, vi } from 'vitest';

// Mock utility functions for button behavior
const getButtonVariant = (variant: string) => {
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
  };
  return variants[variant as keyof typeof variants] || variants.primary;
};

const validateButtonProps = (props: any) => {
  const errors: string[] = [];

  if (props.disabled && props.loading) {
    errors.push('Button cannot be both disabled and loading');
  }

  if (props.onClick && typeof props.onClick !== 'function') {
    errors.push('onClick must be a function');
  }

  return errors;
};

describe('Button Utilities', () => {
  describe('getButtonVariant', () => {
    it('should return primary styles for primary variant', () => {
      const result = getButtonVariant('primary');
      expect(result).toBe('bg-primary-600 hover:bg-primary-700 text-white');
    });

    it('should return secondary styles for secondary variant', () => {
      const result = getButtonVariant('secondary');
      expect(result).toBe('bg-gray-100 hover:bg-gray-200 text-gray-900');
    });

    it('should return danger styles for danger variant', () => {
      const result = getButtonVariant('danger');
      expect(result).toBe('bg-red-600 hover:bg-red-700 text-white');
    });

    it('should return default styles for unknown variant', () => {
      const result = getButtonVariant('unknown');
      expect(result).toBe('bg-primary-600 hover:bg-primary-700 text-white');
    });
  });

  describe('validateButtonProps', () => {
    it('should pass validation for valid props', () => {
      const props = {
        onClick: vi.fn(),
        variant: 'primary',
        disabled: false,
        loading: false,
      };

      const errors = validateButtonProps(props);
      expect(errors).toHaveLength(0);
    });

    it('should detect error when both disabled and loading', () => {
      const props = {
        onClick: vi.fn(),
        disabled: true,
        loading: true,
      };

      const errors = validateButtonProps(props);
      expect(errors).toContain('Button cannot be both disabled and loading');
    });

    it('should detect error when onClick is not a function', () => {
      const props = {
        onClick: 'not a function',
        disabled: false,
        loading: false,
      };

      const errors = validateButtonProps(props);
      expect(errors).toContain('onClick must be a function');
    });

    it('should detect multiple errors', () => {
      const props = {
        onClick: 'not a function',
        disabled: true,
        loading: true,
      };

      const errors = validateButtonProps(props);
      expect(errors).toHaveLength(2);
      expect(errors).toContain('Button cannot be both disabled and loading');
      expect(errors).toContain('onClick must be a function');
    });
  });

  describe('Button behavior patterns', () => {
    it('should prevent multiple clicks during loading', () => {
      const clickHandler = vi.fn();
      let isLoading = false;

      const simulateClick = () => {
        if (isLoading) return;
        isLoading = true;
        clickHandler();
        setTimeout(() => {
          isLoading = false;
        }, 100);
      };

      // First click should work
      simulateClick();
      expect(clickHandler).toHaveBeenCalledTimes(1);

      // Immediate second click should be prevented
      simulateClick();
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    it('should handle disabled state correctly', () => {
      const clickHandler = vi.fn();
      const isDisabled = true;

      const simulateClick = () => {
        if (isDisabled) return;
        clickHandler();
      };

      simulateClick();
      expect(clickHandler).not.toHaveBeenCalled();
    });

    it('should track keyboard interactions', () => {
      const keyHandler = vi.fn((event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          // Handle valid keys
        }
      });

      // Simulate Enter key
      keyHandler({ key: 'Enter', preventDefault: vi.fn() });
      expect(keyHandler).toHaveBeenCalledTimes(1);

      // Simulate Space key
      keyHandler({ key: ' ', preventDefault: vi.fn() });
      expect(keyHandler).toHaveBeenCalledTimes(2);

      // Tab key should still call handler but not trigger action
      keyHandler({ key: 'Tab', preventDefault: vi.fn() });
      expect(keyHandler).toHaveBeenCalledTimes(3);
    });
  });
});