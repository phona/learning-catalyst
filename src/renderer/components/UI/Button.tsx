


import React from 'react';
import { cn } from '@/renderer/utils/cn';

// Base button variants for consistent design system
const buttonVariants = {
  variant: {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500',
    secondary: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 focus:ring-gray-500',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
  },
  size: {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    icon: 'p-2',
  },
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants.variant;
  size?: keyof typeof buttonVariants.size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'left',
    children,
    disabled,
    type = 'button',
    ...props
  }, ref) => {
    const baseClasses = [
      // Base styles
      'inline-flex items-center justify-center',
      'font-medium',
      'rounded-lg',
      'transition-colors',
      'duration-200',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2',
      'dark:focus:ring-offset-gray-900',
      'disabled:opacity-50',
      'disabled:cursor-not-allowed',
      // Apply variant and size
      buttonVariants.variant[variant],
      buttonVariants.size[size],
    ];

    const renderContent = (): React.ReactNode => {
      if (loading) {
        return (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {children}
          </>
        );
      }

      if (icon && iconPosition === 'left') {
        return (
          <>
            <span className="mr-2">{icon}</span>
            {children}
          </>
        );
      }

      if (icon && iconPosition === 'right') {
        return (
          <>
            {children}
            <span className="ml-2">{icon}</span>
          </>
        );
      }

      return children;
    };

    return (
      <button
        className={cn(...baseClasses, className)}
        ref={ref}
        disabled={disabled || loading}
        type={type}
        aria-busy={loading ? 'true' : undefined}
        {...props}
      >
        {renderContent()}
      </button>
    );
  }
);

Button.displayName = 'Button';
