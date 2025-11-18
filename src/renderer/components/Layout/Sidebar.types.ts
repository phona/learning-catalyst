/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */




/**
 * Sidebar Component Types
 *
 * This file contains all TypeScript interfaces and types related to the Sidebar component
 * and its subcomponents, following enterprise-level TypeScript best practices.
 */

import React from 'react';
import type { Session } from '@/shared/types/session';

// ============================================================================
// Core Component Types
// ============================================================================

export interface SidebarProps {
  /** Whether the sidebar is open or collapsed */
  readonly open: boolean;
  /** Optional additional CSS classes */
  readonly className?: string;
  /** Optional custom configuration */
  readonly config?: Partial<SidebarConfig>;
}

export interface SidebarConfig {
  /** Maximum number of sessions to show initially */
  readonly maxInitialSessions: number;
  /** Whether to show session statistics */
  readonly showSessionStats: boolean;
  /** Whether infinite scroll is enabled */
  readonly enableInfiniteScroll: boolean;
  /** Auto-refresh interval in milliseconds (0 to disable) */
  readonly autoRefreshInterval: number;
  /** Threshold for infinite scroll trigger (0.0 to 1.0) */
  readonly scrollThreshold: number;
  /** Debounce delay for scroll detection in milliseconds */
  readonly scrollDebounceMs: number;
}

// ============================================================================
// Navigation Types
// ============================================================================

export type NavigationItemId = 'chat' | 'progress' | 'knowledge-map' | 'discovery' | 'settings';

export interface NavigationItem {
  readonly id: NavigationItemId;
  readonly label: string;
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly path: string;
  readonly description: string;
  readonly badge?: {
    readonly content: string;
    readonly variant: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  };
}

export interface SidebarNavigationProps {
  /** Array of navigation items to render */
  readonly items: readonly NavigationItem[];
  /** Currently active navigation path */
  readonly activePath: string;
  /** Callback when navigation item is clicked */
  readonly onItemClick: (item: NavigationItem) => void;
  /** Optional CSS classes */
  readonly className?: string;
}

// ============================================================================
// Session Management Types
// ============================================================================

export interface SessionEventDetail {
  readonly sessionId: string;
  readonly isNew?: boolean;
  readonly hasFirstMessage?: boolean;
  readonly title?: string;
}

export type SessionEventType =
  | 'sessionCreated'
  | 'sessionSaved'
  | 'sessionUpdated'
  | 'sessionTitleUpdated';

export type SessionEventMap = {
  readonly [K in SessionEventType]: CustomEvent<SessionEventDetail>;
};

export interface SessionEventHandlers {
  readonly onSessionCreated?: (event: SessionEventMap['sessionCreated']) => void;
  readonly onSessionSaved?: (event: SessionEventMap['sessionSaved']) => void;
  readonly onSessionUpdated?: (event: SessionEventMap['sessionUpdated']) => void;
  readonly onSessionTitleUpdated?: (event: SessionEventMap['sessionTitleUpdated']) => void;
}

// ============================================================================
// Session Item Types
// ============================================================================

export interface SessionItemProps {
  /** Session data to display */
  readonly session: Session;
  /** Whether this session is currently active */
  readonly isActive: boolean;
  /** Whether this session is newly created */
  readonly isNew: boolean;
  /** Callback when session item is clicked */
  readonly onClick: (session: Session) => void;
  /** Formatted time string for display */
  readonly timeAgo: string;
  /** Number of messages in the session */
  readonly messageCount: number;
  /** Optional ARIA label for accessibility */
  readonly 'aria-label'?: string;
  /** Optional additional CSS classes */
  readonly className?: string;
}

export interface SessionItemState {
  /** Whether the item is currently hovered */
  readonly isHovered: boolean;
  /** Whether the item is focused */
  readonly isFocused: boolean;
}

// ============================================================================
// Session List Types
// ============================================================================

export interface SessionListProps {
  /** Array of sessions to display */
  readonly sessions: readonly Session[];
  /** Set of newly created session IDs */
  readonly newSessionIds: ReadonlySet<string>;
  /** Currently active session ID */
  readonly activeSessionId?: string;
  /** Callback when session is opened */
  readonly onOpenSession: (session: Session) => void;
  /** Callback to refresh sessions */
  readonly onRefresh: () => void;
  /** Loading state */
  readonly loading: boolean;
  /** Error state */
  readonly error: string | null;
  /** Whether there are more sessions to load */
  readonly hasMore: boolean;
  /** Scroll reference for infinite scroll */
  readonly scrollRef: React.RefObject<HTMLDivElement>;
  /** Callback for infinite scroll trigger */
  readonly onNearBottom: (callback: () => void) => void;
  /** Optional custom empty state component */
  readonly emptyState?: React.ComponentType;
  /** Optional custom error component */
  readonly errorComponent?: React.ComponentType<{ error: string }>;
  /** Optional custom loading component */
  readonly loadingComponent?: React.ComponentType;
}

export interface SessionListState {
  /** Current filter query */
  readonly filterQuery: string;
  /** Current sort by field */
  readonly sortBy: 'updated_at' | 'created_at' | 'title';
  /** Current sort order */
  readonly sortOrder: 'asc' | 'desc';
}

// ============================================================================
// Event Handling Types
// ============================================================================

export type KeyboardEventHandler = (e: React.KeyboardEvent<Element>) => void;
export type MouseEventHandler = (e: React.MouseEvent<Element>) => void;

export interface EventHandlers {
  readonly onKeyDown: KeyboardEventHandler;
  readonly onClick: MouseEventHandler;
  readonly onFocus: (e: React.FocusEvent<Element>) => void;
  readonly onBlur: (e: React.FocusEvent<Element>) => void;
}

// ============================================================================
// Utility Types
// ============================================================================

export type OptionalPartial<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** Deep readonly utility type for immutable data structures */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/** Branded type for session IDs to prevent type confusion */
export type SessionId = string & { readonly __brand: 'SessionId' };

/** Branded type for navigation IDs to prevent type confusion */
export type NavigationItemIdBranded = string & { readonly __brand: 'NavigationItemId' };

// ============================================================================
// Type Guards and Validators
// ============================================================================

/** Type guard for session events */
export function isSessionEvent<T extends SessionEventType>(
  event: Event,
  type: T
): event is SessionEventMap[T] {
  return event.type === type && 'detail' in event;
}

/** Type guard for navigation items */
export function isValidNavigationItem(item: unknown): item is NavigationItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'id' in item &&
    'label' in item &&
    'path' in item &&
    'description' in item &&
    typeof (item as any).id === 'string' &&
    typeof (item as any).label === 'string' &&
    typeof (item as any).path === 'string' &&
    typeof (item as any).description === 'string'
  );
}

/** Type-safe session ID constructor */
export function createSessionId(id: string): SessionId {
  return id as SessionId;
}

/** Type-safe navigation ID constructor */
export function createNavigationItemId(id: string): NavigationItemIdBranded {
  return id as NavigationItemIdBranded;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_SIDEBAR_CONFIG: SidebarConfig = {
  maxInitialSessions: 10,
  showSessionStats: true,
  enableInfiniteScroll: true,
  autoRefreshInterval: 0,
  scrollThreshold: 0.8,
  scrollDebounceMs: 100,
} as const;

// ============================================================================
// Re-exports
// ============================================================================

export type { Session } from '@/shared/types/session';