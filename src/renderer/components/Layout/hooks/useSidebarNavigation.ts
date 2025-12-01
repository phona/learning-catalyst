/**
 * useSidebarNavigation Hook
 *
 * Custom hook for handling sidebar navigation state and logic with proper TypeScript typing.
 * Centralizes navigation-related functionality and provides consistent navigation behavior.
 */

import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChatBubbleBottomCenterTextIcon,
  AcademicCapIcon,
  MagnifyingGlassIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import { useAppStore } from '@/renderer/stores/useAppStore';
import type { NavigationItem, NavigationItemId } from '../Sidebar.types';

export interface UseSidebarNavigationOptions {
  /** Custom navigation items (optional, will use defaults if not provided) */
  readonly customItems?: readonly NavigationItem[];
  /** Custom base path for navigation (optional) */
  readonly basePath?: string;
}

export interface UseSidebarNavigationReturn {
  /** Array of navigation items to render */
  readonly navigationItems: readonly NavigationItem[];
  /** Current active path */
  readonly activePath: string;
  /** Function to check if a navigation item is active */
  readonly isActive: (path: string) => boolean;
  /** Navigation click handler */
  readonly handleNavigation: (item: NavigationItem) => void;
  /** Function to navigate to a specific path */
  readonly navigateTo: (path: string) => void;
  /** Current navigation view */
  readonly currentView: NavigationItemId | null;
}

// Default navigation items
const DEFAULT_NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    id: 'chat',
    label: 'Chat',
    path: '/',
    description: 'Start a conversation',
    icon: ChatBubbleBottomCenterTextIcon,
  },
  {
    id: 'progress',
    label: 'Knowledge',
    path: '/progress',
    description: 'Progress, concepts, and discovery',
    icon: AcademicCapIcon,
  },
  {
    id: 'discovery',
    label: 'Discovery',
    path: '/discovery',
    description: 'Parse concepts from local markdown files',
    icon: MagnifyingGlassIcon,
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    description: 'Configure the app',
    icon: CogIcon,
  },
] as const;

/**
 * Custom hook for handling sidebar navigation
 *
 * @param options Configuration options for navigation
 * @returns Object containing navigation state and handlers
 */
export const useSidebarNavigation = (
  options: UseSidebarNavigationOptions = {},
): UseSidebarNavigationReturn => {
  const { customItems, basePath = '' } = options;
  const location = useLocation();
  const navigate = useNavigate();
  const { setCurrentView } = useAppStore();

  // Get current view from location for now (can be enhanced later)
  const currentView: NavigationItemId | null = useMemo(() => {
    const path = location.pathname;
    if (path === '/' || path.startsWith('/chat')) return 'chat';
    if (path === '/progress') return 'progress';
    if (path === '/discovery') return 'discovery';
    if (path === '/settings') return 'settings';
    return null;
  }, [location.pathname]);

  // Memoized navigation items (custom items override defaults)
  const navigationItems = useMemo(() => {
    const items = customItems || DEFAULT_NAVIGATION_ITEMS;
    // Apply base path to all navigation items if provided
    if (basePath) {
      return items.map((item) => ({
        ...item,
        path: basePath + item.path,
      }));
    }
    return items;
  }, [customItems, basePath]);

  // Active path detection with proper typing
  const isActive = useCallback(
    (path: string): boolean => {
      const currentPath = location.pathname;
      if (path === '/' && currentPath === '/') return true;
      return currentPath.startsWith(path) && path !== '/';
    },
    [location.pathname],
  );

  // Current active path
  const activePath = useMemo(() => location.pathname, [location.pathname]);

  // Enhanced navigation handler with proper typing
  const handleNavigation = useCallback(
    (item: NavigationItem): void => {
      try {
        // Update global view state (allow discovery passthrough for now)
        setCurrentView(item.id as any);

        // Handle special navigation cases
        if (item.id === 'discovery') {
          // Special handling for discovery page (might have additional logic)
          navigate(item.path);
        } else {
          // Standard navigation
          navigate(item.path);
        }

        console.log(`[useSidebarNavigation] Navigated to ${item.id} (${item.path})`);
      } catch (error) {
        console.error('[useSidebarNavigation] Navigation failed:', error);
      }
    },
    [setCurrentView, navigate],
  );

  // Direct navigation function
  const navigateTo = useCallback(
    (path: string): void => {
      try {
        navigate(path);
        console.log(`[useSidebarNavigation] Navigated to path: ${path}`);
      } catch (error) {
        console.error('[useSidebarNavigation] Direct navigation failed:', error);
      }
    },
    [navigate],
  );

  return {
    navigationItems,
    activePath,
    isActive,
    handleNavigation,
    navigateTo,
    currentView,
  };
};
