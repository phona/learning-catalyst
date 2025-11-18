/**
 * SidebarNavigation Component
 *
 * Handles the main navigation section of the sidebar with proper accessibility
 * and keyboard navigation support.
 */

import React, { memo, useCallback } from 'react';
import type { SidebarNavigationProps, NavigationItem } from './Sidebar.types';

// Memoized Navigation Item Component
const NavigationItemComponent = memo<{
  readonly item: NavigationItem;
  readonly isActive: boolean;
  readonly onClick: (item: NavigationItem) => void;
    }>(({ item, isActive, onClick }) => {
      const Icon = item.icon;

      // Enhanced keyboard event handler with proper typing
      const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(item);
        }
      }, [item, onClick]);

      const handleClick = useCallback(() => {
        onClick(item);
      }, [item, onClick]);

      return (
        <li role="none">
          <button
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
              isActive
                ? 'bg-primary-500 text-white shadow-md'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
            }`}
            title={item.description}
            role="menuitem"
            aria-current={isActive ? 'page' : undefined}
            aria-label={`${item.label} - ${item.description}`}
            aria-describedby={item.badge ? `badge-${item.id}` : undefined}
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
            <span className="font-medium">{item.label}</span>
            {item.badge && (
              <span
                id={`badge-${item.id}`}
                className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  item.badge.variant === 'primary'
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : item.badge.variant === 'success'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : item.badge.variant === 'warning'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : item.badge.variant === 'error'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                }`}
              >
                {item.badge.content}
              </span>
            )}
          </button>
        </li>
      );
    });

NavigationItemComponent.displayName = 'NavigationItemComponent';

// Main SidebarNavigation Component
export const SidebarNavigation = memo<SidebarNavigationProps>(({
  items,
  activePath,
  onItemClick,
  className = '',
}) => {
  // Determine if a navigation item is active
  const isItemActive = useCallback((path: string) => {
    if (path === '/' && activePath === '/') return true;
    return activePath.startsWith(path) && path !== '/';
  }, [activePath]);

  // Handle navigation item click
  const handleItemClick = useCallback((item: NavigationItem) => {
    onItemClick(item);
  }, [onItemClick]);

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className={`flex-1 p-4 ${className}`}
    >
      <ul className="space-y-2" role="menubar" aria-label="Main navigation menu">
        {items.map((item) => (
          <NavigationItemComponent
            key={item.id}
            item={item}
            isActive={isItemActive(item.path)}
            onClick={handleItemClick}
          />
        ))}
      </ul>
    </nav>
  );
});

SidebarNavigation.displayName = 'SidebarNavigation';

// Export with custom comparison for optimal re-rendering
export const SidebarNavigationWithComparison = memo(
  SidebarNavigation,
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.items === nextProps.items &&
      prevProps.activePath === nextProps.activePath &&
      prevProps.onItemClick === nextProps.onItemClick &&
      prevProps.className === nextProps.className
    );
  }
);

SidebarNavigationWithComparison.displayName = 'SidebarNavigationWithComparison';