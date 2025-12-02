/**
 * SidebarNavigation Component
 *
 * Handles the main navigation section of the sidebar with proper accessibility
 * and keyboard navigation support.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { SidebarNavigationProps, NavigationItem } from './Sidebar.types';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

// Memoized Navigation Item Component
const NavigationItemComponent = memo<{
  readonly item: NavigationItem;
  readonly isActive: boolean;
  readonly onClick: (item: NavigationItem) => void;
  readonly isChild?: boolean;
}>(({ item, isActive, onClick, isChild = false }) => {
  const Icon = item.icon;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(item);
      }
    },
    [item, onClick],
  );

  const handleClick = useCallback(() => {
    onClick(item);
  }, [item, onClick]);

  return (
    <li role="none">
      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center space-x-3 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
          isChild ? 'px-3 py-2 text-sm' : 'px-3 py-2.5'
        } ${
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
export const SidebarNavigation = memo<SidebarNavigationProps>(
  ({ items, activePath, onItemClick, className = '' }) => {
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

    useEffect(() => {
      setOpenGroups((prev) => {
        const next = { ...prev };
        items.forEach((item) => {
          if (item.children && !(item.id in next)) {
            next[item.id] = true; // default open
          }
        });
        return next;
      });
    }, [items]);

    // Determine if a navigation item is active
    const isItemActive = useCallback(
      (path: string) => {
        if (path === '/' && activePath === '/') return true;
        return activePath.startsWith(path) && path !== '/';
      },
      [activePath],
    );

    // Handle navigation item click
    const handleItemClick = useCallback(
      (item: NavigationItem) => {
        onItemClick(item);
      },
      [onItemClick],
    );

    const toggleGroup = useCallback((id: string) => {
      setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
    }, []);

    const renderGroup = useCallback(
      (item: NavigationItem, isActive: boolean) => {
        const isOpen = openGroups[item.id] ?? true;
        const Icon = item.icon;
        return (
          <li key={item.id} role="none">
            <button
              onClick={() => toggleGroup(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
                isActive
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              }`}
              role="menuitem"
              aria-expanded={isOpen}
              aria-label={`${item.label} menu`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="font-medium flex-1 text-left">{item.label}</span>
              {isOpen ? (
                <ChevronUpIcon className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
            {isOpen && item.children && (
              <ul className="space-y-1 mt-1 ml-4 border-l border-gray-200 dark:border-gray-700 pl-2">
                {item.children.map((child) => (
                  <NavigationItemComponent
                    key={child.id}
                    item={child}
                    isActive={isItemActive(child.path)}
                    onClick={handleItemClick}
                    isChild
                  />
                ))}
              </ul>
            )}
          </li>
        );
      },
      [handleItemClick, isItemActive, openGroups, toggleGroup],
    );

    const renderedItems = useMemo(() => {
      return items.map((item) => {
        const hasChildren = Array.isArray(item.children) && item.children.length > 0;
        const active =
          hasChildren && item.children
            ? item.children.some((child) => isItemActive(child.path))
            : isItemActive(item.path);
        if (hasChildren) {
          return renderGroup(item, active);
        }
        return (
          <NavigationItemComponent
            key={item.id}
            item={item}
            isActive={active}
            onClick={handleItemClick}
          />
        );
      });
    }, [handleItemClick, isItemActive, items, renderGroup]);

    return (
      <nav role="navigation" aria-label="Main navigation" className={`flex-1 p-4 ${className}`}>
        <ul className="space-y-2" role="menubar" aria-label="Main navigation menu">
          {renderedItems}
        </ul>
      </nav>
    );
  },
);

SidebarNavigation.displayName = 'SidebarNavigation';

// Export with custom comparison for optimal re-rendering
export const SidebarNavigationWithComparison = memo(SidebarNavigation, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.items === nextProps.items &&
    prevProps.activePath === nextProps.activePath &&
    prevProps.onItemClick === nextProps.onItemClick &&
    prevProps.className === nextProps.className
  );
});

SidebarNavigationWithComparison.displayName = 'SidebarNavigationWithComparison';
