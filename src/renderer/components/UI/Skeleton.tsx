import React from 'react';
import { cn } from '@/renderer/utils/cn';

/**
 * 🦴️ Skeleton Loading Component
 *
 * Content-aware loading placeholders that match the final UI structure.
 * Provides better perceived performance than generic spinners.
 *
 * 🎯 What It Does:
 * - Shows the structure of content before it loads
 * - Prevents layout shifts and janky loading states
 * - Provides visual continuity during data fetching
 * - Supports multiple shapes and animations
 *
 * 🔧 Variants:
 * - **text**: Single-line text placeholder (default)
 * - **circular**: Circular placeholder for avatars and icons
 * - **rectangular**: Sharp-edged rectangle placeholder
 * - **rounded**: Rounded rectangle placeholder for cards and buttons
 *
 * 💡 Best Practices:
 * - Match skeleton dimensions to actual content
 * - Use appropriate variant for content type
 * - Consider animation type for context (pulse for subtle, wave for attention)
 * - Combine with skeleton patterns for complex layouts
 *
 * @example
 * ```tsx
 * // Text loading
 * <Skeleton width="100%" height={16} />
 *
 * // Avatar loading
 * <Skeleton variant="circular" width={40} height={40} />
 *
 * // Card loading
 * <Skeleton variant="rounded" width="100%" height={120} />
 *
 * // Custom animation
 * <Skeleton animation="wave" width="80%" height={20} />
 * ```
 */
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual style variant matching content type */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  /** Fixed width (defaults to 100% for text) */
  width?: string | number;
  /** Fixed height (defaults to 1rem for text) */
  height?: string | number;
  /** Animation style for loading effect */
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  ...props
}) => {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-md',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const style = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1rem' : undefined),
  };

  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-700',
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={style}
      {...props}
    />
  );
};

/**
 * 💬 Message Skeleton
 *
 * Chat message placeholder that mimics real message structure.
 * Includes avatar, message lines, and typing indicators for AI messages.
 *
 * @param isUser - Whether to show user message layout (avatar on right)
 *
 * @example
 * ```tsx
 * <MessageSkeleton isUser={false} /> // AI message
 * <MessageSkeleton isUser={true} />  // User message
 * ```
 */
type MessageSkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  isUser?: boolean;
};

export const MessageSkeleton: React.FC<MessageSkeletonProps> = ({
  isUser = false,
  className,
  ...props
}) => {
  return (
    <div
      className={cn('flex gap-3 p-4', isUser && 'flex-row-reverse', className)}
      data-testid={props['data-testid'] ?? `message-skeleton-${isUser ? 'user' : 'assistant'}`}
      {...props}
    >
      {/* Avatar skeleton */}
      <Skeleton
        variant="circular"
        width={32}
        height={32}
        className="flex-shrink-0"
      />

      {/* Message content skeleton */}
      <div className={cn('flex-1 space-y-2', isUser && 'items-end')}>
        <div className="flex items-center gap-2">
          <Skeleton width={80} height={16} className="text-sm" />
          <Skeleton width={60} height={12} className="text-xs" />
        </div>

        {/* Message lines */}
        <Skeleton width="100%" height={20} />
        <Skeleton width="85%" height={20} />
        <Skeleton width="70%" height={20} />

        {/* Typing indicator for AI messages */}
        {!isUser && (
          <div className="flex items-center gap-1 mt-2">
            <Skeleton variant="circular" width={6} height={6} />
            <Skeleton variant="circular" width={6} height={6} className="animation-delay-100" />
            <Skeleton variant="circular" width={6} height={6} className="animation-delay-200" />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 📋 Chat List Skeleton
 *
 * Sidebar chat list placeholder with avatar, title, and timestamp structures.
 * Useful for showing chat loading state in navigation areas.
 *
 * @param count - Number of chat items to display (default: 5)
 *
 * @example
 * ```tsx
 * <ChatListSkeleton count={3} /> // Show 3 loading chat items
 * ```
 */
export const ChatListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 min-w-0">
            <Skeleton width="60%" height={16} className="mb-1" />
            <Skeleton width="80%" height={14} />
          </div>
          <Skeleton width={40} height={12} />
        </div>
      ))}
    </div>
  );
};

/**
 * ⚙️ Settings Skeleton
 *
 * Settings panel placeholder with form sections, toggles, and input fields.
 * Mirrors the actual settings structure for seamless loading transitions.
 *
 * @example
 * ```tsx
 * <SettingsSkeleton /> // Show loading settings panel
 * ```
 */
export const SettingsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        <Skeleton width={120} height={24} />
        <div className="space-y-3">
          <div>
            <Skeleton width={100} height={14} className="mb-2" />
            <Skeleton width="100%" height={40} />
          </div>
          <div>
            <Skeleton width={80} height={14} className="mb-2" />
            <Skeleton width="100%" height={40} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Skeleton width={150} height={20} />
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-1">
              <Skeleton width={120} height={14} />
              <Skeleton width={200} height={12} />
            </div>
            <Skeleton variant="circular" width={44} height={24} />
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-1">
              <Skeleton width={100} height={14} />
              <Skeleton width={180} height={12} />
            </div>
            <Skeleton variant="circular" width={44} height={24} />
          </div>
        </div>
      </div>
    </div>
  );
};
