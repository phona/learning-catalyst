import React from 'react';
import { cn } from '@/renderer/utils/cn';

/**
 * Separator Component
 *
 * A visual divider component for separating content sections.
 * Follows the shadcn/ui pattern for consistent design system integration.
 *
 * @example
 * ```tsx
 * <Separator orientation="horizontal" />
 * <Separator orientation="vertical" className="h-4" />
 * ```
 */
export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Orientation of the separator */
  orientation?: 'horizontal' | 'vertical';
  /** Visual style variant */
  variant?: 'default' | 'dashed';
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    {
      className,
      orientation = 'horizontal',
      variant = 'default',
      ...props
    },
    ref,
  ) => {
    const baseStyles = [
      'shrink-0 bg-gray-200 dark:bg-gray-700',
      variant === 'dashed' ? 'border-dashed' : '',
    ];

    const orientationStyles =
      orientation === 'horizontal'
        ? 'h-[1px] w-full'
        : 'h-full w-[1px]';

    return (
      <div
        ref={ref}
        className={cn(baseStyles, orientationStyles, className)}
        role="separator"
        aria-orientation={orientation}
        {...props}
      />
    );
  },
);

Separator.displayName = 'Separator';
