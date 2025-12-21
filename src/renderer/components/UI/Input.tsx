import React from 'react';
import { cn } from '@/renderer/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, type = 'text', label, error, helperText, leftIcon, rightIcon, id, ...props },
    ref,
  ) => {
    // Always call hooks at the top level - no conditional hook calls
    const reactId = React.useId();
    const inputId = id || `input-${reactId}`;

    const inputClasses = cn(
      // Base styles
      'flex-1',
      'px-3 py-2',
      'bg-white dark:bg-gray-900',
      'border border-gray-300 dark:border-gray-600',
      'rounded-lg',
      'text-gray-900 dark:text-gray-100',
      'placeholder-gray-500 dark:placeholder-gray-400',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-primary-500',
      'focus:border-transparent',
      'disabled:opacity-50',
      'disabled:cursor-not-allowed',
      // Error state
      error && 'border-red-500 focus:ring-red-500',
      // Icon spacing
      leftIcon && 'pl-10',
      rightIcon && 'pr-10',
      className,
    );

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 dark:text-gray-400">{leftIcon}</span>
            </div>
          )}

          <input type={type} id={inputId} className={inputClasses} ref={ref} {...props} />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500 dark:text-gray-400">{rightIcon}</span>
            </div>
          )}
        </div>

        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
