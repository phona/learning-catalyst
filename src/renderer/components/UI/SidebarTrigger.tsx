import React from 'react';
import { Button, type ButtonProps } from './Button';

/**
 * SidebarTrigger Component
 *
 * A specialized button component for triggering sidebar navigation or panel actions.
 * Acts as a pure UI affordance that signals user intent without coupling to state management.
 *
 * This component follows the composition pattern where:
 * - It emits the trigger intent through onClick
 * - The parent component decides what action to take
 * - No internal state management or routing logic
 *
 * @example
 * ```tsx
 * <SidebarTrigger onClick={() => navigate('/knowledge')}>
 *   Knowledge Map
 * </SidebarTrigger>
 *
 * <SidebarTrigger asChild>
 *   <Button variant="secondary">Custom Button</Button>
 * </SidebarTrigger>
 * ```
 */
export interface SidebarTriggerProps extends Omit<ButtonProps, 'variant'> {
  /** Whether to render as a child component (for composition) */
  asChild?: boolean;
  /** Button variant (default: ghost) */
  variant?: ButtonProps['variant'];
}

/**
 * SidebarTrigger that renders as a button by default.
 * When asChild is true, it acts as a wrapper for composition patterns.
 */
export const SidebarTrigger = React.forwardRef<HTMLButtonElement, SidebarTriggerProps>(
  (
    {
      asChild = false,
      children,
      variant = 'ghost',
      ...props
    },
    ref,
  ) => {
    // When asChild is used, we return children directly
    // This allows composition with other components
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...props,
        // Merge ref if child supports it
        ref,
      } as any);
    }

    // Default render as Button with ghost variant
    return (
      <Button
        ref={ref}
        variant={variant}
        {...props}
      >
        {children}
      </Button>
    );
  },
);

SidebarTrigger.displayName = 'SidebarTrigger';
